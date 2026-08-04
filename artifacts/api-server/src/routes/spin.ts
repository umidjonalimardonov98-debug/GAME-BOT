import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import { isAdminTelegramId, ADMIN_INFINITE_BALANCE } from "../bot";

const router: IRouter = Router();

/** 10 tadan 8 tasi yutqazish */
const FREE_PRIZES  = [0, 0, 0, 0, 0, 0, 0, 0, 1000, 5000];
const PAID_PRIZES  = [0, 0, 0, 0, 0, 0, 0, 0, 2000, 5000];
/** Tekin aylantirishda yutqazsa ham shu miqdor balansdan yechiladi (pul bo'lsa) */
const FREE_LOSS = 2000;

const SYMBOL_MAP: Record<number, string> = {
  5000: "💎", 3000: "⭐", 2000: "⭐", 1000: "🌟", 500: "🍒",
};

router.get("/spin/status/:telegramId", async (req, res): Promise<void> => {
  const [player] = await db.select().from(playersTable)
    .where(eq(playersTable.telegramId, req.params.telegramId));
  if (!player) { res.status(404).json({ error: "not_found" }); return; }

  const canSpin = !player.lastSpinAt
    || Date.now() - new Date(player.lastSpinAt).getTime() >= 24 * 60 * 60 * 1000;
  const nextSpinAt = player.lastSpinAt && !canSpin
    ? new Date(new Date(player.lastSpinAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  res.json({ canSpin, nextSpinAt, balance: player.balance });
});

router.post("/spin", async (req, res): Promise<void> => {
  const { telegramId, paid } = req.body;
  if (!telegramId) { res.status(400).json({ error: "missing_id" }); return; }

  const [player] = await db.select().from(playersTable)
    .where(eq(playersTable.telegramId, String(telegramId)));
  if (!player) { res.status(404).json({ error: "not_found" }); return; }

  const now = new Date();

  if (!paid) {
    // FREE spin — check 24h cooldown
    if (player.lastSpinAt) {
      const diffMs = Date.now() - new Date(player.lastSpinAt).getTime();
      if (diffMs < 24 * 60 * 60 * 1000) {
        const nextSpinAt = new Date(
          new Date(player.lastSpinAt).getTime() + 24 * 60 * 60 * 1000
        ).toISOString();
        res.status(429).json({ error: "cooldown", nextSpinAt });
        return;
      }
    }
    const prize = FREE_PRIZES[Math.floor(Math.random() * FREE_PRIZES.length)];
    const symbol = prize > 0 ? (SYMBOL_MAP[prize] ?? "🍒") : "💣";
    const nextSpinAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    // yutqazsa — balansda puli bo'lsa, minus tushadi
    const isAdm = isAdminTelegramId(player.telegramId);
    const penalty = !isAdm && prize === 0 && player.balance >= FREE_LOSS ? FREE_LOSS : 0;

    await db.update(playersTable).set({
      lastSpinAt: now,
      balance: isAdm ? ADMIN_INFINITE_BALANCE : player.balance + prize - penalty,
      totalWon: prize > 0 ? player.totalWon + prize : player.totalWon,
      totalWagered: penalty > 0 ? player.totalWagered + penalty : player.totalWagered,
      gamesPlayed: player.gamesPlayed + 1,
      updatedAt: now,
    }).where(eq(playersTable.telegramId, String(telegramId)));

    res.json({ prize, symbol, penalty, net: prize - penalty, nextSpinAt });
    return;
  }

  // PAID spin — cost 2000 UZS, no cooldown
  const COST = 2000;
  const isAdmPaid = isAdminTelegramId(player.telegramId);
  if (!isAdmPaid && player.balance < COST) {
    res.status(400).json({ error: "insufficient_balance" });
    return;
  }

  const prize = PAID_PRIZES[Math.floor(Math.random() * PAID_PRIZES.length)];
  const symbol = prize > 0 ? (SYMBOL_MAP[prize] ?? "🍒") : "💣";
  const net = prize - COST;

  await db.update(playersTable).set({
    balance: isAdmPaid ? ADMIN_INFINITE_BALANCE : player.balance - COST + prize,
    totalWon: prize > 0 ? player.totalWon + prize : player.totalWon,
    totalWagered: player.totalWagered + COST,
    gamesPlayed: player.gamesPlayed + 1,
    updatedAt: now,
  }).where(eq(playersTable.telegramId, String(telegramId)));

  res.json({ prize, symbol, net, penalty: prize > 0 ? 0 : COST, nextSpinAt: null });
});

export default router;
