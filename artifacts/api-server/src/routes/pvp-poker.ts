import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable, transactionsTable } from "@workspace/db";
import { newGame, check, call, raise, fold, autoMove, viewFor, type PokerState, type Side } from "../lib/pvp-poker";

/**
 * PVP — Poker 1x1 (Texas Hold'em heads-up, soddalashtirilgan 2 pog'ona).
 */

const STAKES = [5000, 10000, 25000, 50000, 100000];
const RAKE = 0.08;

type Player = { telegramId: string; name: string; side: Side };

type Room = {
  id: string;
  stake: number;
  players: Player[];
  st: PokerState;
  createdAt: number;
  finished: boolean;
  seen: Record<string, number>;
};

const rooms = new Map<string, Room>();
const queue = new Map<number, { telegramId: string; name: string; at: number }>();
const byPlayer = new Map<string, string>();

const rid = () => Math.random().toString(36).slice(2, 9);

async function charge(telegramId: string, amount: number, type: "loss" | "win", game: string) {
  const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
  if (!p) return null;
  const win = type === "win";
  const newBalance = win ? p.balance + amount : p.balance - amount;
  await db.update(playersTable).set({
    balance: newBalance,
    totalWon: win ? p.totalWon + amount : p.totalWon,
    totalLost: win ? p.totalLost : p.totalLost + amount,
    gamesPlayed: win ? p.gamesPlayed : p.gamesPlayed + 1,
    totalWagered: win ? p.totalWagered : p.totalWagered + amount,
    updatedAt: new Date(),
  }).where(eq(playersTable.telegramId, telegramId));
  await db.insert(transactionsTable).values({ playerId: p.id, type: win ? "win" : "loss", amount, game });
  return newBalance;
}

/** Umumiy pul allaqachon `pot` ichiga tikish paytida yechilgan, endi faqat g'olibga to'lov qilamiz */
async function finish(room: Room) {
  if (room.finished) return;
  room.finished = true;
  const w = room.st.winner;
  if (!w) return;
  const potAfterRake = Math.floor(room.st.pot * (1 - RAKE));
  if (w === "draw") {
    const half = Math.floor(potAfterRake / 2);
    for (const p of room.players) await charge(p.telegramId, half, "win", "pvp-poker").catch(() => {});
    return;
  }
  const winner = room.players.find((p) => p.side === w);
  if (!winner) return;
  await charge(winner.telegramId, potAfterRake, "win", "pvp-poker").catch(() => {});
}

function cleanup() {
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (now - r.createdAt > 60 * 60 * 1000 || (r.finished && now - r.st.at > 60_000)) {
      for (const p of r.players) byPlayer.delete(p.telegramId);
      rooms.delete(id);
    }
  }
  for (const [s, q] of queue) if (now - q.at > 120_000) queue.delete(s);
}

const router: IRouter = Router();

router.get("/pvp-poker/config", (_req, res) => {
  cleanup();
  res.json({
    stakes: STAKES,
    online: rooms.size * 2 + queue.size,
    tables: [...rooms.values()].filter((r) => !r.finished).length,
  });
});

router.post("/pvp-poker/queue", async (req, res) => {
  try {
    cleanup();
    const telegramId = String(req.body?.telegramId ?? "").trim();
    const name = String(req.body?.name ?? "O'yinchi").slice(0, 24);
    const stake = Number(req.body?.stake ?? 0);
    if (!telegramId) return res.status(400).json({ error: "telegramId kerak" });
    if (!STAKES.includes(stake)) return res.status(400).json({ error: "Noto'g'ri tikish" });

    const existing = byPlayer.get(telegramId);
    if (existing && rooms.get(existing) && !rooms.get(existing)!.finished)
      return res.json({ status: "matched", roomId: existing });

    const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
    if (!p) return res.status(404).json({ error: "O'yinchi topilmadi" });
    if (p.balance < stake) return res.status(400).json({ error: "Balans yetarli emas" });

    const waiting = queue.get(stake);
    if (waiting && waiting.telegramId !== telegramId) {
      queue.delete(stake);
      const [o] = await db.select().from(playersTable).where(eq(playersTable.telegramId, waiting.telegramId));
      if (!o || o.balance < stake) {
        queue.set(stake, { telegramId, name, at: Date.now() });
        return res.json({ status: "waiting" });
      }
      await charge(waiting.telegramId, stake, "loss", "pvp-poker");
      await charge(telegramId, stake, "loss", "pvp-poker");

      const id = rid();
      const room: Room = {
        id,
        stake,
        players: [
          { telegramId: waiting.telegramId, name: waiting.name, side: "A" },
          { telegramId, name, side: "B" },
        ],
        st: newGame(stake),
        createdAt: Date.now(),
        finished: false,
        seen: {},
      };
      rooms.set(id, room);
      byPlayer.set(waiting.telegramId, id);
      byPlayer.set(telegramId, id);
      return res.json({ status: "matched", roomId: id });
    }

    queue.set(stake, { telegramId, name, at: Date.now() });
    return res.json({ status: "waiting" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

router.post("/pvp-poker/cancel", (req, res) => {
  const telegramId = String(req.body?.telegramId ?? "");
  for (const [s, q] of queue) if (q.telegramId === telegramId) queue.delete(s);
  res.json({ ok: true });
});

function ctx(req: any) {
  const telegramId = String(req.body?.telegramId ?? req.query?.telegramId ?? "");
  const roomId = String(req.body?.roomId ?? req.query?.roomId ?? "");
  const room = rooms.get(roomId);
  const me = room?.players.find((p) => p.telegramId === telegramId);
  return { telegramId, room, me };
}

router.get("/pvp-poker/state", async (req, res) => {
  const { room, me, telegramId } = ctx(req);
  if (!room || !me) return res.status(404).json({ error: "Xona topilmadi" });
  room.seen[telegramId] = Date.now();

  if (!room.st.winner && Date.now() - room.st.at > 30_000) autoMove(room.st);
  if (room.st.winner && !room.finished) await finish(room);

  const foe = room.players.find((p) => p.side !== me.side)!;
  return res.json({
    roomId: room.id,
    stake: room.stake,
    foeName: foe.name,
    ...viewFor(room.st, me.side),
  });
});

router.post("/pvp-poker/move", async (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) return res.status(404).json({ error: "Xona topilmadi" });
  if (room.st.winner) return res.json({ ok: true });

  const action = String(req.body?.action ?? "");
  let r: { ok: boolean; error?: string };
  if (action === "check") r = check(room.st, me.side);
  else if (action === "call") r = call(room.st, me.side);
  else if (action === "raise") r = raise(room.st, me.side);
  else if (action === "fold") r = fold(room.st, me.side);
  else r = { ok: false, error: "Noma'lum harakat" };

  if (!r.ok) return res.status(400).json({ error: (r as any).error });
  if (room.st.winner) await finish(room);
  return res.json({ ok: true });
});

router.post("/pvp-poker/forfeit", async (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) return res.status(404).json({ error: "Xona topilmadi" });
  if (!room.st.winner) {
    room.st.winner = me.side === "A" ? "B" : "A";
    room.st.log.push("Raqib taslim bo'ldi");
    await finish(room);
  }
  return res.json({ ok: true });
});

export default router;
