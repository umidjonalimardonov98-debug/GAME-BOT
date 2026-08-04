import { sfx } from "./sound";

export type Round = {
  id: number;
  game: string;
  bet: number;
  won: boolean;
  winAmount: number;
  mult: number;
  net: number;
  at: number;
};

const GAME_LABEL: Record<string, string> = {
  dice: "🎲 Dice", mines: "💣 Mines", aviator: "✈️ Aviator", slots: "🎰 Slots",
  roulette: "🎡 Roulette", blackjack: "🃏 Blackjack", apple: "🍎 Apple",
  parity: "🔢 Parity", spin: "🎯 Spin",
};

export function gameLabel(g: string) { return GAME_LABEL[g] ?? g; }

let seq = 0;
let rounds: Round[] = [];
const listeners = new Set<(r: Round[]) => void>();

export function subscribeRounds(l: (r: Round[]) => void) {
  listeners.add(l);
  l(rounds);
  return () => { listeners.delete(l); };
}

export function recordRound(data: { game: string; bet: number; won: boolean; winAmount: number }) {
  const bet = Math.max(0, Number(data.bet) || 0);
  const winAmount = Math.max(0, Number(data.winAmount) || 0);
  const round: Round = {
    id: ++seq,
    game: data.game,
    bet,
    won: !!data.won && winAmount > 0,
    winAmount,
    mult: bet > 0 ? winAmount / bet : 0,
    net: winAmount - bet,
    at: Date.now(),
  };
  rounds = [round, ...rounds].slice(0, 20);
  listeners.forEach((l) => l(rounds));
  if (round.won) sfx.win(round.mult >= 5);
  else sfx.lose();
  return round;
}

export function clearRounds() {
  rounds = [];
  listeners.forEach((l) => l(rounds));
}
