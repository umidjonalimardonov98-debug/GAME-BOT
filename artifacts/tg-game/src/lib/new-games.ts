import type { Lang } from "./i18n";

/** Har bir dvigatel — alohida o'yin mexanikasi. Hech biri takrorlanmaydi. */
export type Engine =
  | "mines"      // 5x5 maydon, minaga tushmasdan olmos ochish
  | "crash"      // ko'tarilayotgan koeffitsiyent, vaqtida chiqish
  | "sicbo"      // 3 ta zar — katta/kichik/juft
  | "roulette"   // raqamli ruletka + shar
  | "hilo"       // karta: keyingisi baland/past
  | "war"        // kazino urushi: bitta karta vs dilerniki
  | "plinko"     // shar tushishi, kataklar koeffitsiyenti
  | "keno"       // 40 raqamdan 6 tasini tanlash
  | "scratch"    // qirib ochiladigan 9 katak
  | "match3"     // 5x5 kaskad, 3 tadan mos kelishi
  | "bingo"      // 5x5 kartochka + 20 shar
  | "lotto"      // lotereya barabani, 6 shar
  | "memory"     // juftliklarni topish
  | "fishing"    // harakatlanuvchi nishonlarni urish
  | "wheel"      // raqamli g'ildirak
  | "reel"       // 5x3 baraban, chiziqlar
  | "race"       // poyga
  | "climb"      // minora bosqichlari
  | "board";     // nard / taxta

export type GameCfg = {
  key: string;
  path: string;
  engine: Engine;
  c1: string;
  c2: string;
  syms: string[];
  mult: number;
  n: number;
  tag: string;
  layer: "rays" | "stars" | "grid" | "bubbles" | "smoke";
  name: Record<Lang, string>;
};

const G = (
  key: string,
  engine: Engine,
  c1: string,
  c2: string,
  syms: string[],
  mult: number,
  n: number,
  layer: GameCfg["layer"],
  uz: string,
  ru: string,
  en: string,
): GameCfg => ({
  key, path: `/g/${key}`, engine, c1, c2, syms, mult, n,
  tag: `x${mult}`, layer, name: { uz, ru, en },
});

