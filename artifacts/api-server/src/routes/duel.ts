import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable, transactionsTable } from "@workspace/db";
import { DUELS, DUEL_MAP, resolveRound, autoSubmission, type Submission } from "../lib/duel";

/**
 * DUEL API — 1x1 haqiqiy odamlar bilan o'ynaladigan barcha PVP o'yinlari.
 * Matchmaking, raundlar, o'yin ichidagi chat va emoji reaksiyalar.
 */

const STAKES = [5000, 10000, 25000, 50000, 100000];
const RAKE = 0.08;
const REVEAL_MS = 2800;

type P = { telegramId: string; name: string; side: 0 | 1; score: number };
type ChatMsg = { n: number; name: string; text: string; emoji: boolean; at: number };

type Room = {
  id: string;
  game: string;
  stake: number;
  players: P[];
  round: number;
  phase: "play" | "reveal" | "done";
  deadline: number;
  revealUntil: number;
  subs: (Submission | null)[];
  last: { scores: [number, number]; detail: string; reveal: unknown } | null;
  history: string[];
  chat: ChatMsg[];
  chatN: number;
  winner: 0 | 1 | -1 | null;
  createdAt: number;
  paid: boolean;
};

const rooms = new Map<string, Room>();
const byPlayer = new Map<string, string>();
/** `${game}:${stake}:${code}` → kutayotgan */
const queue = new Map<string, { telegramId: string; name: string; at: number }>();

const rid = () => Math.random().toString(36).slice(2, 9);

async function money(telegramId: string, amount: number, type: "win" | "loss" | "refund", game: string) {
  const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
  if (!p) return null;
  const credit = type !== "loss";
  const newBalance = credit ? p.balance + amount : p.balance - amount;
  await db.update(playersTable).set({
    balance: newBalance,
    totalWon: type === "win" ? p.totalWon + amount : p.totalWon,
    totalLost: type === "loss" ? p.totalLost + amount : p.totalLost,
    gamesPlayed: type === "loss" ? p.gamesPlayed + 1 : p.gamesPlayed,
    totalWagered: type === "loss" ? p.totalWagered + amount : p.totalWagered,
    updatedAt: new Date(),
  }).where(eq(playersTable.telegramId, telegramId));
  await db.insert(transactionsTable).values({
    playerId: p.id,
    type: type === "win" ? "win" : type === "refund" ? "win" : "loss",
    amount,
    game,
  });
  return newBalance;
}

async function payout(room: Room) {
  if (room.paid) return;
  room.paid = true;
  const prize = Math.floor(room.stake * 2 * (1 - RAKE));
  if (room.winner === -1 || room.winner === null) {
    for (const p of room.players) await money(p.telegramId, room.stake, "refund", `duel-${room.game}`).catch(() => {});
    return;
  }
  const w = room.players.find((p) => p.side === room.winner);
  if (w) await money(w.telegramId, prize, "win", `duel-${room.game}`).catch(() => {});
}

function cleanup() {
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (now - r.createdAt > 45 * 60 * 1000 || (r.phase === "done" && now - r.revealUntil > 120_000)) {
      for (const p of r.players) byPlayer.delete(p.telegramId);
      rooms.delete(id);
    }
  }
  for (const [k, q] of queue) if (now - q.at > 120_000) queue.delete(k);
}

/** Raund/o'yin holatini vaqtga qarab surish */
function tick(room: Room) {
  const def = DUEL_MAP.get(room.game)!;
  const now = Date.now();

  if (room.phase === "play" && now > room.deadline) {
    for (let i = 0; i < 2; i++) if (!room.subs[i]) room.subs[i] = autoSubmission(def);
  }
  if (room.phase === "play" && room.subs[0] && room.subs[1]) {
    const out = resolveRound(def, [room.subs[0]!, room.subs[1]!]);
    room.players[0]!.score += out.scores[0];
    room.players[1]!.score += out.scores[1];
    room.last = out;
    room.history.push(`${room.round + 1}-raund: ${out.scores[0]} : ${out.scores[1]} — ${out.detail}`);
    room.subs = [null, null];
    room.phase = "reveal";
    room.revealUntil = now + REVEAL_MS;
  }
  if (room.phase === "reveal" && now > room.revealUntil) {
    room.round += 1;
    const total = def.rounds + (room.round >= def.rounds ? 0 : 0);
    if (room.round >= total) {
      const [a, b] = [room.players[0]!.score, room.players[1]!.score];
      if (a === b && room.round < def.rounds + 3) {
        // sudden death — qo'shimcha raund
        room.phase = "play";
        room.deadline = now + def.timer;
        return;
      }
      room.winner = a === b ? -1 : a > b ? 0 : 1;
      room.phase = "done";
      room.revealUntil = now;
      void payout(room);
    } else {
      room.phase = "play";
      room.deadline = now + def.timer;
    }
  }
}

const router: IRouter = Router();

router.get("/duel/list", (_req, res) => {
  cleanup();
  const live = new Map<string, number>();
  for (const r of rooms.values()) if (r.phase !== "done") live.set(r.game, (live.get(r.game) ?? 0) + 2);
  for (const [k] of queue) {
    const g = k.split(":")[0]!;
    live.set(g, (live.get(g) ?? 0) + 1);
  }
  res.json({
    stakes: STAKES,
    online: [...live.values()].reduce((a, b) => a + b, 0),
    games: DUELS.map((d) => ({
      key: d.key, title: d.title, sub: d.sub, img: d.img, emoji: d.emoji,
      kind: d.kind, rounds: d.rounds, picks: d.picks ?? null, tiles: d.tiles ?? null,
      count: d.count ?? null, timer: d.timer, rule: d.rule, live: live.get(d.key) ?? 0,
    })),
  });
});

