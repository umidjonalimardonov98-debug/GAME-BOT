import type { Lang } from "./i18n";

export type Engine = "pick" | "reel" | "wheel" | "race" | "climb" | "board";

export type GameCfg = {
  key: string;
  path: string;
  engine: Engine;
  /** asosiy va ikkilamchi rang (fon, nur, animatsiya) */
  c1: string;
  c2: string;
  /** o'yin belgilari (public/symbols/*.png) */
  syms: string[];
  /** yutuq koeffitsiyenti */
  mult: number;
  /** pick: nechta variant, race: nechta ishtirokchi, climb: nechta bosqich */
  n: number;
  tag: string;
  /** orqa fon animatsiya turi */
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
  key,
  path: `/g/${key}`,
  engine,
  c1,
  c2,
  syms,
  mult,
  n,
  tag: `x${mult}`,
  layer,
  name: { uz, ru, en },
});

/** 24 ta yangi kazino o'yini — har biri o'z rangi, belgisi va animatsiyasi bilan */
export const NEW_GAMES: GameCfg[] = [
  G("goldenpharaoh", "reel",  "#f7c948", "#b45309", ["crown", "gem", "coin", "seven", "star"], 12,  3, "rays",    "Oltin Fir'avn", "Золотой Фараон", "Golden Pharaoh"),
  G("book",          "reel",  "#ca8a04", "#4c1d95", ["chest", "crown", "star", "gem", "coin"], 14,  3, "stars",   "Sirli Kitob", "Книга Тайн", "Book of Secrets"),
  G("fruitcocktail", "reel",  "#e11d48", "#f59e0b", ["cherry", "lemon", "orange", "grape", "melon"], 9, 3, "bubbles", "Meva Kokteyl", "Фруктовый Коктейль", "Fruit Cocktail"),
  G("crazymonkey",   "reel",  "#15803d", "#f59e0b", ["strawberry", "grape", "bell", "seven", "star"], 10, 3, "bubbles", "Aqlli Maymun", "Крейзи Манки", "Crazy Monkey"),
  G("resident",      "reel",  "#0f766e", "#111827", ["skull", "bomb", "gem", "seven", "coin"], 11, 3, "smoke",   "Rezident", "Резидент", "Resident"),
  G("sweetbonanza",  "reel",  "#db2777", "#7c3aed", ["cherry", "grape", "strawberry", "melon", "gem"], 13, 3, "bubbles", "Shirin Bonanza", "Сладкая Бонанза", "Sweet Bonanza"),
  G("hotluck",       "reel",  "#dc2626", "#f59e0b", ["seven", "bell", "cherry", "coin", "star"], 15, 3, "rays",    "Olovli Omad", "Горячая Удача", "Hot Luck"),
  G("diamondrush",   "reel",  "#22d3ee", "#1d4ed8", ["gem", "star", "coin", "crown", "seven"], 16, 3, "stars",   "Olmos Yugurishi", "Алмазная Гонка", "Diamond Rush"),

  G("treasurebox",   "pick",  "#f59e0b", "#7c2d12", ["chest"], 3.4, 4, "rays",    "Xazina Sandig'i", "Сундук Сокровищ", "Treasure Box"),
  G("luckygift",     "pick",  "#22c55e", "#065f46", ["gift"], 3.4, 4, "bubbles", "Omadli Sovg'a", "Счастливый Подарок", "Lucky Gift"),
  G("magicdoors",    "pick",  "#8b5cf6", "#312e81", ["question"], 2.6, 3, "smoke",  "Sehrli Eshiklar", "Волшебные Двери", "Magic Doors"),
  G("goldenegg",     "pick",  "#facc15", "#a16207", ["coin1"], 4.4, 5, "stars",   "Oltin Tuxum", "Золотое Яйцо", "Golden Egg"),
  G("piratechest",   "pick",  "#0ea5e9", "#0c4a6e", ["chest", "skull"], 5.2, 6, "smoke",  "Qaroqchi Sandig'i", "Пиратский Сундук", "Pirate Chest"),
  G("clovers",       "pick",  "#16a34a", "#14532d", ["clover"], 3.4, 4, "bubbles", "To'rtbarg", "Клевер", "Lucky Clovers"),
  G("cardhunt",      "pick",  "#be123c", "#4c0519", ["cardback"], 3.4, 4, "rays",   "Karta Ovi", "Охота за Картой", "Card Hunt"),
  G("bombsquad",     "pick",  "#ef4444", "#450a0a", ["bomb", "gem"], 2.6, 3, "grid", "Mina Guruhi", "Сапёр", "Bomb Squad"),

  G("vipwheel",      "wheel", "#f7c948", "#b91c1c", ["wheel"], 6.5, 8,  "rays",   "VIP G'ildirak", "VIP Колесо", "VIP Wheel"),
  G("neonwheel",     "wheel", "#22d3ee", "#7c3aed", ["wheel"], 8.5, 10, "stars",  "Neon G'ildirak", "Неоновое Колесо", "Neon Wheel"),
  G("megawheel",     "wheel", "#f472b6", "#4c1d95", ["wheel"], 11,  12, "rays",   "Mega G'ildirak", "Мега Колесо", "Mega Wheel"),

  G("dograce",       "race",  "#f59e0b", "#78350f", ["target"], 5.2, 6, "grid",   "It Poygasi", "Собачьи Бега", "Dog Race"),
  G("carrace",       "race",  "#ef4444", "#1e3a8a", ["rocket"], 4.4, 5, "grid",   "Avto Poyga", "Автогонки", "Car Race"),
  G("rocketrace",    "race",  "#a855f7", "#0b1a2b", ["rocket"], 6.2, 7, "smoke",  "Raketa Poygasi", "Гонка Ракет", "Rocket Race"),

  G("goldtower",     "climb", "#f7c948", "#78350f", ["coin", "bomb"], 2.2, 6, "grid",  "Oltin Minora", "Золотая Башня", "Gold Tower"),
  G("gemladder",     "climb", "#22d3ee", "#1e1b4b", ["gem", "skull"], 2.2, 6, "stars", "Olmos Narvon", "Алмазная Лестница", "Gem Ladder"),

  /* ─── NARD / TAXTA o'yinlari (zar bilan bosqichma-bosqich) ─── */
  G("nard",          "board", "#f7c948", "#5b3a16", ["dice"], 2.0, 12, "smoke",  "Nard", "Нарды", "Backgammon"),
  G("nardgold",      "board", "#fbbf24", "#78350f", ["dice"], 2.4, 12, "rays",   "Oltin Nard", "Золотые Нарды", "Golden Backgammon"),
  G("nardblitz",     "board", "#22d3ee", "#0f172a", ["dice"], 2.2, 12, "grid",   "Nard Blits", "Нарды Блиц", "Backgammon Blitz"),
  G("nardsultan",    "board", "#a855f7", "#2e1065", ["dice"], 2.6, 12, "stars",  "Sulton Nardi", "Нарды Султана", "Sultan's Backgammon"),
  G("dicewar",       "board", "#ef4444", "#450a0a", ["dice"], 2.3, 12, "smoke",  "Zar Jangi", "Битва Кубиков", "Dice War"),
  G("dominotable",   "board", "#e2e8f0", "#1f2937", ["chip"], 2.2, 12, "grid",   "Domino Stol", "Домино", "Domino Table"),
  G("checkers",      "board", "#16a34a", "#14532d", ["chip"], 2.1, 12, "bubbles","Shashka", "Шашки", "Checkers"),
  G("caravan",       "board", "#f59e0b", "#7c2d12", ["coin"], 2.5, 12, "smoke",  "Karvon Yo'li", "Путь Каравана", "Caravan Road"),

  /* ─── OLMA uslubidagi tanlov o'yinlari ─── */
  G("appleking",     "pick",  "#22c55e", "#14532d", ["apple", "bomb"], 3.0, 4, "bubbles","Olma Shohi", "Король Яблок", "Apple King"),
  G("appletree",     "pick",  "#84cc16", "#1a2e05", ["apple", "skull"], 4.0, 5, "rays",  "Olma Daraxti", "Яблоня", "Apple Tree"),
  G("goldenapple",   "pick",  "#facc15", "#713f12", ["apple", "bomb"], 5.0, 6, "stars", "Oltin Olma", "Золотое Яблоко", "Golden Apple"),
  G("dragoncave",    "pick",  "#dc2626", "#1c1917", ["dragon", "gem"], 4.2, 5, "smoke", "Ajdar G'ori", "Пещера Дракона", "Dragon Cave"),
  G("tigerluck",     "pick",  "#f97316", "#431407", ["tiger", "coin"], 3.6, 4, "rays",  "Yo'lbars Omadi", "Удача Тигра", "Tiger Luck"),
  G("tickethunt",    "pick",  "#38bdf8", "#082f49", ["ticket"], 3.2, 4, "grid",  "Chipta Ovi", "Охота за Билетом", "Ticket Hunt"),
  G("trophyroom",    "pick",  "#fbbf24", "#3f2d00", ["trophy"], 4.6, 5, "stars", "Kubok Xonasi", "Зал Трофеев", "Trophy Room"),
  G("moneybags",     "pick",  "#10b981", "#022c22", ["money"], 3.4, 4, "bubbles","Pul Qoplari", "Мешки Денег", "Money Bags"),

  /* ─── Yangi barabanlar ─── */
  G("emirslots",     "reel",  "#f7c948", "#6b3f0c", ["crown", "coin", "gem", "star", "seven"], 10, 3, "rays",   "Amir Slotlari", "Слоты Эмира", "Emir Slots"),
  G("silkroad",      "reel",  "#f472b6", "#4a044e", ["gem", "coin1", "chest", "star", "crown"], 11, 3, "smoke", "Ipak Yo'li", "Шёлковый Путь", "Silk Road"),
  G("neonvegas",     "reel",  "#22d3ee", "#111827", ["seven", "bell", "star", "coin", "gem"], 12, 3, "stars",  "Neon Vegas", "Неон Вегас", "Neon Vegas"),
  G("melonparty",    "reel",  "#4ade80", "#14532d", ["melon", "grape", "lemon", "orange", "cherry"], 8, 3, "bubbles", "Qovun Bazmi", "Дынная Вечеринка", "Melon Party"),
  G("skytreasure",   "reel",  "#60a5fa", "#0b1a2b", ["plane", "coin", "gem", "star", "crown"], 9, 3, "grid",   "Osmon Xazinasi", "Небесное Сокровище", "Sky Treasure"),
  G("bellfever",     "reel",  "#fb7185", "#4c0519", ["bell", "seven", "coin", "cherry", "star"], 10, 3, "rays", "Qo'ng'iroq Isitmasi", "Колокольная Лихорадка", "Bell Fever"),

  /* ─── Yangi g'ildiraklar ─── */
  G("sultanwheel",   "wheel", "#fbbf24", "#7c2d12", ["wheel"], 7.5, 9,  "rays",  "Sulton G'ildiragi", "Колесо Султана", "Sultan Wheel"),
  G("emeraldwheel",  "wheel", "#34d399", "#064e3b", ["wheel"], 9.5, 11, "bubbles","Zumrad G'ildirak", "Изумрудное Колесо", "Emerald Wheel"),

  /* ─── Yangi poygalar ─── */
  G("camelrace",     "race",  "#f59e0b", "#451a03", ["target"], 5.6, 6, "smoke", "Tuya Poygasi", "Гонка Верблюдов", "Camel Race"),
  G("dronerace",     "race",  "#38bdf8", "#0f172a", ["rocket"], 6.8, 8, "grid",  "Dron Poygasi", "Гонка Дронов", "Drone Race"),

  /* ─── Yangi minoralar ─── */
  G("sandtower",     "climb", "#f59e0b", "#78350f", ["coin", "bomb"], 2.3, 7, "smoke", "Qum Minorasi", "Песчаная Башня", "Sand Tower"),
  G("skyladder",     "climb", "#a78bfa", "#1e1b4b", ["gem", "skull"], 2.4, 7, "stars", "Osmon Narvoni", "Небесная Лестница", "Sky Ladder"),
];

