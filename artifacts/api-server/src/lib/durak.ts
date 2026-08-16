/**
 * Haqiqiy DURAK dvigateli — 36 karta (6..A), 6 talik qo'l, kozır (trump).
 * 2, 3 yoki 4 kishilik jonli PVP uchun. Barcha qoidalar server tomonda tekshiriladi.
 */

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Card = { r: number; s: Suit };
/** O'yinchi o'rni — 0..n-1 */
export type Side = number;

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
  n: number;
  deck: Card[];
  trump: Suit;
  trumpCard: Card | null;
  hands: Card[][];
  table: Pair[];
  discard: number;
  attacker: Side;
  defender: Side;
  /** kim harakat qilishi kerak */
  turn: Side;
  /** hujumchi "bita" ni bosishi mumkinmi */
  canPass: boolean;
  /** kartasi tugab chiqib ketganlar (chiqish tartibida) */
  out: Side[];
  /** oxirgi qolgan — durak (yutqazgan) */
  loser: Side | null;
  /** birinchi bo'lib chiqqan — g'olib */
  winner: Side | null;
  at: number;
  log: string[];
};

export function newGame(n = 2): DurakState {
  const count = Math.max(2, Math.min(4, n));
  const deck: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ r, s });
  shuffle(deck);
  const trumpCard = deck[deck.length - 1];
  const trump = trumpCard.s;
  const hands: Card[][] = Array.from({ length: count }, () => []);
  for (let i = 0; i < 6; i++) for (let p = 0; p < count; p++) hands[p].push(deck.shift()!);

  // eng kichik kozır kimda bo'lsa — birinchi hujum qiladi
  const low = (h: Card[]) => {
    const t = h.filter((c) => c.s === trump);
    return t.length ? Math.min(...t.map((c) => c.r)) : 99;
  };
  let attacker = 0;
  for (let p = 1; p < count; p++) if (low(hands[p]) < low(hands[attacker])) attacker = p;

  return {
    n: count,
    deck,
    trump,
    trumpCard,
    hands,
    table: [],
    discard: 0,
    attacker,
    defender: (attacker + 1) % count,
    turn: attacker,
    canPass: false,
    out: [],
    loser: null,
    winner: null,
    at: Date.now(),
    log: [],
  };
}

const isOut = (st: DurakState, p: Side) => st.out.includes(p);

/** keyingi hali o'ynayotgan o'yinchi */
export function nextAlive(st: DurakState, from: Side): Side {
  for (let i = 1; i <= st.n; i++) {
    const p = (from + i) % st.n;
    if (!isOut(st, p)) return p;
  }
  return from;
}

export const aliveCount = (st: DurakState) => st.n - st.out.length;

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
  const order: Side[] = [];
  let p = st.attacker;
  for (let i = 0; i < st.n; i++) { order.push(p); p = (p + 1) % st.n; }
  for (const s of order) {
    while (st.hands[s].length < 6 && st.deck.length) st.hands[s].push(st.deck.shift()!);
  }
}

function checkOut(st: DurakState) {
  if (st.deck.length) return;
  for (let p = 0; p < st.n; p++) {
    if (!isOut(st, p) && st.hands[p].length === 0) {
      st.out.push(p);
      st.log.push(`P${p + 1} kartalarini tugatdi`);
    }
  }
  if (st.winner === null && st.out.length) st.winner = st.out[0];
  if (aliveCount(st) <= 1) {
    for (let p = 0; p < st.n; p++) if (!isOut(st, p)) st.loser = p;
    if (st.loser === null && st.out.length) st.loser = st.out[st.out.length - 1];
  }
}

export const isFinished = (st: DurakState) => st.loser !== null;

function rotateRoles(st: DurakState, startFrom: Side) {
  st.attacker = isOut(st, startFrom) ? nextAlive(st, startFrom) : startFrom;
  st.defender = nextAlive(st, st.attacker);
  st.turn = st.attacker;
  st.canPass = false;
}

export type MoveResult = { ok: true } | { ok: false; error: string };

