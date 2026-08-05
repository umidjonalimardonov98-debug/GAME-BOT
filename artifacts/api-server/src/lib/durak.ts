/**
 * Haqiqiy DURAK dvigateli — 36 karta (6..A), 6 talik qo'l, kozır (trump).
 * Ikki kishilik PVP uchun. Barcha qoidalar server tomonda tekshiriladi.
 */

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Card = { r: number; s: Suit };
export type Side = "A" | "B";

export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS = [6, 7, 8, 9, 10, 11, 12, 13, 14];

export const cardId = (c: Card) => `${c.r}${c.s}`;

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Pair = { a: Card; d?: Card };

export type DurakState = {
  deck: Card[];
  trump: Suit;
  trumpCard: Card | null;
  hands: Record<Side, Card[]>;
  table: Pair[];
  discard: number;
  attacker: Side;
  /** kim harakat qilishi kerak */
  turn: Side;
  /** hujumchi "bita" ni bosishi mumkinmi */
  canPass: boolean;
  winner: Side | null;
  /** oxirgi harakat vaqti (timeout uchun) */
  at: number;
  log: string[];
};

export function newGame(): DurakState {
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
  shuffle(deck);
  const trumpCard = deck[deck.length - 1];
  const trump = trumpCard.s;
  const hands: Record<Side, Card[]> = { A: [], B: [] };
  for (let i = 0; i < 6; i++) {
    hands.A.push(deck.shift()!);
    hands.B.push(deck.shift()!);
  }
  // eng kichik kozır kimda bo'lsa — birinchi hujum qiladi
  const low = (h: Card[]) => {
    const t = h.filter((c) => c.s === trump);
    return t.length ? Math.min(...t.map((c) => c.r)) : 99;
  };
  const attacker: Side = low(hands.A) <= low(hands.B) ? "A" : "B";
  return {
    deck,
    trump,
    trumpCard,
    hands,
    table: [],
    discard: 0,
    attacker,
    turn: attacker,
    canPass: false,
    winner: null,
    at: Date.now(),
    log: [],
  };
}

export const other = (s: Side): Side => (s === "A" ? "B" : "A");

/** d kartasi a kartasini yopa oladimi */
export function beats(d: Card, a: Card, trump: Suit): boolean {
  if (d.s === a.s) return d.r > a.r;
  return d.s === trump && a.s !== trump;
}

function tableRanks(st: DurakState): Set<number> {
  const set = new Set<number>();
  for (const p of st.table) {
    set.add(p.a.r);
    if (p.d) set.add(p.d.r);
  }
  return set;
}

function takeFromHand(st: DurakState, side: Side, c: Card): Card | null {
  const i = st.hands[side].findIndex((x) => x.r === c.r && x.s === c.s);
  if (i < 0) return null;
  return st.hands[side].splice(i, 1)[0];
}

function refill(st: DurakState) {
  const order: Side[] = [st.attacker, other(st.attacker)];
  for (const s of order) {
    while (st.hands[s].length < 6 && st.deck.length) st.hands[s].push(st.deck.shift()!);
  }
}

function checkEnd(st: DurakState) {
  if (st.deck.length) return;
  const aEmpty = st.hands.A.length === 0;
  const bEmpty = st.hands.B.length === 0;
  if (aEmpty && bEmpty) {
    st.winner = st.attacker; // durrang bo'lsa hujumchi foydasiga
  } else if (aEmpty) st.winner = "A";
  else if (bEmpty) st.winner = "B";
}

export type MoveResult = { ok: true } | { ok: false; error: string };

/** Hujum kartasi tashlash */
export function attack(st: DurakState, side: Side, c: Card): MoveResult {
  if (st.winner) return { ok: false, error: "O'yin tugagan" };
  if (side !== st.attacker) return { ok: false, error: "Sizning navbatingiz emas" };
  const undefended = st.table.filter((p) => !p.d).length;
  if (undefended > 0) return { ok: false, error: "Raqib javob berishini kuting" };
  const maxAttacks = Math.min(6, st.hands[other(side)].length + st.table.length);
  if (st.table.length >= maxAttacks) return { ok: false, error: "Boshqa karta tashlab bo'lmaydi" };
  if (st.table.length > 0 && !tableRanks(st).has(c.r))
    return { ok: false, error: "Faqat stoldagi qiymatdagi kartani tashlash mumkin" };
  const card = takeFromHand(st, side, c);
  if (!card) return { ok: false, error: "Bu karta sizda yo'q" };
  st.table.push({ a: card });
  st.turn = other(side);
  st.canPass = false;
  st.at = Date.now();
  st.log.push(`${side} hujum: ${cardId(card)}`);
  return { ok: true };
}

