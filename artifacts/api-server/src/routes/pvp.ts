import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable, transactionsTable } from "@workspace/db";
import {
  newGame, attack, defend, take, pass, autoMove, viewFor, isFinished,
  type DurakState, type Card,
} from "../lib/durak";

/**
 * LIVE PVP DURAK — ochiq stollar lobbisi.
 * O'yinchi 2, 3 yoki 4 kishilik stol yaratadi yoki mavjud stolga qo'shiladi.
 * Stol to'lganda tikish yechiladi va o'yin boshlanadi. Barcha qoidalar serverda.
 */

const STAKES = [5000, 10000, 25000, 50000, 100000];
const RAKE = 0.08;

type Seat = { telegramId: string; name: string; photo: string | null; seat: number };

type Room = {
  id: string;
  stake: number;
  max: number;
  host: string;
  players: Seat[];
  st: DurakState | null;
  createdAt: number;
  finished: boolean;
  seen: Record<string, number>;
};

const rooms = new Map<string, Room>();
const byPlayer = new Map<string, string>();

const rid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

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

const potFor = (r: Room) => Math.floor(r.stake * r.players.length * (1 - RAKE));

async function finish(room: Room) {
  if (room.finished || !room.st || !isFinished(room.st)) return;
  room.finished = true;
  const w = room.st.winner;
  if (w === null || w === undefined) return;
  const winner = room.players.find((p) => p.seat === w);
  if (!winner) return;
  await charge(winner.telegramId, potFor(room), "win", "pvp-durak").catch(() => {});
}

function cleanup() {
  const now = Date.now();
  for (const [id, r] of rooms) {
    const stale = !r.st && now - r.createdAt > 15 * 60 * 1000;
    const old = now - r.createdAt > 60 * 60 * 1000;
    const done = r.finished && r.st && now - r.st.at > 90_000;
    if (stale || old || done) {
      for (const p of r.players) byPlayer.delete(p.telegramId);
      rooms.delete(id);
    }
  }
}

function publicRoom(r: Room) {
  return {
    id: r.id,
    stake: r.stake,
    max: r.max,
    started: !!r.st,
    finished: r.finished,
    prize: Math.floor(r.stake * r.max * (1 - RAKE)),
    seats: Array.from({ length: r.max }, (_, i) => {
      const p = r.players[i];
      return p ? { name: p.name, photo: p.photo, id: p.telegramId } : null;
    }),
  };
}

const router: IRouter = Router();

router.get("/pvp/config", (_req, res) => {
  cleanup();
  const list = [...rooms.values()];
  res.json({
    stakes: STAKES,
    maxOptions: [2, 3, 4],
    online: list.reduce((n, r) => n + r.players.length, 0),
    tables: list.filter((r) => !r.finished).length,
    rake: RAKE,
  });
});

/** Ochiq stollar ro'yxati */
router.get("/pvp/rooms", (_req, res) => {
  cleanup();
  const list = [...rooms.values()]
    .filter((r) => !r.finished)
    .sort((a, b) => (a.st ? 1 : 0) - (b.st ? 1 : 0) || a.createdAt - b.createdAt)
    .map(publicRoom);
  res.json({ rooms: list, online: list.reduce((n, r) => n + r.seats.filter(Boolean).length, 0) });
});

function seatOf(req: any) {
  const telegramId = String(req.body?.telegramId ?? "").trim();
  const name = String(req.body?.name ?? "O'yinchi").slice(0, 24);
  const photo = req.body?.photo ? String(req.body.photo).slice(0, 300) : null;
  return { telegramId, name, photo };
}

