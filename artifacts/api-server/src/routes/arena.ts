import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable, transactionsTable } from "@workspace/db";
import {
  ARENAS, ARENA_MAP, ARENA_MIN, ARENA_MAX, resolveArena, autoArena, arenaWinners, arenaPayouts,
  type ArenaSub,
} from "../lib/arena";
import { getLiveSettings } from "../lib/live-settings";
import { ArenaMonitor, MONITOR_INTERVAL_MS, formatMonitor } from "../lib/arena-monitor";
import { logger } from "../lib/logger";
import { activePlayers, cleanLobby, GROUP_TTL_MS, type Lobby } from "../lib/arena-lobby";

/**
 * ARENA API — 2–4 kishilik LIVE o'yinlar.
 * Lobbi to'lsa (4) darhol, aks holda WAIT_MS dan keyin kamida 2 kishi bilan boshlanadi.
 * Tikim o'yin boshlanganda yechiladi; yutuq g'olib(lar)ga, tenglikda teng bo'linadi.
 */

const STAKES = [5000, 10000, 25000, 50000, 100000];
const RAKE = 0.08;
const REVEAL_MS = 3600;
const WAIT_MS = 30_000;
const START_DELAY_MS = 3000;
const STICKERS = new Set(["laugh", "fire", "clap", "angry", "cry", "win"]);

type AP = { telegramId: string; name: string; seat: number; score: number; left: boolean; lastSeenAt?: number };
type ChatMsg = { n: number; seat: number; name: string; text: string; sticker: boolean; at: number };
type Room = {
  id: string; game: string; stake: number; players: AP[];
  round: number; phase: "intro" | "play" | "reveal" | "done";
  deadline: number; revealUntil: number;
  subs: (ArenaSub | null)[];
  last: { scores: number[]; detail: string; reveal: Record<string, unknown> } | null;
  history: string[]; chat: ChatMsg[]; chatN: number;
  winners: number[] | null; payouts: number[] | null; refund: boolean;
  createdAt: number; paid: boolean;
};

const rooms = new Map<string, Room>();
const byPlayer = new Map<string, string>();
const lobbies = new Map<string, Lobby>();
const monitor = new ArenaMonitor();
let monitorTimer: ReturnType<typeof setInterval> | undefined;
export function getArenaMonitorStatus() { return formatMonitor(monitor.snapshot); }
export function startArenaMonitoring(send: (text: string) => Promise<void>) {
  if (monitorTimer) return;
  let running = false;
  let lastLog = 0;
  const check = async () => {
    if (running) return;
    running = true;
    const now = Date.now();
    try {
      // Inspect before cleanup so expired/stuck groups are not hidden.
      const snapshot = monitor.inspect(lobbies, rooms, now, ARENA_MIN, ARENA_MAX, WAIT_MS);
      cleanup();
      if (now - lastLog >= 60_000) {
        logger.info({ checkedAt: snapshot.checkedAt, ttlMs: snapshot.ttlMs, groups: snapshot.groups, rooms: snapshot.rooms, issues: snapshot.issues }, "LIVE monitor heartbeat");
        lastLog = now;
      }
      await monitor.notify(send, now);
    } catch {
      logger.error("LIVE monitor check or administrator delivery failed; retrying next interval");
    } finally { running = false; }
  };
  monitorTimer = setInterval(() => void check(), MONITOR_INTERVAL_MS);
  monitorTimer.unref?.();
  void check();
  logger.info({ intervalMs: MONITOR_INTERVAL_MS, ttlMs: GROUP_TTL_MS }, "LIVE monitoring started");
}
const rid = () => Math.random().toString(36).slice(2, 9);

let cfgEnabled = true;
let cfgTimerMs = 0;
async function syncCfg() {
  try { const s = await getLiveSettings(); cfgEnabled = s.enabled; cfgTimerMs = s.timerMs; } catch { /* standart */ }
}
void syncCfg();
setInterval(() => void syncCfg(), 10_000).unref?.();
const roundTimer = (def: { timer: number }) => (cfgTimerMs > 0 ? Math.max(cfgTimerMs, 8000) : def.timer);

async function money(telegramId: string, amount: number, type: "win" | "loss" | "refund", game: string) {
  const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
  if (!p) return null;
  const credit = type !== "loss";
  await db.update(playersTable).set({
    balance: credit ? p.balance + amount : p.balance - amount,
    totalWon: type === "win" ? p.totalWon + amount : p.totalWon,
    totalLost: type === "loss" ? p.totalLost + amount : p.totalLost,
    gamesPlayed: type === "loss" ? p.gamesPlayed + 1 : p.gamesPlayed,
    totalWagered: type === "loss" ? p.totalWagered + amount : p.totalWagered,
    updatedAt: new Date(),
  }).where(eq(playersTable.telegramId, telegramId));
  await db.insert(transactionsTable).values({ playerId: p.id, type: type === "loss" ? "loss" : "win", amount, game });
  return true;
}

