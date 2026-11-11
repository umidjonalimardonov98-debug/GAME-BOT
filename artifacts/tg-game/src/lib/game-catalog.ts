import { NEW_GAMES, coverOf } from "./new-games";
export const GAMES = [
  { key: "apple",       path: "/apple",       img: "/games/apple.jpg",       tag: "HOT",   tagColor: "#ef4444", bg: "linear-gradient(145deg,#064e3b,#1a7d43)", glow: "#1a7d4355" },
  { key: "dice",        path: "/dice",        img: "/games/dice.jpg",        tag: "x5.8",  tagColor: "#f59e0b", bg: "linear-gradient(145deg,#78350f,#d97706)", glow: "#d9770655" },
  { key: "aviator",     path: "/aviator",     img: "/games/aviator.jpg",     tag: "∞x",    tagColor: "#5aa2f0", bg: "linear-gradient(145deg,#0b1a2b,#7a0c16)", glow: "#7a0c1655" },
  { key: "spin",        path: "/spin",        img: "/games/spin.jpg",        tag: "FREE",  tagColor: "#34d399", bg: "linear-gradient(145deg,#7a0c16,#b3121f)", glow: "#b3121f55" },
  { key: "blackjack",   path: "/blackjack",   img: "/games/blackjack.jpg",   tag: "x2.5",  tagColor: "#2dd4bf", bg: "linear-gradient(145deg,#134e4a,#0d9488)", glow: "#0d948855" },
  { key: "slots",       path: "/slots",       img: "/games/slots.jpg",       tag: "x10",   tagColor: "#f0abfc", bg: "linear-gradient(145deg,#4f0810,#b3121f)", glow: "#b3121f55" },
  { key: "parity",      path: "/parity",      img: "/games/parity.jpg",      tag: "50/50", tagColor: "#7dd3fc", bg: "linear-gradient(145deg,#0c4a6e,#0284c7)", glow: "#0284c755" },
  { key: "mines",       path: "/mines",       img: "/games/mines.jpg",       tag: "x24",   tagColor: "#f87171", bg: "linear-gradient(145deg,#7f1d1d,#dc2626)", glow: "#dc262655" },
  { key: "roulette",    path: "/roulette",    img: "/games/roulette.jpg",    tag: "x36",   tagColor: "#fcd34d", bg: "linear-gradient(145deg,#78350f,#b45309)", glow: "#b4530955" },
  { key: "plinko",      path: "/plinko",      img: "/games/plinko.jpg",      tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#312e81,#b3121f)", glow: "#b3121f55" },
  { key: "towers",      path: "/towers",      img: "/games/towers.jpg",      tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#164e63,#0891b2)", glow: "#0891b255" },
  { key: "limbo",       path: "/limbo",       img: "/games/limbo.jpg",       tag: "x100",  tagColor: "#78b6ff", bg: "linear-gradient(145deg,#4f0810,#e5484d)", glow: "#e5484d55" },
  { key: "keno",        path: "/keno",        img: "/games/keno.jpg",        tag: "x60",   tagColor: "#fbbf24", bg: "linear-gradient(145deg,#7c2d12,#ea580c)", glow: "#ea580c55" },
  { key: "hilo",        path: "/hilo",        img: "/games/hilo.jpg",        tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#14532d,#25a55a)", glow: "#25a55a55" },
  { key: "coinflip",    path: "/coinflip",    img: "/games/coinflip.jpg",    tag: "x1.9",  tagColor: "#fcd34d", bg: "linear-gradient(145deg,#713f12,#ca8a04)", glow: "#ca8a0455" },
  { key: "baccarat",    path: "/baccarat",    img: "/games/baccarat.jpg",    tag: "x8",    tagColor: "#f472b6", bg: "linear-gradient(145deg,#4c0519,#be123c)", glow: "#be123c55" },
  { key: "case",        path: "/case",        img: "/games/case.jpg",        tag: "x25",   tagColor: "#22d3ee", bg: "linear-gradient(145deg,#083344,#0e7490)", glow: "#0e749055" },
  { key: "scratch",     path: "/scratch",     img: "/games/scratch.jpg",     tag: "x10",   tagColor: "#fda4af", bg: "linear-gradient(145deg,#500724,#9d174d)", glow: "#9d174d55" },
  { key: "dragontiger", path: "/dragontiger", img: "/games/dragontiger.jpg", tag: "x9",    tagColor: "#fb923c", bg: "linear-gradient(145deg,#450a0a,#b91c1c)", glow: "#b91c1c55" },
  { key: "rps",         path: "/rps",         img: "/games/rps.jpg",         tag: "x1.9",  tagColor: "#93c5fd", bg: "linear-gradient(145deg,#1e3a8a,#2563eb)", glow: "#2563eb55" },
  { key: "thimbles",    path: "/thimbles",    img: "/games/thimbles.jpg",    tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#7f1d1d,#dc2626)", glow: "#dc262655" },
  { key: "luckycard",   path: "/luckycard",   img: "/games/luckycard.jpg",   tag: "x3.5",  tagColor: "#fcd34d", bg: "linear-gradient(145deg,#0b1f3d,#123a6b)", glow: "#123a6b55" },
  { key: "hands",       path: "/hands",       img: "/games/hands.jpg",       tag: "NEW",   tagColor: "#39c46f", bg: "linear-gradient(145deg,#713f12,#ca8a04)", glow: "#ca8a0455" },
  { key: "fruitblast",  path: "/fruitblast",  img: "/games/fruitblast.jpg",  tag: "x2.9",  tagColor: "#f472b6", bg: "linear-gradient(145deg,#500724,#be123c)", glow: "#be123c55" },
  { key: "derby",       path: "/derby",       img: "/games/derby.jpg",       tag: "x12",  tagColor: "#34d399", bg: "linear-gradient(145deg,#064e3b,#059669)", glow: "#05966955" },
  { key: "moneywheel",  path: "/moneywheel",  img: "/games/moneywheel.jpg",  tag: "x40",   tagColor: "#fbbf24", bg: "linear-gradient(145deg,#7a0c16,#b3121f)", glow: "#b3121f55" },
  ...NEW_GAMES.map((g) => ({
    key: g.key,
    path: g.path,
    img: coverOf(g.key),
    sym: g.syms[0],
    tag: g.tag,
    tagColor: g.c1,
    bg: `linear-gradient(145deg,${g.c2},${g.c1})`,
    glow: `${g.c1}55`,
  })),
];


/* ─── O'yin bo'limlari ─── */
export const CATS: { id: string; uz: string; ru: string; en: string; keys: string[] }[] = [
  { id: "top",    uz: "Mashhur",          ru: "Популярные",      en: "Popular",         keys: ["apple","aviator","mines","slots","roulette","dice","plinko","spin"] },
  { id: "crash",  uz: "Kresh va tezkor",  ru: "Краш и быстрые",  en: "Crash & Instant", keys: ["aviator","limbo","rocketcrash","jetx","coinflip","rps","parity","hands","thimbles"] },
  { id: "cards",  uz: "Karta o'yinlari",  ru: "Карточные",       en: "Card games",      keys: ["blackjack","baccarat","hilo","dragontiger","luckycard","hilostreak","kingsroad","casinowar","dragoncard"] },
  { id: "table",  uz: "Ruletka va zar",   ru: "Рулетка и кости", en: "Roulette & Dice", keys: ["roulette","dice","moneywheel","euroroulette","goldroulette","sicbo","dicetriple","vipwheel","neonwheel","nardgold"] },
  { id: "slots",  uz: "Slotlar",          ru: "Слоты",           en: "Slots",           keys: ["slots","fruitblast","goldenpharaoh","diamondbonanza","crystalblast","royalcascade"] },
  { id: "risk",   uz: "Mina va minora",   ru: "Мины и башни",    en: "Mines & Towers",  keys: ["mines","towers","minesfield","diamondmine","goldtower","plinko","plinkogold","plinkoneon"] },
  { id: "lotto",  uz: "Lotereya va keno", ru: "Лотерея и кено",  en: "Lottery & Keno",  keys: ["keno","scratch","case","keno40","turbokeno","silvercard","goldcard","bingo75","speedbingo","lottodrum","megalotto"] },
  { id: "arcade", uz: "Arkada",           ru: "Аркада",          en: "Arcade",          keys: ["derby","camelrace","fishhunt","pearlhunt","memorypairs","secretpairs"] },
];


export const LIVE_GAMES = [
  { key: "pvp-durak", path: "/pvp", img: "/games/pvpdurak.jpg", name: "Durak" },
  { key: "pvp-blackjack", path: "/pvp-blackjack", img: "/games/blackjack.jpg", name: "LIVE Blackjack" },
  { key: "pvp-poker", path: "/pvp-poker", img: "/games/pvppoker.jpg", name: "LIVE Poker" },
];