router.post("/duel/queue", async (req, res) => {
  try {
    cleanup();
    const telegramId = String(req.body?.telegramId ?? "").trim();
    const name = String(req.body?.name ?? "O'yinchi").slice(0, 24);
    const game = String(req.body?.game ?? "");
    const stake = Number(req.body?.stake ?? 0);
    const code = String(req.body?.code ?? "").trim().toUpperCase().slice(0, 8);
    const def = DUEL_MAP.get(game);
    if (!telegramId) return res.status(400).json({ error: "telegramId kerak" });
    if (!def) return res.status(400).json({ error: "O'yin topilmadi" });
    if (!STAKES.includes(stake)) return res.status(400).json({ error: "Noto'g'ri tikish" });

    const cur = byPlayer.get(telegramId);
    if (cur && rooms.get(cur) && rooms.get(cur)!.phase !== "done")
      return res.json({ status: "matched", roomId: cur });

    const [me] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
    if (!me) return res.status(404).json({ error: "O'yinchi topilmadi" });
    if (me.balance < stake) return res.status(400).json({ error: "Balans yetarli emas" });

    const key = `${game}:${stake}:${code}`;
    const waiting = queue.get(key);
    if (waiting && waiting.telegramId !== telegramId) {
      queue.delete(key);
      const [foe] = await db.select().from(playersTable).where(eq(playersTable.telegramId, waiting.telegramId));
      if (!foe || foe.balance < stake) {
        queue.set(key, { telegramId, name, at: Date.now() });
        return res.json({ status: "waiting" });
      }
      await money(waiting.telegramId, stake, "loss", `duel-${game}`);
      await money(telegramId, stake, "loss", `duel-${game}`);

      const id = rid();
      const room: Room = {
        id, game, stake,
        players: [
          { telegramId: waiting.telegramId, name: waiting.name, side: 0, score: 0 },
          { telegramId, name, side: 1, score: 0 },
        ],
        round: 0, phase: "play",
        deadline: Date.now() + def.timer + 2500,
        revealUntil: 0,
        subs: [null, null], last: null, history: [], chat: [], chatN: 0,
        winner: null, createdAt: Date.now(), paid: false,
      };
      rooms.set(id, room);
      byPlayer.set(waiting.telegramId, id);
      byPlayer.set(telegramId, id);
      return res.json({ status: "matched", roomId: id });
    }

    queue.set(key, { telegramId, name, at: Date.now() });
    return res.json({ status: "waiting", code: code || null });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

router.post("/duel/cancel", (req, res) => {
  const telegramId = String(req.body?.telegramId ?? "");
  for (const [k, q] of queue) if (q.telegramId === telegramId) queue.delete(k);
  res.json({ ok: true });
});

function ctx(req: any) {
  const telegramId = String(req.body?.telegramId ?? req.query?.telegramId ?? "");
  const roomId = String(req.body?.roomId ?? req.query?.roomId ?? "");
  const room = rooms.get(roomId);
  const me = room?.players.find((p) => p.telegramId === telegramId);
  return { telegramId, room, me };
}

router.get("/duel/state", (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) return res.status(404).json({ error: "Xona topilmadi" });
  tick(room);
  const def = DUEL_MAP.get(room.game)!;
  const foe = room.players.find((p) => p.side !== me.side)!;
  const mine = me.side;
  const since = Number(req.query.chatSince ?? 0) || 0;

  res.json({
    roomId: room.id,
    game: room.game,
    stake: room.stake,
    prize: Math.floor(room.stake * 2 * (1 - RAKE)),
    rounds: def.rounds,
    round: room.round,
    phase: room.phase,
    msLeft: Math.max(0, (room.phase === "play" ? room.deadline : room.revealUntil) - Date.now()),
    myScore: me.score,
    foeScore: foe.score,
    foeName: foe.name,
    submitted: !!room.subs[mine],
    foeSubmitted: !!room.subs[1 - mine],
    last: room.last
      ? { my: room.last.scores[mine], foe: room.last.scores[1 - mine], detail: room.last.detail, reveal: room.last.reveal, mySide: mine }
      : null,
    history: room.history.slice(-8),
    winner: room.phase === "done" ? (room.winner === -1 ? "draw" : room.winner === mine ? "me" : "foe") : null,
    chat: room.chat.filter((c) => c.n > since),
    chatLast: room.chatN,
  });
});

router.post("/duel/submit", (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) return res.status(404).json({ error: "Xona topilmadi" });
  tick(room);
  if (room.phase !== "play") return res.json({ ok: true });
  if (room.subs[me.side]) return res.json({ ok: true });
  const value = Number(req.body?.value ?? 0);
  const picks = Array.isArray(req.body?.picks) ? req.body.picks.map((n: any) => Number(n) || 0).slice(0, 8) : undefined;
  room.subs[me.side] = { value: Number.isFinite(value) ? value : 0, picks };
  tick(room);
  res.json({ ok: true });
});

router.post("/duel/chat", (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) return res.status(404).json({ error: "Xona topilmadi" });
  const text = String(req.body?.text ?? "").trim().slice(0, 160);
  if (!text) return res.status(400).json({ error: "Bo'sh" });
  room.chatN += 1;
  room.chat.push({ n: room.chatN, name: me.name, text, emoji: !!req.body?.emoji, at: Date.now() });
  if (room.chat.length > 60) room.chat.splice(0, room.chat.length - 60);
  res.json({ ok: true });
});

router.post("/duel/forfeit", async (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) return res.status(404).json({ error: "Xona topilmadi" });
  if (room.phase !== "done") {
    room.winner = (me.side === 0 ? 1 : 0) as 0 | 1;
    room.phase = "done";
    room.history.push("Raqib taslim bo'ldi");
    await payout(room);
  }
  res.json({ ok: true });
});

export default router;