async function payout(room: Room) {
  if (room.paid) return;
  room.paid = true;
  const scores = room.players.map((p) => p.score);
  const res = arenaPayouts(room.stake, room.players.length, scores, RAKE);
  room.refund = res.refund;
  room.payouts = res.amounts;
  room.winners = arenaWinners(scores);
  for (let i = 0; i < room.players.length; i++) {
    const amt = res.amounts[i]!;
    if (amt > 0) await money(room.players[i]!.telegramId, amt, res.refund ? "refund" : "win", `arena-${room.game}`).catch(() => {});
  }
}

function cleanup() {
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (now - r.createdAt > 45 * 60 * 1000 || (r.phase === "done" && now - r.revealUntil > 120_000)) {
      for (const p of r.players) if (byPlayer.get(p.telegramId) === id) byPlayer.delete(p.telegramId);
      rooms.delete(id);
    }
  }
  for (const [k, l] of lobbies) {
    if (cleanLobby(l, now, ARENA_MIN)) lobbies.delete(k);
  }
}

function finish(room: Room) {
  room.phase = "done";
  room.revealUntil = Date.now();
  void payout(room);
}

function tick(room: Room) {
  const def = ARENA_MAP.get(room.game)!;
  const now = Date.now();
  if (room.phase === "intro" && now > room.deadline) {
    room.phase = "play";
    room.deadline = now + roundTimer(def);
  }
  if (room.phase === "play") {
    room.players.forEach((p, i) => { if (p.left && !room.subs[i]) room.subs[i] = autoArena(def); });
    if (now > room.deadline) room.subs = room.subs.map((s) => s ?? autoArena(def));
    if (room.subs.every(Boolean)) {
      const out = resolveArena(def, room.subs as ArenaSub[]);
      out.scores.forEach((s, i) => { room.players[i]!.score += s; });
      room.last = out;
      room.history.push(`${room.round + 1}-raund: ${out.scores.join(" : ")} — ${out.detail}`);
      room.subs = room.players.map(() => null);
      room.phase = "reveal";
      room.revealUntil = now + REVEAL_MS;
    }
  }
  if (room.phase === "reveal" && now > room.revealUntil) {
    room.round += 1;
    const active = room.players.filter((p) => !p.left).length;
    if (room.round >= def.rounds || active <= 1) finish(room);
    else { room.phase = "play"; room.deadline = now + roundTimer(def); }
  }
}

/** Lobbini boshlashga urinish: 4 kishi — darhol; ≥2 kishi va WAIT_MS o'tgan — boshlash */
async function tryStart(key: string) {
  const lobby = lobbies.get(key);
  if (!lobby || lobby.starting) return;
  const now = Date.now();
  const active = activePlayers(lobby, now);
  const full = active.length >= ARENA_MAX;
  const timed = active.length >= ARENA_MIN && now - lobby.openedAt >= WAIT_MS;
  if (!full && !timed) return;
  lobby.starting = true;
  const [game, stakeS] = key.split(":");
  const stake = Number(stakeS);
  const def = ARENA_MAP.get(game!)!;
  const seats = active.slice(0, ARENA_MAX);
  const selected = new Set(seats.map((p) => p.telegramId));
  lobby.players = lobby.players.filter((p) => !selected.has(p.telegramId));
  try {
    // balansni qayta tekshiramiz — yetmaganlar o'ynamaydi
    const ok: typeof seats = [];
    for (const s of seats) {
      const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, s.telegramId));
      if (p && p.balance >= stake && !byPlayer.has(s.telegramId)) ok.push(s);
    }
    if (ok.length < ARENA_MIN) { lobby.players = [...ok, ...lobby.players]; return; }
    for (const s of ok) await money(s.telegramId, stake, "loss", `arena-${game}`);
    const id = rid();
    const room: Room = {
      id, game: game!, stake,
      players: ok.map((s, i) => ({ telegramId: s.telegramId, name: s.name, seat: i, score: 0, left: false, lastSeenAt: s.at })),
      round: 0, phase: "intro", deadline: Date.now() + START_DELAY_MS, revealUntil: 0,
      subs: ok.map(() => null), last: null, history: [], chat: [], chatN: 0,
      winners: null, payouts: null, refund: false, createdAt: Date.now(), paid: false,
    };
    void def;
    rooms.set(id, room);
    for (const s of ok) byPlayer.set(s.telegramId, id);
  } finally {
    lobby.starting = false;
    lobby.openedAt = Date.now(); lobby.createdAt = Date.now();
    if (!lobby.players.length) lobbies.delete(key);
  }
}