/** 35 ta yangi kazino o'yini — har biri boshqacha mexanika bilan */
export const NEW_GAMES: GameCfg[] = [
  /* ── MINA MAYDONI ── */
  G("minesfield",  "mines", "#ef4444", "#450a0a", ["gem", "bomb"], 1.35, 3, "grid",    "Mina Maydoni", "Минное Поле", "Mines Field"),
  G("diamondmine", "mines", "#22d3ee", "#0c4a6e", ["gem", "bomb"], 1.75, 5, "stars",   "Olmos Koni", "Алмазная Шахта", "Diamond Mine"),

  /* ── KRESH ── */
  G("rocketcrash", "crash", "#a855f7", "#0b1a2b", ["rocket"], 20, 0, "smoke",  "Raketa Kresh", "Ракета Краш", "Rocket Crash"),
  G("jetx",        "crash", "#38bdf8", "#0f172a", ["plane"],  30, 0, "grid",   "Jet X", "Джет Икс", "Jet X"),

  /* ── ZARLAR ── */
  G("sicbo",       "sicbo", "#f7c948", "#5b3a16", ["dice"], 3.6, 0, "rays",   "Sic Bo", "Сик Бо", "Sic Bo"),
  G("dicetriple",  "sicbo", "#ef4444", "#450a0a", ["dice"], 5.4, 0, "smoke",  "Zar Uchligi", "Тройной Кубик", "Triple Dice"),

  /* ── RULETKA ── */
  G("euroroulette","roulette", "#16a34a", "#052e16", ["chip"], 2.9, 0, "grid",  "Yevropa Ruletkasi", "Европейская Рулетка", "European Roulette"),
  G("goldroulette","roulette", "#f7c948", "#4a2c05", ["chip"], 3.2, 0, "rays",  "Oltin Ruletka", "Золотая Рулетка", "Gold Roulette"),

  /* ── KARTA: HI-LO ── */
  G("hilostreak",  "hilo", "#25a55a", "#14532d", ["cardback"], 1.75, 4, "bubbles", "Hi-Lo Seriya", "Хай-Лоу Серия", "Hi-Lo Streak"),
  G("kingsroad",   "hilo", "#f472b6", "#4a044e", ["crown"],    1.95, 5, "stars",   "Shoh Yo'li", "Дорога Королей", "King's Road"),

  /* ── KARTA: URUSH ── */
  G("casinowar",   "war", "#be123c", "#4c0519", ["cardback"], 2.0, 0, "rays",   "Kazino Urushi", "Казино Война", "Casino War"),
  G("dragoncard",  "war", "#dc2626", "#1c1917", ["dragon"],   2.4, 0, "smoke",  "Ajdar Kartasi", "Карта Дракона", "Dragon Card"),

  /* ── PLINKO ── */
  G("plinkogold",  "plinko", "#f7c948", "#78350f", ["coin"], 9, 8,  "rays",   "Oltin Plinko", "Золотой Плинко", "Gold Plinko"),
  G("plinkoneon",  "plinko", "#22d3ee", "#1e1b4b", ["gem"],  14, 10, "stars",  "Neon Plinko", "Неон Плинко", "Neon Plinko"),

  /* ── KENO ── */
  G("keno40",      "keno", "#f59e0b", "#7c2d12", ["ticket"], 8,  6, "grid",   "Keno 40", "Кено 40", "Keno 40"),
  G("turbokeno",   "keno", "#8b5cf6", "#312e81", ["ticket"], 12, 5, "smoke",  "Turbo Keno", "Турбо Кено", "Turbo Keno"),

  /* ── QIRIB OCHISH ── */
  G("silvercard",  "scratch", "#cbd5e1", "#334155", ["coin1", "gem", "star", "seven", "crown"], 7,  9, "grid",  "Kumush Kartochka", "Серебряная Карточка", "Silver Scratch"),
  G("goldcard",    "scratch", "#fbbf24", "#78350f", ["crown", "gem", "coin", "seven", "chest"], 11, 9, "rays",  "Oltin Kartochka", "Золотая Карточка", "Gold Scratch"),

  /* ── KASKAD ── */
  G("crystalblast","match3", "#22d3ee", "#0e2a47", ["gem", "star", "coin", "crown", "seven"], 10, 5, "stars",   "Kristall Portlash", "Кристальный Взрыв", "Crystal Blast"),
  G("royalcascade","match3", "#e11d48", "#4c0519", ["gem", "crown", "coin", "seven", "star"], 8, 5, "bubbles", "Shohona Kaskad", "Королевский Каскад", "Royal Cascade"),

  /* ── BINGO ── */
  G("bingo75",     "bingo", "#38bdf8", "#082f49", ["chip"], 9,  5, "grid",    "Bingo 75", "Бинго 75", "Bingo 75"),
  G("speedbingo",  "bingo", "#34d399", "#064e3b", ["chip"], 13, 5, "bubbles", "Tezkor Bingo", "Скоростное Бинго", "Speed Bingo"),

  /* ── LOTEREYA ── */
  G("lottodrum",   "lotto", "#f472b6", "#4c1d95", ["coin1"], 15, 6, "smoke",  "Lotereya Barabani", "Лотерейный Барабан", "Lotto Drum"),
  G("megalotto",   "lotto", "#f7c948", "#4a2c05", ["money"], 22, 6, "rays",   "Mega Lotto", "Мега Лото", "Mega Lotto"),

  /* ── XOTIRA ── */
  G("memorypairs", "memory", "#8b5cf6", "#2e1065", ["gem", "coin", "crown", "star", "chest", "bell"], 6, 6, "stars", "Xotira Juftlari", "Парная Память", "Memory Pairs"),
  G("secretpairs", "memory", "#0ea5e9", "#0c4a6e", ["chest", "gift", "trophy", "clover", "ticket", "medal-gold"], 8, 6, "smoke", "Sirli Juftlik", "Тайные Пары", "Secret Pairs"),

  /* ── OV ── */
  G("fishhunt",    "fishing", "#0ea5e9", "#082f49", ["target"], 6,  5, "bubbles", "Baliq Ovi", "Рыбалка", "Fish Hunt"),
  G("pearlhunt",   "fishing", "#a78bfa", "#1e1b4b", ["gem"],    9,  5, "stars",   "Marvarid Ovi", "Охота за Жемчугом", "Pearl Hunt"),

  /* ── RAQAMLI G'ILDIRAK ── */
  G("vipwheel",    "wheel", "#f7c948", "#b91c1c", ["wheel"], 6.5, 8,  "rays",  "VIP G'ildirak", "VIP Колесо", "VIP Wheel"),
  G("neonwheel",   "wheel", "#22d3ee", "#312e81", ["wheel"], 9,   10, "stars", "Neon G'ildirak", "Неоновое Колесо", "Neon Wheel"),

  /* ── 5x3 BARABAN ── */
  G("goldenpharaoh","reel", "#f7c948", "#b45309", ["crown", "gem", "coin", "seven", "star"], 12, 5, "rays",  "Oltin Fir'avn", "Золотой Фараон", "Golden Pharaoh"),
  G("diamondbonanza", "reel", "#db2777", "#4c1d95", ["gem", "chest", "money", "coin1", "trophy"], 14, 5, "bubbles", "Olmos Bonanza", "Алмазная Бонанза", "Diamond Bonanza"),

  /* ── POYGA ── */
  G("camelrace",   "race", "#f59e0b", "#451a03", ["target"], 5.6, 6, "smoke", "Tuya Poygasi", "Гонка Верблюдов", "Camel Race"),

  /* ── MINORA ── */
  G("goldtower",   "climb", "#f7c948", "#78350f", ["coin", "bomb"], 2.2, 6, "grid", "Oltin Minora", "Золотая Башня", "Gold Tower"),

  /* ── NARD ── */
  G("nardgold",    "board", "#fbbf24", "#78350f", ["dice"], 2.4, 12, "rays", "Oltin Nard", "Золотые Нарды", "Golden Backgammon"),
];