export const NEW_GAME_MAP: Record<string, GameCfg> = Object.fromEntries(
  NEW_GAMES.map((g) => [g.key, g]),
);

/* ─────────── Har bir o'yin uchun haqiqiy surat (public/games/new/*.jpg) ─────────── */
const COVERS: Record<string, string> = {
  goldenpharaoh: "pharaoh", book: "book", fruitcocktail: "fruit", crazymonkey: "jungle",
  resident: "resident", sweetbonanza: "candy", hotluck: "hot777", diamondrush: "diamond",
  treasurebox: "treasure", luckygift: "gift", magicdoors: "doors", goldenegg: "egg",
  piratechest: "pirate", clovers: "clover", cardhunt: "cardhunt", bombsquad: "bomb",
  vipwheel: "wheelgold", neonwheel: "wheelneon", megawheel: "wheelgold",
  dograce: "dograce", carrace: "carrace", rocketrace: "rocketrace",
  goldtower: "goldtower", gemladder: "gemladder",
  nard: "nard", nardgold: "nardgold", nardblitz: "nard", nardsultan: "nardgold",
  dicewar: "nard", dominotable: "domino", checkers: "checkers", caravan: "caravan",
  appleking: "apple", appletree: "apple", goldenapple: "goldenapple",
  dragoncave: "dragon", tigerluck: "tiger", tickethunt: "ticket",
  trophyroom: "trophy", moneybags: "moneybags",
  emirslots: "pharaoh", silkroad: "silkroad", neonvegas: "neonvegas",
  melonparty: "melon", skytreasure: "sky", bellfever: "bell",
  sultanwheel: "wheelgold", emeraldwheel: "wheelemerald",
  camelrace: "camelrace", dronerace: "dronerace",
  sandtower: "sandtower", skyladder: "gemladder",
};

/** o'yin muqovasi surati (bosh sahifa katakchasi va o'yin foni uchun) */
export function coverOf(key: string): string {
  const f = COVERS[key];
  return f ? `/games/new/${f}.jpg` : "";
}
