import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, playersTable, gameSettingsTable, appSettingsTable } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_GAMES = ["apple", "dice", "aviator", "spin", "blackjack", "slots", "parity", "mines", "roulette"];

router.get("/game/config", async (_req, res): Promise<void> => {
  const [games, appSettings] = await Promise.all([db.select().from(gameSettingsTable), db.select().from(appSettingsTable)]);
  const byGame: Record<string, { enabled: boolean; winChance: number; backgroundUrl: string | null }> = Object.fromEntries(
    games.map(g => [g.game, { enabled: g.enabled, winChance: g.winChance, backgroundUrl: g.backgroundUrl }]),
  );
  for (const game of DEFAULT_GAMES) if (!byGame[game]) byGame[game] = { enabled: true, winChance: 31, backgroundUrl: null };
  res.json({ games: byGame, theme: Object.fromEntries(appSettings.map(s => [s.key, s.value])) });
});

router.get("/game/leaderboard", async (_req, res): Promise<void> => {
  const [topDepositors, topWithdrawers] = await Promise.all([
    db.select().from(playersTable).orderBy(desc(playersTable.totalDeposited)).limit(10),
    db.select().from(playersTable).orderBy(desc(playersTable.totalWithdrawn)).limit(10),
  ]);

  const fmt = (p: typeof playersTable.$inferSelect, i: number, field: "totalDeposited" | "totalWithdrawn") => ({
    rank: i + 1,
    firstName: p.firstName,
    username: p.username,
    amount: p[field],
    gamesPlayed: p.gamesPlayed,
  });

  res.json({
    topDepositors: topDepositors.map((p, i) => fmt(p, i, "totalDeposited")),
    topWithdrawers: topWithdrawers.map((p, i) => fmt(p, i, "totalWithdrawn")),
  });
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
