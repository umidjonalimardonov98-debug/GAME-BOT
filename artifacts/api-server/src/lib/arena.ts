/**
 * ARENA — 2–4 kishilik LIVE o'yinlar dvigateli.
 * Har raundda barcha o'yinchilar harakat yuboradi, natijani FAQAT server hisoblaydi.
 * Yutuq: eng ko'p ochko to'plagan oladi; tenglik bo'lsa — teng bo'lganlarga bo'linadi.
 */

export type ArenaKind = "pick" | "roll" | "skill" | "tap" | "reaction" | "tiles";

export type ArenaDef = {
  key: string;
  title: string;
  sub: string;
  img: string;
  kind: ArenaKind;
  rounds: number;
  timer: number;
  rule: string;
  /** pick: variantlar */
  picks?: string[];
  /** tiles: nechta tanlov / nechta katak */
  tiles?: { choose: number; of: number };
  /** o'yin rangi */
  color: string;
  /** asosiy tugma matni */
  action: string;
};

const A = (d: ArenaDef) => d;
const IMG = (k: string) => `/games/arena/${k}.jpg`;

export const ARENA_MIN = 2;
export const ARENA_MAX = 4;

export const ARENAS: ArenaDef[] = [
  A({ key: "kopkari", title: "Ko'pkari", sub: "Uloq uchun poyga", img: IMG("kopkari"), kind: "tap", rounds: 3, timer: 12000, color: "#f59e0b", action: "OTNI HAYDA",
    rule: "6 soniyada imkon qadar tez bosing — otingiz oldinga chopadi. Uloqqa birinchi yetgan eng ko'p ochko oladi." }),
  A({ key: "kurash", title: "Kurash", sub: "Polvonlar bellashuvi", img: IMG("kurash"), kind: "pick", rounds: 3, timer: 15000, color: "#22c55e", action: "USULNI TANLA",
    picks: ["Chalish", "Ko'tarish", "Himoya"],
    rule: "Chalish Ko'tarishni yengadi, Ko'tarish Himoyani, Himoya Chalishni. Har yengilgan raqib uchun 1 ochko." }),
  A({ key: "armwrestle", title: "Bilak kurashi", sub: "Kimning qo'li kuchli", img: IMG("armwrestle"), kind: "tap", rounds: 3, timer: 10000, color: "#ef4444", action: "BOS-BOS-BOS",
    rule: "5 soniyada eng ko'p bosgan raundni yutadi — raqib qo'lini stolga bosadi." }),
  A({ key: "basketball", title: "Basketbol", sub: "Savatga to'p", img: IMG("basketball"), kind: "skill", rounds: 5, timer: 12000, color: "#f97316", action: "OTISH",
    rule: "Kuch chizig'ini yashil zonada to'xtating. Aniq otish — 3 ochko, yaqin — 2 ochko imkoniyati." }),
  A({ key: "boxing", title: "Boks", sub: "Ringda to'qnashuv", img: IMG("boxing"), kind: "pick", rounds: 3, timer: 15000, color: "#dc2626", action: "ZARBA",
    picks: ["Chap zarba", "O'ng zarba", "Himoya"],
    rule: "Himoyalanmagan raqibga zarba — 1 ochko. Hujumni himoya bilan qaytarsangiz — 1 ochko." }),
  A({ key: "archery", title: "Kamondan otish", sub: "Shamolga qarshi", img: IMG("archery"), kind: "skill", rounds: 3, timer: 12000, color: "#eab308", action: "O'Q UZISH",
    rule: "Nishon markazida to'xtating. Shamol o'qni og'diradi — eng aniq otgan ko'proq ochko oladi (0–10)." }),
  A({ key: "nardarena", title: "Nard Arena", sub: "Zarlar jangi", img: IMG("nardarena"), kind: "roll", rounds: 3, timer: 12000, color: "#b45309", action: "ZAR TASHLASH",
    rule: "Har raundda 2 ta zar. Yig'indi ochko bo'ladi, juft tushsa — ikki baravar." }),
  A({ key: "pokerdice", title: "Poker zarlari", sub: "5 zar kombinatsiyasi", img: IMG("pokerdice"), kind: "roll", rounds: 3, timer: 12000, color: "#e11d48", action: "5 ZAR TASHLASH",
    rule: "5 ta zar: beshlik, to'rtlik, full house, ketma-ket, uchlik, ikki juft, juft. Kuchli kombinatsiya — ko'p ochko." }),
  A({ key: "horserace", title: "Ot poygasi", sub: "G'olib otni top", img: IMG("horserace"), kind: "pick", rounds: 3, timer: 15000, color: "#3b82f6", action: "OTNI TANLA",
    picks: ["1-ot", "2-ot", "3-ot", "4-ot", "5-ot", "6-ot"],
    rule: "Otni tanlang. 1-o'rin — 5 ochko, 2-o'rin — 3, 3-o'rin — 1." }),
  A({ key: "eggfight", title: "Tuxum urishtirish", sub: "Navro'z an'anasi", img: IMG("eggfight"), kind: "roll", rounds: 3, timer: 12000, color: "#f472b6", action: "TUXUMNI UR",
    rule: "Tuxumingiz har bir raqib tuxumiga uriladi. Har sindirgan tuxum uchun 1 ochko." }),
  A({ key: "uniquenum", title: "Noyob raqam", sub: "Aql jangi", img: IMG("uniquenum"), kind: "pick", rounds: 3, timer: 15000, color: "#6366f1", action: "RAQAM TANLA",
    picks: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    rule: "1–10 dan raqam tanlang. Faqat bitta odam tanlagan eng kichik raqam egasi 3 ochko oladi." }),
  A({ key: "pokerhand", title: "Poker qo'li", sub: "5 karta", img: IMG("pokerhand"), kind: "roll", rounds: 3, timer: 12000, color: "#10b981", action: "KARTA OCHISH",
    rule: "Har kimga bitta kolodadan 5 karta tarqatiladi. Kuchli qo'l — ko'p ochko." }),
  A({ key: "roulettearena", title: "Ruletka Arena", sub: "Rang va raqam", img: IMG("roulettearena"), kind: "pick", rounds: 3, timer: 15000, color: "#16a34a", action: "TIKISH",
    picks: ["Qizil", "Qora", "Juft", "Toq", "Yashil 0"],
    rule: "Ruletka bitta aylanadi. Rang yoki juft/toq topilsa — 2 ochko, yashil 0 — 10 ochko." }),
  A({ key: "crasharena", title: "Raketa Arena", sub: "Vaqtida chiq", img: IMG("crasharena"), kind: "pick", rounds: 3, timer: 15000, color: "#a855f7", action: "CHIQISH NUQTASI",
    picks: ["x1.5", "x2", "x3", "x5", "x10"],
    rule: "Hamma uchun bitta raketa. Portlashdan oldin chiqsangiz — koeffitsiyent x10 ochko." }),
  A({ key: "bombbox", title: "Bomba qutisi", sub: "Omadingni sina", img: IMG("bombbox"), kind: "pick", rounds: 3, timer: 15000, color: "#ef4444", action: "QUTI TANLA",
    picks: ["1", "2", "3", "4", "5", "6"],
    rule: "6 qutidan birida bomba, birida oltin. Omon qolsangiz 1 ochko, oltin qutiga 3 ochko." }),
  A({ key: "treasure", title: "Xazina sandiqlari", sub: "Oltinni bo'lish", img: IMG("treasure"), kind: "pick", rounds: 3, timer: 15000, color: "#facc15", action: "SANDIQ TANLA",
    picks: ["1", "2", "3", "4", "5", "6"],
    rule: "Har sandiqda har xil oltin. Bir sandiqni tanlaganlar oltinni teng bo'lishadi." }),
  A({ key: "wheelarena", title: "Omad g'ildiragi", sub: "Katta sektor", img: IMG("wheelarena"), kind: "roll", rounds: 3, timer: 12000, color: "#fb923c", action: "AYLANTIRISH",
    rule: "G'ildirakni aylantiring — tushgan sektor ochko bo'ladi. 200 lik oltin sektor kam uchraydi." }),
  A({ key: "reaction", title: "Reaksiya", sub: "Eng tez barmoq", img: IMG("reaction"), kind: "reaction", rounds: 3, timer: 14000, color: "#22d3ee", action: "YASHILDA BOS",
    rule: "Chiroq yashil bo'lganda darhol bosing. Tez bosgan ko'p ochko oladi, erta bossangiz — 0." }),
  A({ key: "minesarena", title: "Minalar Arenasi", sub: "Xavfsiz katak", img: IMG("minesarena"), kind: "tiles", rounds: 2, timer: 20000, color: "#0ea5e9", action: "KATAKLARNI OCH",
    tiles: { choose: 4, of: 16 },
    rule: "16 katakdan 4 tasini tanlang. 5 ta mina hamma uchun bir xil. Har xavfsiz katak — 10 ochko, minaga tegsangiz — yarmi." }),
  A({ key: "dartsarena", title: "Darts Arena", sub: "Buqa ko'zi", img: IMG("dartsarena"), kind: "skill", rounds: 3, timer: 12000, color: "#84cc16", action: "DART OTISH",
    rule: "Nishonni markazda to'xtating. Buqa ko'zi — 50, ichki halqa — 25, qolgani 0–20, ba'zan x3." }),
];

