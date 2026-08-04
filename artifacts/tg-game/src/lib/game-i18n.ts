import type { Lang } from "./i18n";

type L3 = Record<Lang, string>;

export const G = {
  play:      { uz: "O'YNASH",        ru: "ИГРАТЬ",        en: "PLAY" } as L3,
  cashout:   { uz: "CHIQARISH",      ru: "ЗАБРАТЬ",       en: "CASH OUT" } as L3,
  again:     { uz: "QAYTA O'YNASH",  ru: "ЕЩЁ РАЗ",       en: "PLAY AGAIN" } as L3,
  win:       { uz: "YUTDINGIZ! 🎉",  ru: "ВЫИГРЫШ! 🎉",   en: "YOU WIN! 🎉" } as L3,
  lose:      { uz: "YUTQAZDINGIZ 😔", ru: "ПРОИГРЫШ 😔",  en: "YOU LOSE 😔" } as L3,
  choose:    { uz: "TANLANG",        ru: "ВЫБЕРИТЕ",      en: "CHOOSE" } as L3,
  result:    { uz: "Natija",         ru: "Результат",     en: "Result" } as L3,
  target:    { uz: "Maqsad koeff.",  ru: "Целевой коэф.", en: "Target multiplier" } as L3,
  risk:      { uz: "Xavf darajasi",  ru: "Уровень риска", en: "Risk level" } as L3,
  low:       { uz: "Past",           ru: "Низкий",        en: "Low" } as L3,
  mid:       { uz: "O'rta",          ru: "Средний",       en: "Medium" } as L3,
  high:      { uz: "Yuqori",         ru: "Высокий",       en: "High" } as L3,
  level:     { uz: "Bosqich",        ru: "Уровень",       en: "Level" } as L3,
  higher:    { uz: "KATTA ⬆️",        ru: "БОЛЬШЕ ⬆️",      en: "HIGHER ⬆️" } as L3,
  lower:     { uz: "KICHIK ⬇️",       ru: "МЕНЬШЕ ⬇️",      en: "LOWER ⬇️" } as L3,
  heads:     { uz: "GERB",           ru: "ОРЁЛ",          en: "HEADS" } as L3,
  tails:     { uz: "RAQAM",          ru: "РЕШКА",         en: "TAILS" } as L3,
  player:    { uz: "O'YINCHI",       ru: "ИГРОК",         en: "PLAYER" } as L3,
  banker:    { uz: "BANKIR",         ru: "БАНКИР",        en: "BANKER" } as L3,
  tie:       { uz: "DURRANG",        ru: "НИЧЬЯ",         en: "TIE" } as L3,
  dragon:    { uz: "AJDARHO",        ru: "ДРАКОН",        en: "DRAGON" } as L3,
  tiger:     { uz: "YO'LBARS",       ru: "ТИГР",          en: "TIGER" } as L3,
  rock:      { uz: "TOSH",           ru: "КАМЕНЬ",        en: "ROCK" } as L3,
  paper:     { uz: "QOG'OZ",         ru: "БУМАГА",        en: "PAPER" } as L3,
  scissors:  { uz: "QAYCHI",         ru: "НОЖНИЦЫ",       en: "SCISSORS" } as L3,
  pickNums:  { uz: "5 ta raqam tanlang", ru: "Выберите 5 чисел", en: "Pick 5 numbers" } as L3,
  scratchIt: { uz: "Kataklarni oching", ru: "Откройте ячейки", en: "Scratch the cells" } as L3,
  openCase:  { uz: "KEYSNI OCHISH",  ru: "ОТКРЫТЬ КЕЙС",  en: "OPEN CASE" } as L3,
  matched:   { uz: "Mos kelgan",     ru: "Совпало",       en: "Matched" } as L3,
  noBalance: { uz: "Balans yetarli emas", ru: "Недостаточно средств", en: "Not enough balance" } as L3,
};

export function g(key: keyof typeof G, lang: Lang) {
  return G[key][lang];
}

/** 20 ta o'yin nomi — 3 tilda */
export const GAME_NAMES: Record<string, L3> = {
  apple:      { uz: "Olma Omadi", ru: "Яблоко Удачи", en: "Apple of Fortune" },
  dice:       { uz: "Zar", ru: "Кости", en: "Dice" },
  aviator:    { uz: "Aviator", ru: "Авиатор", en: "Aviator" },
  spin:       { uz: "Aylanadur", ru: "Колесо", en: "Spin Wheel" },
  blackjack:  { uz: "Blackjack", ru: "Блэкджек", en: "Blackjack" },
  slots:      { uz: "Slot", ru: "Слоты", en: "Slots" },
  parity:     { uz: "Toq-Juft", ru: "Чёт-Нечет", en: "Odd-Even" },
  mines:      { uz: "Minalar", ru: "Мины", en: "Mines" },
  roulette:   { uz: "Ruletka", ru: "Рулетка", en: "Roulette" },
  plinko:     { uz: "Plinko", ru: "Плинко", en: "Plinko" },
  towers:     { uz: "Minoralar", ru: "Башни", en: "Towers" },
  limbo:      { uz: "Limbo", ru: "Лимбо", en: "Limbo" },
  keno:       { uz: "Keno", ru: "Кено", en: "Keno" },
  hilo:       { uz: "Hi-Lo", ru: "Хай-Лоу", en: "Hi-Lo" },
  coinflip:   { uz: "Tanga", ru: "Монетка", en: "Coin Flip" },
  baccarat:   { uz: "Bakkara", ru: "Баккара", en: "Baccarat" },
  case:       { uz: "Keys Ochish", ru: "Открытие кейса", en: "Case Opening" },
  scratch:    { uz: "Chizib Ochish", ru: "Скретч-карта", en: "Scratch Card" },
  dragontiger:{ uz: "Ajdar-Yo'lbars", ru: "Дракон-Тигр", en: "Dragon Tiger" },
  rps:        { uz: "Tosh-Qaychi", ru: "Камень-Ножницы", en: "Rock-Paper-Scissors" },
};
