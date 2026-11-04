import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable, transactionsTable } from "@workspace/db";
import {
  ARENAS, ARENA_MAP, ARENA_MIN, ARENA_MAX, resolveArena, autoArena, arenaWinners, arenaPayouts,
  type ArenaSub,
} from "../lib/arena";
import { getLiveSettings } from "../lib/live-settings";

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

type AP = { telegramId: string; name: string; seat: number; score: number; left: boolean };
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
type Lobby = { players: { telegramId: string; name: string; at: number }[]; openedAt: number; starting: boolean };

const rooms = new Map<string, Room>();
const byPlayer = new Map<string, string>();
const lobbies = new Map<string, Lobby>();
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
    l.players = l.players.filter((p) => now - p.at < 20_000); // 20 s so'rov yubormagan — chiqib ketgan
    if (!l.players.length) lobbies.delete(k);
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
  const full = lobby.players.length >= ARENA_MAX;
  const timed = lobby.players.length >= ARENA_MIN && now - lobby.openedAt >= WAIT_MS;
  if (!full && !timed) return;
  lobby.starting = true;
  const [game, stakeS] = key.split(":");
  const stake = Number(stakeS);
  const def = ARENA_MAP.get(game!)!;
  const seats = lobby.players.slice(0, ARENA_MAX);
  lobby.players = lobby.players.slice(ARENA_MAX);
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
      players: ok.map((s, i) => ({ telegramId: s.telegramId, name: s.name, seat: i, score: 0, left: false })),
      round: 0, phase: "intro", deadline: Date.now() + START_DELAY_MS, revealUntil: 0,
      subs: ok.map(() => null), last: null, history: [], chat: [], chatN: 0,
      winners: null, payouts: null, refund: false, createdAt: Date.now(), paid: false,
    };
    void def;
    rooms.set(id, room);
    for (const s of ok) byPlayer.set(s.telegramId, id);
  } finally {
    lobby.starting = false;
    lobby.openedAt = Date.now();
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
    // boshqa lobbilardan chiqaramiz — bir vaqtda bitta lobbi
    for (const [k, l] of lobbies) if (k !== key) l.players = l.players.filter((p) => p.telegramId !== telegramId);

    let lobby = lobbies.get(key);
    const inLobby = lobby?.players.find((p) => p.telegramId === telegramId);
    if (!inLobby) {
      const [me] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
      if (!me) { res.status(404).json({ error: "O'yinchi topilmadi" }); return; }
      if (me.balance < stake) { res.status(400).json({ error: "Balans yetarli emas" }); return; }
      if (!lobby) { lobby = { players: [], openedAt: Date.now(), starting: false }; lobbies.set(key, lobby); }
      lobby.players.push({ telegramId, name, at: Date.now() });
    } else inLobby.at = Date.now();

    await tryStart(key);
    const now2 = byPlayer.get(telegramId);
    if (now2 && rooms.get(now2)) { res.json({ status: "matched", roomId: now2 }); return; }
    const l = lobbies.get(key);
    const count = l?.players.length ?? 1;
    res.json({
      status: "waiting", count, max: ARENA_MAX, min: ARENA_MIN,
      names: (l?.players ?? []).map((p) => p.name),
      startsIn: count >= ARENA_MIN && l ? Math.max(0, WAIT_MS - (Date.now() - l.openedAt)) : null,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

router.post("/arena/cancel", (req, res) => {
  const telegramId = String(req.body?.telegramId ?? "");
  for (const l of lobbies.values()) l.players = l.players.filter((p) => p.telegramId !== telegramId);
  cleanup();
  res.json({ ok: true });
});

function ctx(req: any) {
  const telegramId = String(req.body?.telegramId ?? req.query?.telegramId ?? "");
  const roomId = String(req.body?.roomId ?? req.query?.roomId ?? "");
  const room = rooms.get(roomId);
  const me = room?.players.find((p) => p.telegramId === telegramId);
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