/** Stol yaratish */
router.post("/pvp/create", async (req, res) => {
  try {
    cleanup();
    const { telegramId, name, photo } = seatOf(req);
    const stake = Number(req.body?.stake ?? 0);
    const max = Math.max(2, Math.min(4, Number(req.body?.max ?? 2)));
    if (!telegramId) return res.status(400).json({ error: "telegramId kerak" });
    if (!STAKES.includes(stake)) return res.status(400).json({ error: "Noto'g'ri tikish" });

    const cur = byPlayer.get(telegramId);
    const curRoom = cur ? rooms.get(cur) : undefined;
    if (curRoom && !curRoom.finished)
      return res.json({ roomId: curRoom.id, status: curRoom.st ? "playing" : "waiting" });

    const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
    if (!p) return res.status(404).json({ error: "O'yinchi topilmadi" });
    if (p.balance < stake) return res.status(400).json({ error: "Balans yetarli emas" });

    const id = rid();
    const room: Room = {
      id, stake, max, host: telegramId,
      players: [{ telegramId, name, photo, seat: 0 }],
      st: null, createdAt: Date.now(), finished: false, seen: {},
    };
    rooms.set(id, room);
    byPlayer.set(telegramId, id);
    return res.json({ roomId: id, status: "waiting" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

/** Stolga qo'shilish */
router.post("/pvp/join", async (req, res) => {
  try {
    cleanup();
    const { telegramId, name, photo } = seatOf(req);
    const roomId = String(req.body?.roomId ?? "");
    const room = rooms.get(roomId);
    if (!telegramId) return res.status(400).json({ error: "telegramId kerak" });
    if (!room || room.finished) return res.status(404).json({ error: "Stol topilmadi" });
    if (room.players.some((p) => p.telegramId === telegramId))
      return res.json({ roomId, status: room.st ? "playing" : "waiting" });
    if (room.st) return res.status(400).json({ error: "O'yin allaqachon boshlangan" });
    if (room.players.length >= room.max) return res.status(400).json({ error: "Stol to'lgan" });

    const [p] = await db.select().from(playersTable).where(eq(playersTable.telegramId, telegramId));
    if (!p) return res.status(404).json({ error: "O'yinchi topilmadi" });
    if (p.balance < room.stake) return res.status(400).json({ error: "Balans yetarli emas" });

    room.players.push({ telegramId, name, photo, seat: room.players.length });
    byPlayer.set(telegramId, room.id);

    if (room.players.length === room.max) {
      for (const s of room.players) await charge(s.telegramId, room.stake, "loss", "pvp-durak").catch(() => {});
      room.st = newGame(room.max);
    }
    return res.json({ roomId: room.id, status: room.st ? "playing" : "waiting" });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "Xatolik" });
  }
});

/** Boshlanmagan stoldan chiqish */
router.post("/pvp/leave", (req, res) => {
  const telegramId = String(req.body?.telegramId ?? "");
  const id = byPlayer.get(telegramId);
  const room = id ? rooms.get(id) : undefined;
  if (room && !room.st) {
    room.players = room.players.filter((p) => p.telegramId !== telegramId).map((p, i) => ({ ...p, seat: i }));
    byPlayer.delete(telegramId);
    if (!room.players.length) rooms.delete(room.id);
  }
  res.json({ ok: true });
});

function ctx(req: any) {
  const telegramId = String(req.body?.telegramId ?? req.query?.telegramId ?? "");
  const roomId = String(req.body?.roomId ?? req.query?.roomId ?? "");
  const room = rooms.get(roomId);
  const me = room?.players.find((p) => p.telegramId === telegramId);
  return { telegramId, room, me };
}

router.get("/pvp/state", async (req, res) => {
  const { room, me, telegramId } = ctx(req);
  if (!room || !me) return res.status(404).json({ error: "Stol topilmadi" });
  room.seen[telegramId] = Date.now();

  const base = {
    roomId: room.id,
    stake: room.stake,
    max: room.max,
    prize: Math.floor(room.stake * room.max * (1 - RAKE)),
    seats: publicRoom(room).seats,
    mySeat: me.seat,
  };

  if (!room.st) return res.json({ ...base, started: false });

  if (!isFinished(room.st) && Date.now() - room.st.at > 30_000) autoMove(room.st);
  if (isFinished(room.st)) await finish(room);

  return res.json({ ...base, started: true, ...viewFor(room.st, me.seat) });
});

router.post("/pvp/move", async (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me || !room.st) return res.status(404).json({ error: "Stol topilmadi" });
  if (isFinished(room.st)) return res.json({ ok: true });

  const action = String(req.body?.action ?? "");
  const card = req.body?.card as Card | undefined;
  const target = Number(req.body?.target ?? -1);
  let r: { ok: boolean; error?: string };

  if (action === "attack" && card) r = attack(room.st, me.seat, card);
  else if (action === "defend" && card) r = defend(room.st, me.seat, card, target);
  else if (action === "take") r = take(room.st, me.seat);
  else if (action === "pass") r = pass(room.st, me.seat);
  else r = { ok: false, error: "Noma'lum harakat" };

  if (!r.ok) return res.status(400).json({ error: (r as any).error });
  if (isFinished(room.st)) await finish(room);
  return res.json({ ok: true });
});

/** Taslim bo'lish */
router.post("/pvp/forfeit", async (req, res) => {
  const { room, me } = ctx(req);
  if (!room || !me) return res.status(404).json({ error: "Stol topilmadi" });
  if (room.st && !isFinished(room.st)) {
    room.st.loser = me.seat;
    if (room.st.winner === null) {
      const other = room.players.find((p) => p.seat !== me.seat);
      room.st.winner = other ? other.seat : me.seat;
    }
    room.st.log.push("O'yinchi taslim bo'ldi");
    await finish(room);
  }
  return res.json({ ok: true });
});

export default router;