export const ARENA_MAP = new Map(ARENAS.map((d) => [d.key, d]));

export type ArenaSub = { value: number; picks?: number[] };
export type ArenaOutcome = { scores: number[]; detail: string; reveal: Record<string, unknown> };

const ri = (n: number) => Math.floor(Math.random() * n);
const clamp01 = (v: number) => Math.max(0, Math.min(1, Number(v) || 0));
const pickIdx = (s: ArenaSub, n: number) => Math.max(0, Math.min(n - 1, Math.floor(Number(s.value) || 0)));

/* ── poker zarlari bahosi ── */
function diceRank(d: number[]): { pts: number; name: string } {
  const c = new Map<number, number>();
  for (const x of d) c.set(x, (c.get(x) ?? 0) + 1);
  const counts = [...c.values()].sort((a, b) => b - a);
  const s = [...d].sort((a, b) => a - b).join("");
  if (counts[0] === 5) return { pts: 100, name: "Beshlik" };
  if (counts[0] === 4) return { pts: 60, name: "To'rtlik" };
  if (counts[0] === 3 && counts[1] === 2) return { pts: 45, name: "Full house" };
  if (s === "12345" || s === "23456") return { pts: 40, name: "Ketma-ket" };
  if (counts[0] === 3) return { pts: 30, name: "Uchlik" };
  if (counts[0] === 2 && counts[1] === 2) return { pts: 20, name: "Ikki juft" };
  if (counts[0] === 2) return { pts: 10, name: "Juft" };
  return { pts: 0, name: "Hech narsa" };
}