/** Himoya — stoldagi ochiq kartani yopish */
export function defend(st: DurakState, side: Side, c: Card, targetIdx: number): MoveResult {
  if (st.winner) return { ok: false, error: "O'yin tugagan" };
  if (side === st.attacker) return { ok: false, error: "Siz hujumchisiz" };
  const pair = st.table[targetIdx];
  if (!pair || pair.d) return { ok: false, error: "Noto'g'ri karta" };
  if (!beats(c, pair.a, st.trump)) return { ok: false, error: "Bu karta yopolmaydi" };
  const card = takeFromHand(st, side, c);
  if (!card) return { ok: false, error: "Bu karta sizda yo'q" };
  pair.d = card;
  st.at = Date.now();
  st.log.push(`${side} yopdi: ${cardId(card)}`);
  const allCovered = st.table.every((p) => p.d);
  if (allCovered) {
    st.turn = st.attacker;
    st.canPass = true;
  }
  return { ok: true };
}

/** Himoyachi kartalarni oladi */
export function take(st: DurakState, side: Side): MoveResult {
  if (st.winner) return { ok: false, error: "O'yin tugagan" };
  if (side === st.attacker) return { ok: false, error: "Siz hujumchisiz" };
  for (const p of st.table) {
    st.hands[side].push(p.a);
    if (p.d) st.hands[side].push(p.d);
  }
  st.log.push(`${side} kartalarni oldi`);
  st.table = [];
  refill(st);
  // oldi → hujum yana o'sha odamda
  st.turn = st.attacker;
  st.canPass = false;
  st.at = Date.now();
  checkEnd(st);
  return { ok: true };
}

/** "Bita" — hammasi yopilgan, raund tugaydi, rollar almashadi */
export function pass(st: DurakState, side: Side): MoveResult {
  if (st.winner) return { ok: false, error: "O'yin tugagan" };
  if (side !== st.attacker) return { ok: false, error: "Faqat hujumchi bita qila oladi" };
  if (!st.table.length) return { ok: false, error: "Stol bo'sh" };
  if (!st.table.every((p) => p.d)) return { ok: false, error: "Hali yopilmagan karta bor" };
  st.discard += st.table.reduce((n, p) => n + (p.d ? 2 : 1), 0);
  st.table = [];
  refill(st);
  st.attacker = other(st.attacker);
  st.turn = st.attacker;
  st.canPass = false;
  st.at = Date.now();
  st.log.push("Bita");
  checkEnd(st);
  return { ok: true };
}

/** Vaqt tugadi — avtomatik harakat */
export function autoMove(st: DurakState) {
  if (st.winner) return;
  const side = st.turn;
  if (side === st.attacker) {
    if (st.table.length && st.table.every((p) => p.d)) { pass(st, side); return; }
    // eng kichik mos kartani tashlaydi
    const ranks = tableRanks(st);
    const pool = st.table.length ? st.hands[side].filter((c) => ranks.has(c.r)) : st.hands[side];
    if (!pool.length) { if (st.table.length) pass(st, side); return; }
    const best = [...pool].sort((a, b) => cardScore(a, st.trump) - cardScore(b, st.trump))[0];
    attack(st, side, best);
  } else {
    const open = st.table.findIndex((p) => !p.d);
    if (open < 0) return;
    const target = st.table[open].a;
    const opts = st.hands[side].filter((c) => beats(c, target, st.trump));
    if (!opts.length) { take(st, side); return; }
    const best = [...opts].sort((a, b) => cardScore(a, st.trump) - cardScore(b, st.trump))[0];
    defend(st, side, best, open);
  }
}

export function cardScore(c: Card, trump: Suit) {
  return c.r + (c.s === trump ? 100 : 0);
}

/** O'yinchi ko'radigan holat */
export function viewFor(st: DurakState, side: Side) {
  return {
    trump: st.trump,
    trumpCard: st.trumpCard,
    deckLeft: st.deck.length,
    myHand: [...st.hands[side]].sort((a, b) => cardScore(a, st.trump) - cardScore(b, st.trump)),
    foeCount: st.hands[other(side)].length,
    table: st.table,
    iAmAttacker: st.attacker === side,
    myTurn: st.turn === side,
    canPass: st.canPass && st.attacker === side,
    winner: st.winner ? (st.winner === side ? "me" : "foe") : null,
    discard: st.discard,
    deadline: st.at + 30_000,
    log: st.log.slice(-6),
  };
}