const router: IRouter = Router();

router.get("/arena/list", (_req, res) => {
  cleanup();
  const live = new Map<string, number>();
  for (const r of rooms.values()) if (r.phase !== "done") live.set(r.game, (live.get(r.game) ?? 0) + r.players.length);
  for (const [k, l] of lobbies) { const g = k.split(":")[0]!; live.set(g, (live.get(g) ?? 0) + l.players.length); }
  res.json({
    stakes: STAKES, rake: RAKE, min: ARENA_MIN, max: ARENA_MAX, waitMs: WAIT_MS,
    online: [...live.values()].reduce((a, b) => a + b, 0),
    games: ARENAS.map((d) => ({ ...d, live: live.get(d.key) ?? 0 })),
  });
});

/** O'yin ostida ko'rinadigan ochiq guruhlar */
router.get("/arena/rooms", (req, res) => {
  cleanup();
  const game = String(req.query.game ?? "");
  const now = Date.now();
  const groups = [...lobbies.entries()]
    .filter(([k, l]) => k.split(":")[0] === game && !l.starting && l.players.length < ARENA_MAX)
    .map(([k, l]) => ({
      stake: Number(k.split(":")[1]), count: l.players.length, max: ARENA_MAX,
      names: l.players.map((p) => p.name),
      ownerOnline: activePlayers(l, now).some((p) => p.telegramId === l.ownerId),
      onlineCount: activePlayers(l, now).length,
      expiresIn: Math.max(0, GROUP_TTL_MS - (now - l.createdAt)),
      startsIn: activePlayers(l, now).length >= ARENA_MIN ? Math.max(0, WAIT_MS - (now - l.openedAt)) : null,
    }))
    .sort((a, b) => b.count - a.count || a.stake - b.stake);
  const playing = [...rooms.values()].filter((r) => r.game === game && r.phase !== "done")
    .map((r) => ({ stake: r.stake, names: r.players.map((p) => p.name), round: r.round + 1 }));
  res.json({ groups, playing, ttlMs: GROUP_TTL_MS });
});

