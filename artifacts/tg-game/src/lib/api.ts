import { recordRound } from "./round-log";
import { notify } from "./notify";

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
  const amount = Math.floor(Number(data.amount) || 0);
  const winAmount = data.won ? Math.max(0, Math.floor(Number(data.winAmount) || 0)) : 0;
  const body = { amount, game: data.game, won: data.won && winAmount > 0, winAmount };
  let res: Response;
  try {
    res = await fetch(`${BASE}/players/${telegramId}/bet`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    notify("Internet bilan aloqa yo'q — tikish qabul qilinmadi");
    throw e;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    notify(err.error || "Tikish qabul qilinmadi");
    throw new Error(err.error || "Bet failed");
  }
  // Natija faqat server qabul qilgandan keyin yoziladi (ovoz + tarix)
  recordRound({ game: body.game, bet: amount, won: body.won, winAmount });
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