export const NEW_GAME_MAP: Record<string, GameCfg> = Object.fromEntries(
  NEW_GAMES.map((g) => [g.key, g]),
);

/* ─────────── Har bir o'yin uchun surat ─────────── */
const COVERS: Record<string, string> = {
  minesfield: "bomb", diamondmine: "diamond",
  rocketcrash: "rocketrace", jetx: "sky",
  sicbo: "nard", dicetriple: "nardgold",
  euroroulette: "wheelemerald", goldroulette: "wheelgold",
  hilostreak: "cardhunt", kingsroad: "silkroad",
  casinowar: "cardhunt", dragoncard: "dragon",
  plinkogold: "goldtower", plinkoneon: "neonvegas",
  keno40: "ticket", turbokeno: "doors",
  silvercard: "treasure", goldcard: "goldenapple",
  crystalblast: "diamond", royalcascade: "treasure",
  bingo75: "domino", speedbingo: "checkers",
  lottodrum: "gift", megalotto: "moneybags",
  memorypairs: "book", secretpairs: "pirate",
  fishhunt: "sky", pearlhunt: "gemladder",
  vipwheel: "wheelgold", neonwheel: "wheelneon",
  goldenpharaoh: "pharaoh", diamondbonanza: "diamond",
  camelrace: "camelrace", goldtower: "goldtower", nardgold: "nardgold",
};

/** o'yin muqovasi surati */
export function coverOf(key: string): string {
  const f = COVERS[key];
  return f ? `/games/new/${f}.jpg` : "";
}
