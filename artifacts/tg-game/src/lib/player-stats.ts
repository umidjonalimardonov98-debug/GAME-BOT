export interface StatRow { type: "win" | "loss"; amount: number; game: string | null; createdAt: string; }
export interface GameStat { key: string; rounds: number; wins: number; net: number; }
export interface StatsSummary { rounds: number; wins: number; losses: number; winRate: number; net: number; games: GameStat[]; }

export function computeStats(rows: StatRow[]): StatsSummary {
  const map = new Map<string, GameStat>();
  let wins = 0, losses = 0, net = 0;
  for (const r of rows) {
    if (r.type !== "win" && r.type !== "loss") continue;
    const amt = Number(r.amount) || 0;
    const isWin = r.type === "win";
    if (isWin) { wins++; net += amt; } else { losses++; net -= amt; }
    const key = r.game || "other";
    const g = map.get(key) ?? { key, rounds: 0, wins: 0, net: 0 };
    g.rounds++; if (isWin) g.wins++; g.net += isWin ? amt : -amt;
    map.set(key, g);
  }
  const rounds = wins + losses;
  const games = [...map.values()].sort((a, b) => b.rounds - a.rounds || b.wins - a.wins);
  return { rounds, wins, losses, winRate: rounds ? Math.round((wins / rounds) * 100) : 0, net, games };
}
