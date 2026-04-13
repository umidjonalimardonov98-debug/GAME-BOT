import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";

const router: IRouter = Router();

const PRIZES = [0, 0, 0, 0, 0, 500, 500, 1000, 2000, 5000];
const SYMBOLS = ["🍎", "🍋", "🍇", "🍒", "💎", "⭐", "🎰", "🍊", "🍉", "💰", "🔥", "🌟"];

router.get("/spin/status/:telegramId", async (req, res): Promise<void> => {
  const [player] = await db.select().from(playersTable).where(eq(playersTable.telegramId, req.params.telegramId));
  if (!player) { res.status(404).json({ error: "not_found" }); return; }

  const canSpin = !player.lastSpinAt || Date.now() - new Date(player.lastSpinAt).getTime() >= 24 * 60 * 60 * 1000;
  const nextSpinAt = player.lastSpinAt
    ? new Date(new Date(player.lastSpinAt).getTime() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  res.json({ canSpin, nextSpinAt, balance: player.balance });
});

router.post("/spin", async (req, res): Promise<void> => {
  const { telegramId } = req.body;
  if (!telegramId) { res.status(400).json({ error: "missing_id" }); return; }

  const [player] = await db.select().from(playersTable).where(eq(playersTable.telegramId, String(telegramId)));
  if (!player) { res.status(404).json({ error: "not_found" }); return; }

  if (player.lastSpinAt) {
    const diffMs = Date.now() - new Date(player.lastSpinAt).getTime();
    if (diffMs < 24 * 60 * 60 * 1000) {
      const nextSpinAt = new Date(new Date(player.lastSpinAt).getTime() + 24 * 60 * 60 * 1000).toISOString();
      res.status(429).json({ error: "cooldown", nextSpinAt });
      return;
    }
  }

  const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
  const stopSymbol = prize > 0
    ? (prize === 5000 ? "💎" : prize === 2000 ? "⭐" : prize === 1000 ? "🌟" : "🍒")
    : SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 4))];

  const now = new Date();
  await db.update(playersTable).set({
    lastSpinAt: now,
    balance: player.balance + prize,
    totalWon: prize > 0 ? player.totalWon + prize : player.totalWon,
    updatedAt: now,
  }).where(eq(playersTable.telegramId, String(telegramId)));

  const nextSpinAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  res.json({ prize, symbol: stopSymbol, nextSpinAt });
});

export default router;
