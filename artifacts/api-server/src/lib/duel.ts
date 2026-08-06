/**
 * DUEL — 1x1 haqiqiy odamlar o'ynaydigan universal PVP dvigateli.
 * Har bir o'yin raundlardan iborat: ikkala o'yinchi harakat yuboradi,
 * server natijani hisoblaydi. Barcha tasodif serverda (mijoz alday olmaydi).
 */

export type DuelKind = "pick" | "roll" | "skill" | "tiles" | "count";

export type DuelDef = {
  key: string;
  title: string;
  sub: string;
  img: string;
  emoji: string;
  kind: DuelKind;
  rounds: number;
  picks?: string[];
  /** tiles: nechta tanlov, nechta katak */
  tiles?: { choose: number; of: number; levels?: number };
  /** count: mijozdagi mini-o'yin turi */
  count?: "click" | "memory";
  /** raund uchun vaqt (ms) */
  timer: number;
  rule: string;
};

const D = (d: DuelDef) => d;

export const DUELS: DuelDef[] = [
  D({ key: "coinflip", title: "Coin Flip PvP", sub: "Tanga tashlash", img: "/games/coinflip.jpg", emoji: "🪙", kind: "pick", picks: ["Boshi", "Yozi"], rounds: 3, timer: 15000, rule: "To'g'ri topgan raundni yutadi. 3 raund." }),
  D({ key: "rps", title: "Tosh–Qaychi–Qog'oz", sub: "Klassik duel", img: "/games/hands.jpg", emoji: "✊", kind: "pick", picks: ["Tosh", "Qaychi", "Qog'oz"], rounds: 3, timer: 15000, rule: "Tosh > Qaychi > Qog'oz > Tosh. 3 raund." }),
  D({ key: "dicebattle", title: "Dice Battle", sub: "Kimning zari katta", img: "/games/dice.jpg", emoji: "🎲", kind: "roll", rounds: 3, timer: 15000, rule: "Har raundda 2 ta zar. Yig'indisi katta bo'lgan yutadi." }),
  D({ key: "dragontiger", title: "Dragon vs Tiger", sub: "Karta qiymati", img: "/games/dragontiger.jpg", emoji: "🐉", kind: "pick", picks: ["Ajdaho", "Yo'lbars"], rounds: 3, timer: 15000, rule: "Qaysi tomon kartasi baland bo'lsa — o'sha tanlagan yutadi." }),
  D({ key: "darts", title: "Darts Battle", sub: "Eng yuqori ochko", img: "/games/apple.jpg", emoji: "🎯", kind: "skill", rounds: 3, timer: 15000, rule: "Harakatlanuvchi nishonni markazda to'xtating. Maks 60 ochko." }),
  D({ key: "bowling", title: "Bowling Battle", sub: "Eng ko'p pin", img: "/games/derby.jpg", emoji: "🎳", kind: "skill", rounds: 3, timer: 15000, rule: "Kuch chizig'ini to'g'ri to'xtating — 10 pingacha." }),
  D({ key: "penalty", title: "Penalty Shootout", sub: "Navbat bilan zarba", img: "/games/derby.jpg", emoji: "⚽", kind: "pick", picks: ["Chap", "Markaz", "O'ng"], rounds: 5, timer: 12000, rule: "Raqib tanlagan burchakka ursangiz — to'xtatiladi." }),
  D({ key: "dragrace", title: "Drag Race", sub: "Reaksiya tezligi", img: "/games/derby.jpg", emoji: "🏎️", kind: "skill", rounds: 3, timer: 15000, rule: "Yashil chiqqanda tez bosing — reaksiya tez bo'lsa ochko ko'p." }),
  D({ key: "minesrace", title: "Mines Race", sub: "Xavfsiz yo'l", img: "/games/mines.jpg", emoji: "💣", kind: "tiles", tiles: { choose: 3, of: 12 }, rounds: 3, timer: 20000, rule: "12 katakdan 3 tasini oching. Minasiz kataklar soni — ochko." }),
  D({ key: "towersduel", title: "Towers Duel", sub: "Kim balandroq", img: "/games/plinko.jpg", emoji: "🗼", kind: "tiles", tiles: { choose: 5, of: 3, levels: 5 }, rounds: 2, timer: 20000, rule: "Har qavatda 3 eshikdan bittasi xavfsiz. Ketma-ket to'g'rilar — ochko." }),
  D({ key: "limboduel", title: "Limbo Duel", sub: "Kim ko'proq x oladi", img: "/games/limbo.jpg", emoji: "📈", kind: "pick", picks: ["x1.5", "x2", "x5", "x10"], rounds: 3, timer: 15000, rule: "Tanlagan koeffitsiyentdan oshsa — o'sha ochko. Oshmasa 0." }),
  D({ key: "slotbattle", title: "Slot Battle", sub: "Eng katta kombinatsiya", img: "/games/slots.jpg", emoji: "🎰", kind: "roll", rounds: 3, timer: 15000, rule: "3 barabanni aylantiring, kombinatsiya qiymati — ochko." }),
  D({ key: "wheelbattle", title: "Wheel Battle", sub: "Kimning sektori yuqori", img: "/games/moneywheel.jpg", emoji: "🎡", kind: "roll", rounds: 3, timer: 15000, rule: "G'ildirakni aylantiring — sektor qiymati ochko bo'ladi." }),
  D({ key: "crashduel", title: "Crash Battle", sub: "Vaqtida cash out", img: "/games/aviator.jpg", emoji: "🚀", kind: "pick", picks: ["x1.3", "x1.8", "x2.5", "x4", "x8"], rounds: 3, timer: 15000, rule: "Raketa portlamasdan chiqsangiz koeffitsiyent ochko bo'ladi." }),
  D({ key: "hilobattle", title: "Higher or Lower", sub: "Kartani taxmin qilish", img: "/games/hilo.jpg", emoji: "🔢", kind: "pick", picks: ["Baland", "Past"], rounds: 3, timer: 15000, rule: "Keyingi karta baland yoki pastligini toping." }),
  D({ key: "memoryduel", title: "Memory Cards", sub: "Kim tezroq topsa", img: "/games/luckycard.jpg", emoji: "🧠", kind: "count", count: "memory", rounds: 1, timer: 60000, rule: "Barcha juftliklarni tez toping — qolgan vaqt ochko." }),
  D({ key: "fastclick", title: "Fast Click", sub: "10 soniyada ko'p bosish", img: "/games/fruitblast.jpg", emoji: "⚡", kind: "count", count: "click", rounds: 1, timer: 20000, rule: "10 soniyada imkon qadar ko'p bosing." }),
];

