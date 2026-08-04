import { useLang } from "@/lib/lang-context";
import type { Lang } from "@/lib/i18n";

type L3 = Record<Lang, string>;

/**
 * Qo'shimcha tarjimalar — i18n.ts da yo'q bo'lgan, kodda qattiq yozilgan
 * matnlar shu yerga yig'ildi. 3 til: uz / ru / en.
 */
export const U: Record<string, L3> = {
  // Umumiy
  theme: { uz: "Mavzu", ru: "Тема", en: "Theme" },
  theme_dark: { uz: "Ko'k tungi", ru: "Синяя ночь", en: "Blue night" },
  theme_light: { uz: "Yorug'", ru: "Светлая", en: "Light" },
  theme_black: { uz: "Qora", ru: "Чёрная", en: "Black" },
  promoCodes: { uz: "Promokodlar", ru: "Промокоды", en: "Promo codes" },
  apply: { uz: "QO'LLASH", ru: "ПРИМЕНИТЬ", en: "APPLY" },
  player: { uz: "O'yinchi", ru: "Игрок", en: "Player" },

  // Pastki menyu
  navHome: { uz: "Bosh sahifa", ru: "Главная", en: "Home" },
  navHistory: { uz: "Tarix", ru: "История", en: "History" },
  navPromo: { uz: "Promo", ru: "Промо", en: "Promo" },
  navChat: { uz: "Suhbat", ru: "Чат", en: "Chat" },
  navRules: { uz: "Qoidalar", ru: "Правила", en: "Rules" },

  // Natijalar / FX
  win: { uz: "YUTUQ", ru: "ВЫИГРЫШ", en: "WIN" },
  lose: { uz: "YUTQAZISH", ru: "ПРОИГРЫШ", en: "LOSS" },
  youWin: { uz: "YUTDINGIZ!", ru: "ВЫ ВЫИГРАЛИ!", en: "YOU WIN!" },
  youLose: { uz: "YUTQAZDINGIZ", ru: "ВЫ ПРОИГРАЛИ", en: "YOU LOSE" },
  bigWin: { uz: "KATTA YUTUQ!", ru: "БОЛЬШОЙ ВЫИГРЫШ!", en: "BIG WIN!" },
  result: { uz: "Natija", ru: "Результат", en: "Result" },
  multiplier: { uz: "Koeffitsiyent", ru: "Коэффициент", en: "Multiplier" },
  payout: { uz: "Yutuq", ru: "Выплата", en: "Payout" },
  noLuck: { uz: "Omad yo'q", ru: "Не повезло", en: "No luck" },
  boomLose: { uz: "Bomba! Yutqazdingiz", ru: "Бомба! Проигрыш", en: "Boom! You lose" },
  tapToClose: { uz: "Yopish uchun bosing", ru: "Нажмите, чтобы закрыть", en: "Tap to close" },

  // Tikish
  betMin: { uz: "Tikish miqdori (min 2 000)", ru: "Сумма ставки (мин 2 000)", en: "Bet amount (min 2,000)" },

  // Tarix
  historyTitle: { uz: "Tarix", ru: "История", en: "History" },
  historySub: {
    uz: "O'yin yutuqlari va pul yechishlar",
    ru: "Выигрыши в играх и выводы средств",
    en: "Game wins and withdrawals",
  },
  gamesTab: { uz: "O'yinlar", ru: "Игры", en: "Games" },
  staked: { uz: "Tikilgan", ru: "Ставка", en: "Staked" },
  calc: { uz: "Hisob", ru: "Расчёт", en: "Calc" },
  gameCol: { uz: "O'yin", ru: "Игра", en: "Game" },
  tabGames: { uz: "O'yinlar", ru: "Игры", en: "Games" },
  tabWithdrawals: { uz: "Pul yechish", ru: "Выводы", en: "Withdrawals" },
  all: { uz: "Hammasi", ru: "Все", en: "All" },
  loading: { uz: "Yuklanmoqda...", ru: "Загрузка...", en: "Loading..." },
  noHistory: { uz: "Hozircha tarix mavjud emas", ru: "История пока пуста", en: "No history yet" },
  stPaid: { uz: "To'landi", ru: "Выплачено", en: "Paid" },
  stRejected: { uz: "Rad etildi", ru: "Отклонено", en: "Rejected" },
  stPending: { uz: "Kutilmoqda", ru: "В ожидании", en: "Pending" },

  // Reyting
  topWinners: { uz: "Ko'p Yutganlar", ru: "Лучшие игроки", en: "Top winners" },

  // Spin
  wheelOfLuck: { uz: "OMAD CHARXI", ru: "КОЛЕСО УДАЧИ", en: "WHEEL OF FORTUNE" },
  unlucky: { uz: "Omadsiz", ru: "Не повезло", en: "Unlucky" },

  // Xatolar / holatlar
  networkError: { uz: "Tarmoq xatosi", ru: "Ошибка сети", en: "Network error" },
  tryAgain: {
    uz: "Xato yuz berdi. Qaytadan urinib ko'ring.",
    ru: "Произошла ошибка. Попробуйте снова.",
    en: "Something went wrong. Please try again.",
  },
  notEnough: { uz: "Balans yetarli emas!", ru: "Недостаточно средств!", en: "Not enough balance!" },

  // Depozit / yechish
  transferToCard: {
    uz: "Yuqoridagi kartaga pul o'tkazing",
    ru: "Переведите на карту выше",
    en: "Transfer to the card above",
  },
  adminConfirm: {
    uz: "Admin tasdiqlagach balans to'ldiriladi",
    ru: "Баланс пополнится после подтверждения админом",
    en: "Balance is credited after admin approval",
  },
  needDepositFirst: {
    uz: "Pul yechish uchun avval depozit qilishingiz kerak",
    ru: "Для вывода сначала нужно сделать депозит",
    en: "You must deposit before withdrawing",
  },
  enterCardNumber: { uz: "Karta raqamini kiriting", ru: "Введите номер карты", en: "Enter card number" },
  enterCardHolder: { uz: "Karta egasini kiriting", ru: "Введите владельца карты", en: "Enter card holder" },
  cardNumberLabel: { uz: "Karta raqami", ru: "Номер карты", en: "Card number" },
  cardHolderLabel: {
    uz: "Karta egasi (Ism Familiya)",
    ru: "Владелец карты (Имя Фамилия)",
    en: "Card holder (First Last)",
  },
  required: { uz: "Kerakli", ru: "Требуется", en: "Required" },
  wagerRule: {
    uz: "Yechish uchun depozit miqdorini 100% o'ynash kerak",
    ru: "Для вывода нужно проиграть 100% суммы депозита",
    en: "You must wager 100% of the deposit to withdraw",
  },
};

export function u(key: keyof typeof U, lang: Lang) {
  return U[key]?.[lang] ?? String(key);
}

/** Komponent ichida: const u = useU(); u("win") */
export function useU() {
  const { lang } = useLang();
  return (key: keyof typeof U) => u(key, lang);
}
