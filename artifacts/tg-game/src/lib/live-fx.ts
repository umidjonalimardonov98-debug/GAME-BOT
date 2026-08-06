/** LIVE arena — har bir o'yin uchun o'ziga mos jonli animatsiya */

const IMG: Record<string, string> = {
  coinflip: "lfx-pulse",
  rps: "lfx-tilt",
  dicebattle: "lfx-zoom",
  dragontiger: "lfx-panx",
  darts: "lfx-pulse",
  bowling: "lfx-panx",
  penalty: "lfx-sway",
  dragrace: "lfx-panx",
  minesrace: "lfx-zoom",
  towersduel: "lfx-pany",
  limboduel: "lfx-pany",
  slotbattle: "lfx-pany",
  wheelbattle: "lfx-zoom",
  crashduel: "lfx-sway",
  hilobattle: "lfx-tilt",
  memoryduel: "lfx-zoom",
  fastclick: "lfx-pulse",
  durak: "lfx-tilt",
  blackjack: "lfx-zoom",
  poker: "lfx-panx",
};

const SYM: Record<string, string> = {
  coinflip: "fx-spin",
  rps: "fx-wob",
  dicebattle: "fx-wob",
  dragontiger: "fx-beat",
  darts: "fx-beat",
  bowling: "fx-bob",
  penalty: "fx-fly",
  dragrace: "fx-fly",
  minesrace: "fx-beat",
  towersduel: "fx-bob",
  limboduel: "fx-fly",
  slotbattle: "fx-bob",
  wheelbattle: "fx-spin",
  crashduel: "fx-fly",
  hilobattle: "fx-bob",
  memoryduel: "fx-beat",
  fastclick: "fx-beat",
  durak: "fx-wob",
  blackjack: "fx-bob",
  poker: "fx-beat",
};

const IMG_POOL = ["lfx-zoom", "lfx-panx", "lfx-pany", "lfx-tilt", "lfx-sway", "lfx-pulse"];
const SYM_POOL = ["fx-spin", "fx-bob", "fx-wob", "fx-beat", "fx-fly"];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const imgFx = (key: string) => IMG[key] ?? IMG_POOL[hash(key) % IMG_POOL.length]!;
export const symFx = (key: string) => SYM[key] ?? SYM_POOL[hash(key) % SYM_POOL.length]!;
