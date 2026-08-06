import { recordRound } from "./round-log";

const BASE = "/api";

export async function syncPlayer(data: {
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
}) {
  const res = await fetch(`${BASE}/players/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Sync failed");
  return res.json();
}

export async function getPlayer(telegramId: string) {
  const res = await fetch(`${BASE}/players/${telegramId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createDepositRequest(telegramId: string, amount: number) {
  const res = await fetch(`${BASE}/players/${telegramId}/deposit-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Deposit request failed");
  return res.json();
}

export async function deposit(telegramId: string, amount: number) {
  const res = await fetch(`${BASE}/players/${telegramId}/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error("Deposit failed");
  return res.json();
}

export async function withdraw(telegramId: string, amount: number, cardNumber: string, cardHolder: string) {
  const res = await fetch(`${BASE}/players/${telegramId}/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, cardNumber, cardHolder }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Withdraw failed");
  }
  return res.json();
}

export async function placeBet(telegramId: string, data: {
  amount: number;
  game: string;
  won: boolean;
  winAmount: number;
}) {
  // Har bir raund natijasini shaffof ko'rsatish + ovoz effekti uchun yozib qo'yamiz
  recordRound({ game: data.game, bet: data.amount, won: data.won, winAmount: data.winAmount });
  const res = await fetch(`${BASE}/players/${telegramId}/bet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Bet failed");
  }
  return res.json();
}

export async function getTransactions(telegramId: string) {
  const res = await fetch(`${BASE}/players/${telegramId}/transactions`);
  if (!res.ok) return [];
  return res.json();
}

export async function getPlayerHistory(telegramId: string) {
  const res = await fetch(`${BASE}/players/${telegramId}/history`);
  if (!res.ok) throw new Error("History failed");
  return res.json();
}

export async function getGameConfig() {
  const res = await fetch(`${BASE}/game/config`);
  if (!res.ok) return null;
  return res.json();
}

export async function getLeaderboard() {
  const res = await fetch(`${BASE}/game/leaderboard`);
  if (!res.ok) return [];
  return res.json();
}

export async function getGameStats() {
  const res = await fetch(`${BASE}/game/stats`);
  if (!res.ok) return null;
  return res.json();
}

// ─── SPORT (OpticOdds) ───────────────────────────────────────────────
export type SportOdd = {
  market: string;
  marketId: string;
  name: string;
  points: number | null;
  line: string | null;
  isMain: boolean;
  price: number;
};

export type SportFixture = {
  id: string;
  startDate: string;
  status: string;
  isLive: boolean;
  sport: string;
  league: string;
  label: string;
  home: { name: string; logo: string | null };
  away: { name: string; logo: string | null };
  odds: SportOdd[];
};

async function sportJson(path: string) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || data?.error || "Sport xatosi");
  return data;
}

export function getSportCatalog(): Promise<{ sports: { id: string; name: string }[]; leagues: { id: string; name: string; sport: string }[] }> {
  return sportJson("/sports/catalog");
}

export function getSportFixtures(p: { sport?: string; league?: string; live?: boolean }): Promise<{ fixtures: SportFixture[] }> {
  const q = new URLSearchParams();
  if (p.sport) q.set("sport", p.sport);
  if (p.league) q.set("league", p.league);
  if (p.live) q.set("live", "true");
  return sportJson(`/sports/fixtures?${q.toString()}`);
}

export function getSportFixture(id: string): Promise<{ fixture: SportFixture; markets: { market: string; selections: SportOdd[] }[] }> {
  return sportJson(`/sports/fixture/${id}`);
}

export async function placeSportBet(telegramId: string, stake: number, selections: unknown[]) {
  const res = await fetch(`${BASE}/sports/bet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ telegramId, stake, selections }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || data?.message || "Tikish amalga oshmadi");
  return data;
}

export function getSportBets(telegramId: string): Promise<{ bets: any[] }> {
  return sportJson(`/sports/bets/${telegramId}`);
}

// ─── SPORT STATISTIKA (OpticOdds Statistics API) ─────────────────────
export type StatLabel = { uz: string; ru: string; en: string };
export type TeamStatRow = {
  key: string;
  label: StatLabel;
  home: number;
  away: number;
  homePct: number;
  suffix: string;
};
export type MatchEvent = {
  type: string;
  period: string | null;
  clock: string | null;
  team: "home" | "away" | null;
  player: string | null;
  secondary: string | null;
};
export type PlayerStat = {
  id: string | null;
  name: string;
  position: string | null;
  number: number | null;
  team: "home" | "away";
  teamName: string | null;
  isStarter: boolean;
  minutes: number;
  rating: number;
  stats: { key: string; label: StatLabel; value: number }[];
};
export type MatchStats = {
  fixture: {
    id: string;
    status: string | null;
    startDate: string | null;
    venue: string | null;
    venueLocation: string | null;
    league: string | null;
    sport: string | null;
    isLive: boolean;
    home: string;
    away: string;
  };
  scores: { home: number; away: number; periods: { home: Record<string, number>; away: Record<string, number> } };
  periodsAvailable: string[];
  period: string;
  hasStats: boolean;
  teamStats: TeamStatRow[];
  marketStats: { home: Record<string, number>; away: Record<string, number> };
  events: MatchEvent[];
  players: PlayerStat[];
};

export function getSportStats(id: string, period = "all"): Promise<MatchStats> {
  return sportJson(`/sports/stats/${id}?period=${encodeURIComponent(period)}`);
}
