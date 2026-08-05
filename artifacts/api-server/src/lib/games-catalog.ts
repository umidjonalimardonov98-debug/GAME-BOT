/**
 * Bot va WebApp o'rtasida bir xil bo'lishi shart bo'lgan o'yin kalitlari ro'yxati.
 * Har bir "key" artifacts/tg-game/src/pages/Home.tsx (GAMES) yoki
 * artifacts/tg-game/src/lib/new-games.ts (NEW_GAMES) dagi kalitga mos kelishi kerak.
 */
export type GameCatalogEntry = { key: string; label: string };

/** Home.tsx dagi 26 ta asosiy o'yin */
export const MAIN_GAMES: GameCatalogEntry[] = [
  { key: "apple", label: "🍎 Olma" },
  { key: "dice", label: "🎲 Zar" },
  { key: "aviator", label: "✈️ Aviator" },
  { key: "spin", label: "🎡 Spin" },
  { key: "blackjack", label: "🃏 Blackjack" },
  { key: "slots", label: "🎰 Slot" },
  { key: "parity", label: "🔢 Toq-Juft" },
  { key: "mines", label: "💣 Mines" },
  { key: "roulette", label: "🎡 Ruletka" },
  { key: "plinko", label: "🟣 Plinko" },
  { key: "towers", label: "🏰 Towers" },
  { key: "limbo", label: "📈 Limbo" },
  { key: "keno", label: "🔢 Keno" },
  { key: "hilo", label: "🔼 Hi-Lo" },
  { key: "coinflip", label: "🪙 Coinflip" },
  { key: "baccarat", label: "🎴 Baccarat" },
  { key: "case", label: "📦 Case Open" },
  { key: "scratch", label: "🎫 Scratch" },
  { key: "dragontiger", label: "🐉 Dragon Tiger" },
  { key: "rps", label: "✂️ Tosh-Qaychi-Qog'oz" },
  { key: "thimbles", label: "🥤 Naperstok" },
  { key: "luckycard", label: "🃏 Lucky Card" },
  { key: "hands", label: "✋ Qo'lni top" },
  { key: "fruitblast", label: "🍉 Fruit Blast" },
  { key: "derby", label: "🐎 Derby" },
  { key: "moneywheel", label: "🎡 Money Wheel" },
];

/** new-games.ts dagi 35 ta qo'shimcha o'yin */
export const EXTRA_GAMES: GameCatalogEntry[] = [
  { key: "minesfield", label: "💣 Mina Maydoni" },
  { key: "diamondmine", label: "💎 Olmos Koni" },
  { key: "rocketcrash", label: "🚀 Raketa Kresh" },
  { key: "jetx", label: "🛩 Jet X" },
  { key: "sicbo", label: "🎲 Sic Bo" },
  { key: "dicetriple", label: "🎲 Zar Uchligi" },
  { key: "euroroulette", label: "🎡 Yevropa Ruletkasi" },
  { key: "goldroulette", label: "🎡 Oltin Ruletka" },
  { key: "hilostreak", label: "🔼 Hi-Lo Seriya" },
  { key: "kingsroad", label: "👑 Shoh Yo'li" },
  { key: "casinowar", label: "⚔️ Kazino Urushi" },
  { key: "dragoncard", label: "🐲 Ajdar Kartasi" },
  { key: "plinkogold", label: "🟡 Oltin Plinko" },
  { key: "plinkoneon", label: "🟣 Neon Plinko" },
  { key: "keno40", label: "🔢 Keno 40" },
  { key: "turbokeno", label: "🔢 Turbo Keno" },
  { key: "silvercard", label: "🎫 Kumush Kartochka" },
  { key: "goldcard", label: "🎫 Oltin Kartochka" },
  { key: "crystalblast", label: "💎 Kristall Portlash" },
  { key: "royalcascade", label: "👑 Shohona Kaskad" },
  { key: "bingo75", label: "🔢 Bingo 75" },
  { key: "speedbingo", label: "🔢 Tezkor Bingo" },
  { key: "lottodrum", label: "🎟 Lotereya Barabani" },
  { key: "megalotto", label: "🎟 Mega Lotto" },
  { key: "memorypairs", label: "🧠 Xotira Juftlari" },
  { key: "secretpairs", label: "🧠 Sirli Juftlik" },
  { key: "fishhunt", label: "🎣 Baliq Ovi" },
  { key: "pearlhunt", label: "🎣 Marvarid Ovi" },
  { key: "vipwheel", label: "🎡 VIP G'ildirak" },
  { key: "neonwheel", label: "🎡 Neon G'ildirak" },
  { key: "goldenpharaoh", label: "🎰 Oltin Fir'avn" },
  { key: "diamondbonanza", label: "🎰 Olmos Bonanza" },
  { key: "camelrace", label: "🐫 Tuya Poygasi" },
  { key: "goldtower", label: "🏰 Oltin Minora" },
  { key: "nardgold", label: "🎲 Oltin Nard" },
];

export const ALL_GAMES: GameCatalogEntry[] = [...MAIN_GAMES, ...EXTRA_GAMES];

export const GAME_LABELS: Record<string, string> = Object.fromEntries(
  ALL_GAMES.map((g) => [g.key, g.label]),
);

export const DIFFICULTIES = ["oson", "o'rta", "qiyin", "juda qiyin"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Har bir qiyinlik darajasi taklif qiladigan yutish foizi (win %) */
export const DIFFICULTY_WIN_SUGGEST: Record<Difficulty, number> = {
  "oson": 45,
  "o'rta": 30,
  "qiyin": 18,
  "juda qiyin": 8,
};

export function nextDifficulty(d: string | null | undefined): Difficulty {
  const idx = DIFFICULTIES.indexOf((d as Difficulty) ?? "o'rta");
  return DIFFICULTIES[(idx + 1) % DIFFICULTIES.length] ?? "o'rta";
}

/* ── DB o'z-o'zini yangilashi (self-migration) ──────────────────────────
 * drizzle-kit push-force startupda ishlaydi, lekin muvaffaqiyatsiz bo'lsa ham
 * bot ishlashda davom etishi uchun qo'shimcha ALTER TABLE bilan ustunlarni
 * xavfsiz tarzda qo'shib qo'yamiz. */
export async function ensureGameSettingsColumns(db: { execute: (q: any) => Promise<unknown> }, sql: any) {
  try {
    await db.execute(sql`ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS refund_chance integer NOT NULL DEFAULT 6`);
    await db.execute(sql`ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'o''rta'`);
    await db.execute(sql`ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS multiplier integer NOT NULL DEFAULT 100`);
    await db.execute(sql`ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS max_win integer`);
  } catch {
    // push-force allaqachon bajargan yoki jadval mavjud emas — e'tiborsiz qoldiramiz
  }
}
