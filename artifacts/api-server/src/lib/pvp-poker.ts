/**
 * PVP Poker 1x1 — soddalashtirilgan Texas Hold'em (heads-up, 2 pog'ona: PREFLOP va BOARD).
 * Har ikkalasiga 2 ta yopiq karta, keyin 5 ta umumiy karta bir vaqtda ochiladi (flop+turn+river),
 * ikkinchi tikish pog'onasidan so'ng ochiq kartalar bilan g'olib aniqlanadi.
 * Barcha qoidalar server tomonda tekshiriladi.
 */

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Card = { r: number; s: Suit }; // r: 2..14 (14=A)
export type Side = "A" | "B";

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Street = "preflop" | "board" | "showdown";

export type PokerState = {
  deck: Card[];
  hole: Record<Side, Card[]>;
  board: Card[];
  pot: number;
  stake: number;
  bet: Record<Side, number>; // shu pog'onada qo'ygan miqdor
  folded: Side | null;
  street: Street;
  turn: Side;
  dealer: Side; // kim birinchi harakat qiladi preflopda (SB)
  acted: Record<Side, boolean>;
  winner: Side | "draw" | null;
  at: number;
  log: string[];
};

const other = (s: Side): Side => (s === "A" ? "B" : "A");

export function newGame(stake: number): PokerState {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
  shuffle(deck);
  const hole: Record<Side, Card[]> = { A: [deck.shift()!, deck.shift()!], B: [deck.shift()!, deck.shift()!] };
  const dealer: Side = Math.random() < 0.5 ? "A" : "B";
  const sb = Math.floor(stake * 0.05);
  const bb = sb * 2;
  return {
    deck,
    hole,
    board: [],
    pot: sb + bb,
    stake,
    bet: { [dealer]: sb, [other(dealer)]: bb } as Record<Side, number>,
    folded: null,
    street: "preflop",
    turn: dealer,
    dealer,
    acted: { A: false, B: false },
    winner: null,
    at: Date.now(),
    log: [`Blindlar qo'yildi: ${sb}/${bb}`],
  };
}

export type MoveResult = { ok: true } | { ok: false; error: string };

function betsEqual(st: PokerState): boolean {
  return st.bet.A === st.bet.B;
}

function advance(st: PokerState) {
  if (st.folded || st.winner) return;
  const bothActed = st.acted.A && st.acted.B;
  if (bothActed && betsEqual(st)) {
    // pog'ona tugadi
    if (st.street === "preflop") {
      // flop+turn+river bir vaqtda ochiladi
      st.board = [st.deck.shift()!, st.deck.shift()!, st.deck.shift()!, st.deck.shift()!, st.deck.shift()!];
      st.street = "board";
      st.acted = { A: false, B: false };
      st.turn = other(st.dealer);
      st.log.push("Umumiy kartalar ochildi");
    } else {
      showdown(st);
    }
    return;
  }
  st.turn = other(st.turn);
}

function evalHand(hole: Card[], board: Card[]): number {
  const cards = [...hole, ...board];
  const combos: Card[][] = [];
  const idx = [0, 1, 2, 3, 4, 5, 6];
  const pick5 = (arr: number[], k: number, start: number, cur: number[]) => {
    if (cur.length === k) { combos.push(cur.map((i) => cards[i])); return; }
    for (let i = start; i < arr.length; i++) pick5(arr, k, i + 1, [...cur, arr[i]]);
  };
  pick5(idx, 5, 0, []);
  let best = -1;
  for (const c of combos) best = Math.max(best, scoreFive(c));
  return best;
}