/* ── poker qo'li bahosi (karta: 0..51, qiymat 2..14) ── */
function handRank(cards: number[]): { pts: number; name: string } {
  const v = cards.map((c) => 2 + (c % 13)).sort((a, b) => b - a);
  const suits = cards.map((c) => Math.floor(c / 13));
  const flush = suits.every((x) => x === suits[0]);
  const uniq = [...new Set(v)];
  const straight = uniq.length === 5 && (v[0]! - v[4]! === 4 || uniq.join(",") === "14,5,4,3,2");
  const c = new Map<number, number>();
  for (const x of v) c.set(x, (c.get(x) ?? 0) + 1);
  const counts = [...c.values()].sort((a, b) => b - a);
  const high = v[0]!;
  if (straight && flush) return { pts: 160 + high, name: "Strit flesh" };
  if (counts[0] === 4) return { pts: 140 + high, name: "Kare" };
  if (counts[0] === 3 && counts[1] === 2) return { pts: 120 + high, name: "Full house" };
  if (flush) return { pts: 100 + high, name: "Flesh" };
  if (straight) return { pts: 80 + high, name: "Strit" };
  if (counts[0] === 3) return { pts: 60 + high, name: "Set" };
  if (counts[0] === 2 && counts[1] === 2) return { pts: 40 + high, name: "Ikki juft" };
  if (counts[0] === 2) return { pts: 20 + high, name: "Juft" };
  return { pts: high, name: "Katta karta" };
}

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

