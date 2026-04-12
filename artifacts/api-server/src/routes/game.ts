import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/game/leaderboard", async (_req, res): Promise<void> => {
  const players = await db.select().from(playersTable)
    .orderBy(desc(playersTable.totalWon))
    .limit(50);

  const result = players.map((p, i) => ({
    rank: i + 1,
    telegramId: p.telegramId,
    username: p.username,
    firstName: p.firstName,
    balance: p.balance,
    gamesPlayed: p.gamesPlayed,
    totalWon: p.totalWon,
  }));

  res.json(result);
});

router.get("/game/stats", async (_req, res): Promise<void> => {
  const [stats] = await db.select({
    totalPlayers: sql<number>`count(*)::int`,
    totalGamesPlayed: sql<number>`sum(games_played)::int`,
    biggestWin: sql<number>`max(total_won)::int`,
  }).from(playersTable);

  const [top] = await db.select().from(playersTable)
    .orderBy(desc(playersTable.totalWon))
    .limit(1);

  res.json({
    totalPlayers: stats?.totalPlayers ?? 0,
    totalGamesPlayed: stats?.totalGamesPlayed ?? 0,
    biggestWin: stats?.biggestWin ?? 0,
    topPlayer: top?.firstName ?? null,
  });
});

export default router;