export const DUEL_MAP = new Map(DUELS.map((d) => [d.key, d]));

const ri = (n: number) => Math.floor(Math.random() * n);
const CARD = (): number => 2 + ri(13); // 2..14

export type Submission = { value: number; picks?: number[] };
export type RoundOutcome = {
  scores: [number, number];
  detail: string;
  reveal: unknown;
};

/** Ikkala harakat asosida raund natijasini hisoblaydi */
export function resolveRound(def: DuelDef, subs: [Submission, Submission]): RoundOutcome {
  const a = subs[0], b = subs[1];
  switch (def.key) {
    case "coinflip": {
      const flip = ri(2);
      return {
        scores: [a.value === flip ? 1 : 0, b.value === flip ? 1 : 0],
        detail: `Tanga: ${def.picks![flip]}`,
        reveal: { flip },
      };
    }
    case "rps": {
      const beats = (x: number, y: number) => (x === 0 && y === 1) || (x === 1 && y === 2) || (x === 2 && y === 0);
      return {
        scores: [beats(a.value, b.value) ? 1 : 0, beats(b.value, a.value) ? 1 : 0],
        detail: `${def.picks![a.value]} vs ${def.picks![b.value]}`,
        reveal: { a: a.value, b: b.value },
      };
    }
    case "dicebattle": {
      const r = () => [1 + ri(6), 1 + ri(6)] as [number, number];
      const da = r(), db = r();
      return {
        scores: [da[0] + da[1], db[0] + db[1]],
        detail: `${da[0]}+${da[1]} vs ${db[0]}+${db[1]}`,
        reveal: { a: da, b: db },
      };
    }
    case "dragontiger": {
      const dr = CARD(), tg = CARD();
      const winSide = dr === tg ? -1 : dr > tg ? 0 : 1;
      return {
        scores: [a.value === winSide ? 1 : 0, b.value === winSide ? 1 : 0],
        detail: `Ajdaho ${dr} — Yo'lbars ${tg}`,
        reveal: { dr, tg, winSide },
      };
    }
    case "darts": {
      const pts = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 60);
      return { scores: [pts(a.value), pts(b.value)], detail: "Nishon", reveal: {} };
    }
    case "bowling": {
      const pins = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 10);
      return { scores: [pins(a.value), pins(b.value)], detail: "Pinlar", reveal: {} };
    }
    case "penalty": {
      return {
        scores: [a.value === b.value ? 0 : 1, b.value === a.value ? 0 : 1],
        detail: `${def.picks![a.value]} / ${def.picks![b.value]}`,
        reveal: { a: a.value, b: b.value },
      };
    }
    case "dragrace": {
      const pts = (v: number) => Math.max(0, Math.round(1000 - Math.min(1000, Math.max(80, v))));
      return { scores: [pts(a.value), pts(b.value)], detail: `${a.value}ms / ${b.value}ms`, reveal: {} };
    }
    case "minesrace": {
      const bombs = new Set<number>();
      while (bombs.size < 4) bombs.add(ri(12));
      const safe = (s: Submission) => (s.picks ?? []).filter((i) => !bombs.has(i)).length;
      return { scores: [safe(a), safe(b)], detail: "Minalar ochildi", reveal: { bombs: [...bombs] } };
    }
    case "towersduel": {
      const safe = Array.from({ length: 5 }, () => ri(3));
      const climb = (s: Submission) => {
        let n = 0;
        for (let i = 0; i < 5; i++) { if ((s.picks ?? [])[i] === safe[i]) n++; else break; }
        return n;
      };
      return { scores: [climb(a), climb(b)], detail: "Minora", reveal: { safe } };
    }
    case "limboduel": {
      const targets = [1.5, 2, 5, 10];
      const roll = () => Math.max(1, Number((1 / (1 - Math.random() * 0.97)).toFixed(2)));
      const ra = roll(), rb = roll();
      const sc = (s: Submission, r: number) => (r >= targets[s.value]! ? Math.round(targets[s.value]! * 100) : 0);
      return { scores: [sc(a, ra), sc(b, rb)], detail: `x${ra} / x${rb}`, reveal: { ra, rb } };
    }
    case "slotbattle": {
      const spin = () => Array.from({ length: 3 }, () => ri(7));
      const val = (s: number[]) =>
        s[0] === s[1] && s[1] === s[2] ? 100 + s[0]! * 20 : s[0] === s[1] || s[1] === s[2] || s[0] === s[2] ? 20 + s[1]! * 3 : s[0]! + s[1]! + s[2]!;
      const sa = spin(), sb = spin();
      return { scores: [val(sa), val(sb)], detail: "Baraban", reveal: { a: sa, b: sb } };
    }
    case "wheelbattle": {
      const sectors = [0, 5, 10, 20, 30, 40, 60, 80, 100, 150];
      const ia = ri(sectors.length), ib = ri(sectors.length);
      return { scores: [sectors[ia]!, sectors[ib]!], detail: `${sectors[ia]} / ${sectors[ib]}`, reveal: { ia, ib, sectors } };
    }
    case "crashduel": {
      const targets = [1.3, 1.8, 2.5, 4, 8];
      const crash = () => Math.max(1, Number((1 / (1 - Math.random() * 0.96)).toFixed(2)));
      const ca = crash(), cb = crash();
      const sc = (s: Submission, c: number) => (c >= targets[s.value]! ? Math.round(targets[s.value]! * 100) : 0);
      return { scores: [sc(a, ca), sc(b, cb)], detail: `x${ca} / x${cb}`, reveal: { ca, cb } };
    }
    case "hilobattle": {
      const base = CARD();
      const nextA = CARD(), nextB = CARD();
      const ok = (s: Submission, n: number) => (s.value === 0 ? n > base : n < base) ? 1 : 0;
      return { scores: [ok(a, nextA), ok(b, nextB)], detail: `Baza ${base}`, reveal: { base, nextA, nextB } };
    }
    case "memoryduel":
    case "fastclick": {
      const cap = def.key === "fastclick" ? 300 : 60000;
      const v = (s: Submission) => Math.max(0, Math.min(cap, Math.round(s.value)));
      return { scores: [v(a), v(b)], detail: "Natija", reveal: {} };
    }
    default:
      return { scores: [0, 0], detail: "", reveal: {} };
  }
}

/** Vaqt tugaganda avtomatik harakat */
export function autoSubmission(def: DuelDef): Submission {
  if (def.kind === "pick") return { value: ri(def.picks!.length) };
  if (def.kind === "skill") return { value: Math.random() * 0.5 };
  if (def.kind === "tiles") {
    const t = def.tiles!;
    if (t.levels) return { value: 0, picks: Array.from({ length: t.levels }, () => ri(t.of)) };
    const set = new Set<number>();
    while (set.size < t.choose) set.add(ri(t.of));
    return { value: 0, picks: [...set] };
  }
  if (def.kind === "count") return { value: 0 };
  return { value: 0 };
}