/** Barcha o'yinchilar harakati asosida raund natijasi */
export function resolveArena(def: ArenaDef, subs: ArenaSub[]): ArenaOutcome {
  const n = subs.length;
  const zero = () => new Array(n).fill(0) as number[];
  switch (def.key) {
    case "kopkari": {
      const taps = subs.map((s) => Math.max(0, Math.min(90, Math.round(Number(s.value) || 0))));
      const order = taps.map((t, i) => ({ t, i })).sort((a, b) => b.t - a.t);
      const sc = zero();
      // uloqqa birinchi yetganga bonus
      order.forEach((o, rank) => { sc[o.i] = o.t + (rank === 0 && o.t > 0 ? 30 : rank === 1 ? 10 : 0); });
      return { scores: sc, detail: "Uloq poygasi", reveal: { taps } };
    }
    case "armwrestle": {
      const taps = subs.map((s) => Math.max(0, Math.min(80, Math.round(Number(s.value) || 0))));
      const top = Math.max(...taps);
      return { scores: taps.map((t) => (t === top && t > 0 ? 1 : 0)), detail: `Eng kuchli: ${top} bosish`, reveal: { taps } };
    }
    case "kurash": {
      const p = subs.map((s) => pickIdx(s, 3));
      const beats = (a: number, b: number) => (a === 0 && b === 1) || (a === 1 && b === 2) || (a === 2 && b === 0);
      const sc = p.map((a, i) => p.reduce((acc, b, j) => acc + (i !== j && beats(a, b) ? 1 : 0), 0));
      return { scores: sc, detail: "Usullar to'qnashdi", reveal: { picks: p } };
    }
    case "boxing": {
      const p = subs.map((s) => pickIdx(s, 3)); // 0 chap, 1 o'ng, 2 himoya
      const sc = zero();
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (p[i] !== 2 && p[j] !== 2) sc[i] += 1; // ikkalasi uradi — ikkisi ham tegadi
        else if (p[i] !== 2 && p[j] === 2) sc[j] += 1; // himoya qaytardi
      }
      return { scores: sc, detail: "Raund tugadi", reveal: { picks: p } };
    }
    case "basketball": {
      const shots = subs.map((s) => {
        const v = clamp01(s.value);
        if (v >= 0.92) return 3;
        if (v >= 0.75) return Math.random() < 0.7 ? 2 : 0;
        if (v >= 0.5) return Math.random() < 0.35 ? 2 : 0;
        return 0;
      });
      return { scores: shots, detail: "To'p savatda", reveal: { shots } };
    }
    case "archery": {
      const wind = Number(((Math.random() - 0.5) * 0.5).toFixed(2));
      const pts = subs.map((s) => {
        const v = clamp01(s.value);
        const drift = Math.abs(wind) * (0.3 + Math.random() * 0.7);
        return Math.max(0, Math.round((v - drift * (1 - v * 0.5)) * 10));
      });
      return { scores: pts, detail: `Shamol: ${wind > 0 ? "o'ngga" : "chapga"} ${Math.abs(wind * 20).toFixed(1)} m/s`, reveal: { wind, pts } };
    }
    case "dartsarena": {
      const pts = subs.map((s) => {
        const v = clamp01(s.value);
        if (v >= 0.97) return 50;
        if (v >= 0.9) return 25;
        const base = Math.max(0, Math.round(v * 20));
        return Math.random() < 0.12 ? base * 3 : base;
      });
      return { scores: pts, detail: "Darts", reveal: { pts } };
    }
    case "nardarena": {
      const dice = subs.map(() => [1 + ri(6), 1 + ri(6)]);
      const sc = dice.map(([a, b]) => (a === b ? (a! + b!) * 2 : a! + b!));
      return { scores: sc, detail: "Zarlar tashlandi", reveal: { dice } };
    }
    case "pokerdice": {
      const dice = subs.map(() => Array.from({ length: 5 }, () => 1 + ri(6)));
      const ranks = dice.map(diceRank);
      const sc = dice.map((d, i) => ranks[i]!.pts + d.reduce((a, b) => a + b, 0));
      return { scores: sc, detail: "Kombinatsiyalar", reveal: { dice, names: ranks.map((r) => r.name) } };
    }
    case "pokerhand": {
      const deck = Array.from({ length: 52 }, (_, i) => i);
      for (let i = deck.length - 1; i > 0; i--) { const j = ri(i + 1); [deck[i], deck[j]] = [deck[j]!, deck[i]!]; }
      const hands = subs.map((_, i) => deck.slice(i * 5, i * 5 + 5));
      const ranks = hands.map(handRank);
      return { scores: ranks.map((r) => r.pts), detail: "Qo'llar ochildi", reveal: { hands, names: ranks.map((r) => r.name) } };
    }
    case "eggfight": {
      const power = subs.map(() => 1 + ri(100));
      const sc = power.map((p, i) => power.reduce((acc, q, j) => acc + (i !== j && p > q ? 1 : 0), 0));
      return { scores: sc, detail: "Tuxumlar urildi", reveal: { power } };
    }
    case "horserace": {
      const order = [0, 1, 2, 3, 4, 5];
      for (let i = order.length - 1; i > 0; i--) { const j = ri(i + 1); [order[i], order[j]] = [order[j]!, order[i]!]; }
      const pts = [5, 3, 1];
      const p = subs.map((s) => pickIdx(s, 6));
      const sc = p.map((h) => { const pos = order.indexOf(h); return pos < 3 ? pts[pos]! : 0; });
      return { scores: sc, detail: `G'olib: ${order[0]! + 1}-ot`, reveal: { order, picks: p } };
    }
    case "uniquenum": {
      const p = subs.map((s) => pickIdx(s, 10));
      const cnt = new Map<number, number>();
      for (const x of p) cnt.set(x, (cnt.get(x) ?? 0) + 1);
      const uniques = [...cnt.entries()].filter(([, c]) => c === 1).map(([x]) => x).sort((a, b) => a - b);
      const win = uniques.length ? uniques[0]! : -1;
      return { scores: p.map((x) => (x === win ? 3 : 0)), detail: win >= 0 ? `Noyob eng kichik: ${win + 1}` : "Noyob raqam yo'q", reveal: { picks: p, win } };
    }
    case "roulettearena": {
      const num = ri(37);
      const p = subs.map((s) => pickIdx(s, 5));
      const hit = (k: number) =>
        k === 0 ? num !== 0 && REDS.has(num) : k === 1 ? num !== 0 && !REDS.has(num)
          : k === 2 ? num !== 0 && num % 2 === 0 : k === 3 ? num % 2 === 1 : num === 0;
      return { scores: p.map((k) => (hit(k) ? (k === 4 ? 10 : 2) : 0)), detail: `Raqam: ${num}`, reveal: { num, picks: p } };
    }
    case "crasharena": {
      const targets = [1.5, 2, 3, 5, 10];
      const crash = Math.max(1, Number((1 / (1 - Math.random() * 0.96)).toFixed(2)));
      const p = subs.map((s) => pickIdx(s, 5));
      return { scores: p.map((k) => (crash >= targets[k]! ? Math.round(targets[k]! * 10) : 0)), detail: `Portladi: x${crash}`, reveal: { crash, picks: p } };
    }
    case "bombbox": {
      const bomb = ri(6);
      let gold = ri(6); while (gold === bomb) gold = ri(6);
      const p = subs.map((s) => pickIdx(s, 6));
      return { scores: p.map((k) => (k === bomb ? 0 : k === gold ? 3 : 1)), detail: `Bomba: ${bomb + 1}-quti`, reveal: { bomb, gold, picks: p } };
    }
    case "treasure": {
      const pool = [0, 5, 10, 20, 50, 100];
      for (let i = pool.length - 1; i > 0; i--) { const j = ri(i + 1); [pool[i], pool[j]] = [pool[j]!, pool[i]!]; }
      const p = subs.map((s) => pickIdx(s, 6));
      const cnt = new Map<number, number>();
      for (const x of p) cnt.set(x, (cnt.get(x) ?? 0) + 1);
      return { scores: p.map((k) => Math.floor(pool[k]! / (cnt.get(k) ?? 1))), detail: "Sandiqlar ochildi", reveal: { pool, picks: p } };
    }
    case "wheelarena": {
      const sectors = [0, 10, 20, 30, 50, 80, 100, 200];
      const weights = [14, 18, 18, 16, 14, 10, 7, 3];
      const roll = () => { let r = ri(weights.reduce((a, b) => a + b, 0)); for (let i = 0; i < weights.length; i++) { r -= weights[i]!; if (r < 0) return i; } return 0; };
      const idx = subs.map(() => roll());
      return { scores: idx.map((i) => sectors[i]!), detail: "G'ildiraklar to'xtadi", reveal: { idx, sectors } };
    }
    case "reaction": {
      const ms = subs.map((s) => Math.round(Number(s.value) || 9999));
      // 120 ms dan tez — inson uchun imkonsiz (erta bosish) — 0
      return { scores: ms.map((m) => (m < 120 || m >= 2000 ? 0 : Math.max(0, 1000 - m))), detail: "Reaksiya", reveal: { ms } };
    }
    case "minesarena": {
      const bombs = new Set<number>();
      while (bombs.size < 5) bombs.add(ri(16));
      const sc = subs.map((s) => {
        const pk = [...new Set((s.picks ?? []).map((x) => Math.max(0, Math.min(15, Math.floor(Number(x) || 0)))))].slice(0, 4);
        const safe = pk.filter((x) => !bombs.has(x)).length;
        const hit = pk.length - safe > 0;
        return hit ? safe * 5 : safe * 10;
      });
      return { scores: sc, detail: "Minalar ochildi", reveal: { bombs: [...bombs], picks: subs.map((s) => s.picks ?? []) } };
    }
    default:
      return { scores: zero(), detail: "", reveal: {} };
  }
}

