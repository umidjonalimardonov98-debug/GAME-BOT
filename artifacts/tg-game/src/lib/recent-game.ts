export interface HistoryGame { game: string | null; createdAt: string; }
export interface ReplayGame { key: string; path: string; }
/** Resolve only catalog destinations, never construct a URL from transaction data. */
export function mostRecentGame<T extends ReplayGame>(rows: HistoryGame[], catalog: T[], enabled: Record<string, boolean> = {}): T | null {
  const ordered = rows.filter(row => Number.isFinite(Date.parse(row.createdAt))).slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  for (const row of ordered) {
    const game = catalog.find(item => item.key === row.game);
    if (game && enabled[game.key] !== false) return game;
  }
  return null;
}
