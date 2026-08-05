import type { Lang } from "./i18n";

export type Engine = "pick" | "reel" | "wheel" | "race" | "climb";

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
];

export const NEW_GAME_MAP: Record<string, GameCfg> = Object.fromEntries(
  NEW_GAMES.map((g) => [g.key, g]),
);