/** Vaqt tugasa — harakat yubormaganlar uchun eng past natija */
export function autoArena(def: ArenaDef): ArenaSub {
  switch (def.kind) {
    case "pick": return { value: ri(def.picks?.length ?? 2) };
    case "skill": return { value: 0 };
    case "tap": return { value: 0 };
    case "reaction": return { value: 9999 };
    case "tiles": {
      const of = def.tiles?.of ?? 16, k = def.tiles?.choose ?? 4;
      const s = new Set<number>(); while (s.size < k) s.add(ri(of));
      return { value: 0, picks: [...s] };
    }
    default: return { value: 0 };
  }
}

/** G'oliblar (eng yuqori ochko) indekslari */
export function arenaWinners(scores: number[]): number[] {
  const top = Math.max(...scores);
  return scores.map((s, i) => (s === top ? i : -1)).filter((i) => i >= 0);
}

/**
 * To'lov taqsimoti: g'olib hammasini oladi (komissiyadan keyin);
 * tenglik — teng bo'lganlarga teng bo'linadi; hamma teng bo'lsa — tikimlar to'liq qaytadi.
 */
export function arenaPayouts(stake: number, players: number, scores: number[], rake: number): { refund: boolean; amounts: number[] } {
  const w = arenaWinners(scores);
  if (w.length === players) return { refund: true, amounts: new Array(players).fill(stake) };
  const prize = Math.floor(stake * players * (1 - rake));
  const each = Math.floor(prize / w.length);
  return { refund: false, amounts: scores.map((_, i) => (w.includes(i) ? each : 0)) };
}