function scoreFive(cards: Card[]): number {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a);
  const suits = cards.map((c) => c.s);
  const isFlush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let isStraight = false;
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { isStraight = true; straightHigh = uniq[0]; }
    else if (JSON.stringify(uniq) === JSON.stringify([14, 5, 4, 3, 2])) { isStraight = true; straightHigh = 5; }
  }
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => (b[1] - a[1]) || (b[0] - a[0]));

  const kickers = groups.map(([r]) => r);
  const enc = (cat: number, ks: number[]) =>
    cat * 1e10 + ks.reduce((acc, k, i) => acc + k * Math.pow(15, 4 - i), 0);

  if (isStraight && isFlush) return enc(8, [straightHigh]);
  if (groups[0][1] === 4) return enc(7, kickers);
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) return enc(6, kickers);
  if (isFlush) return enc(5, ranks);
  if (isStraight) return enc(4, [straightHigh]);
  if (groups[0][1] === 3) return enc(3, kickers);
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) return enc(2, kickers);
  if (groups[0][1] === 2) return enc(1, kickers);
  return enc(0, ranks);
}

function showdown(st: PokerState) {
  st.street = "showdown";
  const sa = evalHand(st.hole.A, st.board);
  const sb = evalHand(st.hole.B, st.board);
  if (sa === sb) st.winner = "draw";
  else st.winner = sa > sb ? "A" : "B";
  st.log.push(st.winner === "draw" ? "Durrang!" : `${st.winner} g'olib!`);
}

export function check(st: PokerState, side: Side): MoveResult {
  if (st.winner || st.folded) return { ok: false, error: "O'yin tugagan" };
  if (st.turn !== side) return { ok: false, error: "Sizning navbatingiz emas" };
  if (st.bet.A !== st.bet.B) return { ok: false, error: "Avval tenglashtiring (CALL)" };
  st.acted[side] = true;
  st.log.push(`${side}: CHECK`);
  st.at = Date.now();
  advance(st);
  return { ok: true };
}

export function call(st: PokerState, side: Side): MoveResult {
  if (st.winner || st.folded) return { ok: false, error: "O'yin tugagan" };
  if (st.turn !== side) return { ok: false, error: "Sizning navbatingiz emas" };
  const diff = st.bet[other(side)] - st.bet[side];
  if (diff <= 0) return { ok: false, error: "Tenglashtirish shart emas, CHECK bosing" };
  st.bet[side] += diff;
  st.pot += diff;
  st.acted[side] = true;
  st.log.push(`${side}: CALL ${diff}`);
  st.at = Date.now();
  advance(st);
  return { ok: true };
}

const RAISE_STEP_RATIO = 0.1;

export function raise(st: PokerState, side: Side): MoveResult {
  if (st.winner || st.folded) return { ok: false, error: "O'yin tugagan" };
  if (st.turn !== side) return { ok: false, error: "Sizning navbatingiz emas" };
  const step = Math.max(1, Math.floor(st.stake * RAISE_STEP_RATIO));
  const target = Math.max(st.bet.A, st.bet.B) + step;
  const diff = target - st.bet[side];
  st.bet[side] = target;
  st.pot += diff;
  st.acted[side] = true;
  st.acted[other(side)] = false;
  st.log.push(`${side}: RAISE ${step}`);
  st.at = Date.now();
  st.turn = other(side);
  return { ok: true };
}

export function fold(st: PokerState, side: Side): MoveResult {
  if (st.winner || st.folded) return { ok: false, error: "O'yin tugagan" };
  st.folded = side;
  st.winner = other(side);
  st.log.push(`${side}: FOLD`);
  st.at = Date.now();
  return { ok: true };
}

export function autoMove(st: PokerState) {
  if (st.winner || st.folded) return;
  if (st.bet.A !== st.bet.B) fold(st, st.turn);
  else check(st, st.turn);
}

export function viewFor(st: PokerState, side: Side) {
  const foe = other(side);
  const showFoe = st.street === "showdown" || !!st.winner;
  return {
    myHole: st.hole[side],
    foeHole: showFoe ? st.hole[foe] : [],
    board: st.board,
    pot: st.pot,
    myBet: st.bet[side],
    foeBet: st.bet[foe],
    street: st.street,
    myTurn: st.turn === side && !st.winner && !st.folded,
    winner: st.winner ? (st.winner === "draw" ? "draw" : st.winner === side ? "me" : "foe") : null,
    deadline: st.at + 30_000,
    log: st.log.slice(-6),
  };
}