/** Hujum kartasi tashlash */
export function attack(st: DurakState, side: Side, c: Card): MoveResult {
  if (isFinished(st)) return { ok: false, error: "O'yin tugagan" };
  if (side !== st.attacker) return { ok: false, error: "Sizning navbatingiz emas" };
  const undefended = st.table.filter((p) => !p.d).length;
  if (undefended > 0) return { ok: false, error: "Raqib javob berishini kuting" };
  const maxAttacks = Math.min(6, st.hands[st.defender].length + st.table.length);
  if (st.table.length >= maxAttacks) return { ok: false, error: "Boshqa karta tashlab bo'lmaydi" };
  if (st.table.length > 0 && !tableRanks(st).has(c.r))
    return { ok: false, error: "Faqat stoldagi qiymatdagi kartani tashlash mumkin" };
  const card = takeFromHand(st, side, c);
  if (!card) return { ok: false, error: "Bu karta sizda yo'q" };
  st.table.push({ a: card });
  st.turn = st.defender;
  st.canPass = false;
  st.at = Date.now();
  st.log.push(`P${side + 1} hujum: ${cardId(card)}`);
  return { ok: true };
}

/** Himoya — stoldagi ochiq kartani yopish */
export function defend(st: DurakState, side: Side, c: Card, targetIdx: number): MoveResult {
  if (isFinished(st)) return { ok: false, error: "O'yin tugagan" };
  if (side !== st.defender) return { ok: false, error: "Siz himoyachi emassiz" };
  const pair = st.table[targetIdx];
  if (!pair || pair.d) return { ok: false, error: "Noto'g'ri karta" };
  if (!beats(c, pair.a, st.trump)) return { ok: false, error: "Bu karta yopolmaydi" };
  const card = takeFromHand(st, side, c);
  if (!card) return { ok: false, error: "Bu karta sizda yo'q" };
  pair.d = card;
  st.at = Date.now();
  st.log.push(`P${side + 1} yopdi: ${cardId(card)}`);
  if (st.table.every((p) => p.d)) {
    st.turn = st.attacker;
    st.canPass = true;
  }
  return { ok: true };
}

/** Himoyachi kartalarni oladi */
export function take(st: DurakState, side: Side): MoveResult {
  if (isFinished(st)) return { ok: false, error: "O'yin tugagan" };
  if (side !== st.defender) return { ok: false, error: "Siz himoyachi emassiz" };
  for (const p of st.table) {
    st.hands[side].push(p.a);
    if (p.d) st.hands[side].push(p.d);
  }
  st.log.push(`P${side + 1} kartalarni oldi`);
  st.table = [];
  refill(st);
  checkOut(st);
  st.at = Date.now();
  if (isFinished(st)) return { ok: true };
  rotateRoles(st, nextAlive(st, side));
  return { ok: true };
}

/** "Bita" — hammasi yopilgan, raund tugaydi, rollar almashadi */
export function pass(st: DurakState, side: Side): MoveResult {
  if (isFinished(st)) return { ok: false, error: "O'yin tugagan" };
  if (side !== st.attacker) return { ok: false, error: "Faqat hujumchi bita qila oladi" };
  if (!st.table.length) return { ok: false, error: "Stol bo'sh" };
  if (!st.table.every((p) => p.d)) return { ok: false, error: "Hali yopilmagan karta bor" };
  st.discard += st.table.reduce((n, p) => n + (p.d ? 2 : 1), 0);
  st.table = [];
  refill(st);
  checkOut(st);
  st.at = Date.now();
  st.log.push("Bita");
  if (isFinished(st)) return { ok: true };
  rotateRoles(st, st.defender);
  return { ok: true };
}

/** Vaqt tugadi — avtomatik harakat */
export function autoMove(st: DurakState) {
  if (isFinished(st)) return;
  const side = st.turn;
  if (side === st.attacker) {
    if (st.table.length && st.table.every((p) => p.d)) { pass(st, side); return; }
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
  const seats = [];
  for (let i = 1; i < st.n; i++) {
    const p = (side + i) % st.n;
    seats.push({
      seat: p,
      cards: st.hands[p].length,
      out: isOut(st, p),
      isAttacker: st.attacker === p,
      isDefender: st.defender === p,
      isTurn: st.turn === p,
    });
  }
  return {
    seat: side,
    players: st.n,
    trump: st.trump,
    trumpCard: st.trumpCard,
    deckLeft: st.deck.length,
    myHand: [...st.hands[side]].sort((a, b) => cardScore(a, st.trump) - cardScore(b, st.trump)),
    foes: seats,
    table: st.table,
    iAmAttacker: st.attacker === side,
    iAmDefender: st.defender === side,
    myTurn: st.turn === side,
    canPass: st.canPass && st.attacker === side,
    finished: isFinished(st),
    iAmOut: isOut(st, side),
    winner: st.winner,
    loser: st.loser,
    result: isFinished(st) ? (st.loser === side ? "lose" : "win") : null,
    discard: st.discard,
    deadline: st.at + 30_000,
    log: st.log.slice(-6),
  };
}