router.post("/arena/queue", async (req, res) => {
  try {
    cleanup();
    const telegramId = String(req.body?.telegramId ?? "").trim();
    const name = String(req.body?.name ?? "O'yinchi").slice(0, 24);
    const game = String(req.body?.game ?? "");
    const stake = Number(req.body?.stake ?? 0);
    if (!telegramId) { res.status(400).json({ error: "telegramId kerak" }); return; }
    if (!ARENA_MAP.has(game)) { res.status(400).json({ error: "O'yin topilmadi" }); return; }
    if (!STAKES.includes(stake)) { res.status(400).json({ error: "Noto'g'ri tikish" }); return; }
    await syncCfg();
    if (!cfgEnabled) { res.status(503).json({ error: "LIVE o'yinlar vaqtincha o'chirilgan. Keyinroq urinib ko'ring." }); return; }

    const cur = byPlayer.get(telegramId);
    if (cur && rooms.get(cur) && rooms.get(cur)!.phase !== "done") { res.json({ status: "matched", roomId: cur }); return; }
    if (cur) byPlayer.delete(telegramId);

    const key = `${game}:${stake}`;
    if (req.body?.poll && !lobbies.get(key)?.players.some((p) => p.telegramId === telegramId)) {
      res.json({ status: "expired" }); return;
    }
    // boshqa lobbilardan chiqaramiz — bir vaqtda bitta lobbi
    for (const [k, l] of lobbies) if (k !== key) {
      l.players = l.players.filter((p) => p.telegramId !== telegramId);
      if (!l.players.length) lobbies.delete(k);
    }

    let lobby = lobbies.get(key);
    const inLobby = lobby?.players.find((p) => p.telegramId === telegramId);
    if (!inLobby) {
      const [me] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
      if (!me) { res.status(404).json({ error: "O'yinchi topilmadi" }); return; }
      if (me.balance < stake) { res.status(400).json({ error: "Balans yetarli emas" }); return; }
      if (!lobby) { lobby = { ownerId: telegramId, players: [], openedAt: Date.now(), createdAt: Date.now(), starting: false }; lobbies.set(key, lobby); }
      if (lobby.starting || lobby.players.length >= ARENA_MAX) { res.status(409).json({ error: "Guruh to'ldi. Boshqa guruhni tanlang." }); return; }
      const wasActive = activePlayers(lobby, Date.now()).length;
      lobby.players.push({ telegramId, name, at: Date.now() });
      // ikkinchi o'yinchi kelganda boshlanish taymeri shu paytdan hisoblanadi
      if (wasActive < ARENA_MIN && activePlayers(lobby, Date.now()).length >= ARENA_MIN) lobby.openedAt = Date.now();
    } else {
      const wasActive = lobby ? activePlayers(lobby, Date.now()).length : 0;
      inLobby.at = Date.now();
      if (lobby && wasActive < ARENA_MIN && activePlayers(lobby, Date.now()).length >= ARENA_MIN) lobby.openedAt = Date.now();
    }

    await tryStart(key);
    const now2 = byPlayer.get(telegramId);
    if (now2 && rooms.get(now2)) { res.json({ status: "matched", roomId: now2 }); return; }
    const l = lobbies.get(key);
    const count = l?.players.length ?? 1;
    res.json({
      status: "waiting", count, max: ARENA_MAX, min: ARENA_MIN,
      names: (l?.players ?? []).map((p) => p.name),
      expiresIn: l ? Math.max(0, GROUP_TTL_MS - (Date.now() - l.createdAt)) : null,
      startsIn: l && activePlayers(l, Date.now()).length >= ARENA_MIN ? Math.max(0, WAIT_MS - (Date.now() - l.openedAt)) : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

router.post("/arena/cancel", (req, res) => {
  const telegramId = String(req.body?.telegramId ?? "");
  for (const [key, l] of lobbies) {
    l.players = l.players.filter((p) => p.telegramId !== telegramId);
    if (!l.players.length) lobbies.delete(key);
  }
  cleanup();
  res.json({ ok: true });
});

function ctx(req: any) {
  const telegramId = String(req.body?.telegramId ?? req.query?.telegramId ?? "");
  const roomId = String(req.body?.roomId ?? req.query?.roomId ?? "");
  const room = rooms.get(roomId);
  const me = room?.players.find((p) => p.telegramId === telegramId);
  if (me) me.lastSeenAt = Date.now();
  return { room, me };
}

router.get("/arena/state", (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) { res.status(404).json({ error: "Xona topilmadi" }); return; }
  tick(room);
  const def = ARENA_MAP.get(room.game)!;
  const since = Number(req.query.chatSince ?? 0) || 0;
  const n = room.players.length;
  res.json({
    roomId: room.id, game: room.game, stake: room.stake, rake: RAKE,
    prize: Math.floor(room.stake * n * (1 - RAKE)),
    rounds: def.rounds, round: room.round, phase: room.phase,
    timer: roundTimer(def),
    msLeft: Math.max(0, (room.phase === "reveal" || room.phase === "done" ? room.revealUntil : room.deadline) - Date.now()),
    mySeat: me.seat,
    players: room.players.map((p, i) => ({ seat: p.seat, name: p.name, score: p.score, left: p.left, submitted: !!room.subs[i] })),
    last: room.last,
    history: room.history.slice(-8),
    winners: room.phase === "done" ? room.winners : null,
    payouts: room.phase === "done" ? room.payouts : null,
    refund: room.refund,
    chat: room.chat.filter((c) => c.n > since),
    chatLast: room.chatN,
  });
});

router.post("/arena/submit", (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) { res.status(404).json({ error: "Xona topilmadi" }); return; }
  tick(room);
  if (room.phase !== "play" || room.subs[me.seat]) { res.json({ ok: true }); return; }
  const value = Number(req.body?.value ?? 0);
  const picks = Array.isArray(req.body?.picks) ? req.body.picks.map((x: any) => Number(x) || 0).slice(0, 8) : undefined;
  room.subs[me.seat] = { value: Number.isFinite(value) ? value : 0, picks };
  tick(room);
  res.json({ ok: true });
});

router.post("/arena/chat", (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) { res.status(404).json({ error: "Xona topilmadi" }); return; }
  const sticker = !!req.body?.sticker;
  const text = String(req.body?.text ?? "").trim().slice(0, 140);
  if (!text || (sticker && !STICKERS.has(text))) { res.status(400).json({ error: "Noto'g'ri xabar" }); return; }
  room.chatN += 1;
  room.chat.push({ n: room.chatN, seat: me.seat, name: me.name, text, sticker, at: Date.now() });
  if (room.chat.length > 60) room.chat.splice(0, room.chat.length - 60);
  res.json({ ok: true });
});

/** O'yindan chiqish — qolgan raundlarda avtomatik eng past natija oladi */
router.post("/arena/leave", (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) { res.status(404).json({ error: "Xona topilmadi" }); return; }
  me.left = true;
  room.history.push(`${me.name} o'yindan chiqdi`);
  tick(room);
  res.json({ ok: true });
});

export default router;
