/**
 * PVP Blackjack 1x1 (21) dvigateli — ikki o'yinchi bir-biriga qarshi, "kazino" o'rniga
 * ikkalasi ham qarta oladi, kim 21ga yaqinroq va oshirmagan — g'olib bo'ladi.
 * Barcha qoidalar server tomonda tekshiriladi.
 */

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Card = { r: number; s: Suit }; // r: 1..13 (1=A, 11=J,12=Q,13=K)
export type Side = "A" | "B";

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardValue(r: number): number {
  if (r === 1) return 11; // Ace boshida 11
  if (r >= 10) return 10;
  return r;
}

export function handScore(hand: Card[]): number {
  let total = hand.reduce((s, c) => s + cardValue(c.r), 0);
  let aces = hand.filter((c) => c.r === 1).length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export type BjState = {
  deck: Card[];
  hands: Record<Side, Card[]>;
  standing: Record<Side, boolean>;
  busted: Record<Side, boolean>;
  turn: Side;
  winner: Side | "draw" | null;
  at: number;
  log: string[];
};

export function newGame(): BjState {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
  shuffle(deck);
  const hands: Record<Side, Card[]> = { A: [deck.shift()!, deck.shift()!], B: [deck.shift()!, deck.shift()!] };
  return {
    deck,
    hands,
    standing: { A: false, B: false },
    busted: { A: false, B: false },
    turn: "A",
    winner: null,
    at: Date.now(),
    log: [],
  };
}

const other = (s: Side): Side => (s === "A" ? "B" : "A");

function advanceTurn(st: BjState) {
  if (st.winner) return;
  let nxt = other(st.turn);
  // agar hammasi turgan/portlagan bo'lsa — natija
  const done = (s: Side) => st.standing[s] || st.busted[s];
  if (done("A") && done("B")) {
    finishRound(st);
    return;
  }
  if (done(nxt)) nxt = other(nxt);
  st.turn = nxt;
}

function finishRound(st: BjState) {
  const sa = st.busted.A ? -1 : handScore(st.hands.A);
  const sb = st.busted.B ? -1 : handScore(st.hands.B);
  if (sa === -1 && sb === -1) st.winner = "draw";
  else if (sa === -1) st.winner = "B";
  else if (sb === -1) st.winner = "A";
  else if (sa === sb) st.winner = "draw";
  else st.winner = sa > sb ? "A" : "B";
  st.log.push(`Natija: A=${sa < 0 ? "BUST" : sa}, B=${sb < 0 ? "BUST" : sb}`);
}

export type MoveResult = { ok: true } | { ok: false; error: string };

export function hit(st: BjState, side: Side): MoveResult {
  if (st.winner) return { ok: false, error: "O'yin tugagan" };
  if (st.turn !== side) return { ok: false, error: "Sizning navbatingiz emas" };
  if (st.standing[side] || st.busted[side]) return { ok: false, error: "Siz allaqachon to'xtagansiz" };
  if (!st.deck.length) return { ok: false, error: "Paluba tugadi" };
  const c = st.deck.shift()!;
  st.hands[side].push(c);
  st.log.push(`${side} qarta oldi: ${c.r}${c.s}`);
  const score = handScore(st.hands[side]);
  if (score > 21) {
    st.busted[side] = true;
    st.log.push(`${side} 21 dan oshdi`);
  }
  st.at = Date.now();
  advanceTurn(st);
  return { ok: true };
}

export function stand(st: BjState, side: Side): MoveResult {
  if (st.winner) return { ok: false, error: "O'yin tugagan" };
  if (st.turn !== side) return { ok: false, error: "Sizning navbatingiz emas" };
  if (st.standing[side] || st.busted[side]) return { ok: false, error: "Siz allaqachon to'xtagansiz" };
  st.standing[side] = true;
  st.log.push(`${side} to'xtadi`);
  st.at = Date.now();
  advanceTurn(st);
  return { ok: true };
}

export function autoMove(st: BjState) {
  if (st.winner) return;
  stand(st, st.turn);
}

export function viewFor(st: BjState, side: Side) {
  const foe = other(side);
  return {
    myHand: st.hands[side],
    myScore: handScore(st.hands[side]),
    foeHand: st.winner ? st.hands[foe] : st.hands[foe].slice(0, st.standing[foe] || st.busted[foe] ? undefined : 1),
    foeScore: st.winner ? handScore(st.hands[foe]) : undefined,
    foeCount: st.hands[foe].length,
    deckLeft: st.deck.length,
    myTurn: st.turn === side && !st.winner,
    iStand: st.standing[side],
    iBust: st.busted[side],
    foeStand: st.standing[foe],
    foeBust: st.busted[foe],
    winner: st.winner ? (st.winner === "draw" ? "draw" : st.winner === side ? "me" : "foe") : null,
    deadline: st.at + 30_000,
    log: st.log.slice(-6),
  };
}
