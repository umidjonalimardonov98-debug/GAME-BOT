import { useLang } from "@/lib/lang-context";
import type { Lang } from "@/lib/i18n";

type L3 = Record<Lang, string>;

/**
 * Qo'shimcha tarjimalar — i18n.ts da yo'q bo'lgan, kodda qattiq yozilgan
 * matnlar shu yerga yig'ildi. 3 til: uz / ru / en.
 */
export const U: Record<string, L3> = {
  // Bosh sahifa / brend
  freeGame: { uz: "Tekin o'yin", ru: "Бесплатная игра", en: "Free game" },
  freeSpinHint: {
    uz: "Har 24 soatda 1 marta tekin aylantirish",
    ru: "Один бесплатный спин каждые 24 часа",
    en: "One free spin every 24 hours",
  },
  withdrawShort: { uz: "Pul yechish", ru: "Вывод", en: "Withdraw" },
  brandTagline: {
    uz: "27 o'yin · tez to'lov · 24/7 qo'llab-quvvatlash",
    ru: "27 игр · быстрые выплаты · поддержка 24/7",
    en: "27 games · fast payouts · 24/7 support",
  },
  openChannel: { uz: "KANAL", ru: "КАНАЛ", en: "CHANNEL" },
  playResponsibly: {
    uz: "Mas'uliyat bilan o'ynang",
    ru: "Играйте ответственно",
    en: "Play responsibly",
  },

  // Jonli suhbat
  liveChat: { uz: "Jonli suhbat", ru: "Живой чат", en: "Live chat" },
  liveChatSub: { uz: "Admin bilan to'g'ridan-to'g'ri", ru: "Напрямую с админом", en: "Directly with an admin" },
  callAdmin: { uz: "ADMINNI CHAQIRISH", ru: "ВЫЗВАТЬ АДМИНА", en: "CALL ADMIN" },
  chatActive: { uz: "SUHBAT FAOL", ru: "ЧАТ АКТИВЕН", en: "CHAT ACTIVE" },
  chatPending: { uz: "ADMIN TASDIQLASHI KUTILMOQDA", ru: "ОЖИДАНИЕ АДМИНА", en: "WAITING FOR ADMIN" },
  chatClosed: { uz: "SUHBAT YOPIQ", ru: "ЧАТ ЗАКРЫТ", en: "CHAT CLOSED" },
  sending: { uz: "YUBORILMOQDA...", ru: "ОТПРАВКА...", en: "SENDING..." },
  openInBot: { uz: "Chatni ochish (bot)", ru: "Открыть чат (бот)", en: "Open chat (bot)" },
  chatWithAdmin: { uz: "Admin bilan jonli chat", ru: "Живой чат с админом", en: "Live chat with admin" },
  chatDesc: {
    uz: "Tugmani bosing — adminlarga so'rov boradi. Tasdiqlangach matn va ovozli xabar yuborishingiz mumkin.",
    ru: "Нажмите кнопку — админам уйдёт запрос. После подтверждения можно отправлять текст и голосовые.",
    en: "Tap the button — admins get a request. Once approved you can send text and voice messages.",
  },
  chatYou: { uz: "Siz", ru: "Вы", en: "You" },
  chatAdmin: { uz: "Admin", ru: "Админ", en: "Admin" },
  chatEmpty: { uz: "Hozircha xabar yo'q", ru: "Сообщений пока нет", en: "No messages yet" },
  chatInput: { uz: "Xabar yozing...", ru: "Напишите сообщение...", en: "Type a message..." },
  chatInactive: { uz: "Suhbat faol emas", ru: "Чат не активен", en: "Chat is not active" },
  chatConvo: { uz: "SUHBAT — SIZ VA ADMIN", ru: "ЧАТ — ВЫ И АДМИН", en: "CHAT — YOU AND ADMIN" },
  howItWorks: { uz: "QANDAY ISHLAYDI", ru: "КАК ЭТО РАБОТАЕТ", en: "HOW IT WORKS" },
  recording: { uz: "Yozib olinmoqda", ru: "Идёт запись", en: "Recording" },
  holdToRecord: { uz: "Ovozli xabar yozish", ru: "Записать голосовое", en: "Record a voice message" },
  micDenied: { uz: "Mikrofonga ruxsat berilmadi", ru: "Доступ к микрофону запрещён", en: "Microphone access denied" },
  voiceSent: { uz: "Ovozli xabar yuborildi", ru: "Голосовое отправлено", en: "Voice message sent" },
  endChatHint: {
    uz: "Suhbatni tugatish uchun botda /end yozing.",
    ru: "Чтобы завершить чат, напишите /end в боте.",
    en: "Send /end in the bot to close the chat.",
  },
  step1t: { uz: "Adminni chaqirasiz", ru: "Вы вызываете админа", en: "You call an admin" },
  step1s: { uz: "So'rov barcha adminlarga bildirishnoma bo'lib boradi.", ru: "Запрос уходит всем админам.", en: "The request is sent to all admins." },
  step2t: { uz: "Admin tasdiqlaydi", ru: "Админ подтверждает", en: "Admin approves" },
  step2s: { uz: "«Chatga kirish» tugmasini bosadi.", ru: "Нажимает «Войти в чат».", en: "They tap “Join chat”." },
  step3t: { uz: "Chat shu yerda ochiladi", ru: "Чат откроется здесь", en: "Chat opens here" },
  step3s: { uz: "Ilova ichida 2 kishilik jonli suhbat.", ru: "Приватный чат в приложении.", en: "A private 1-to-1 chat in the app." },
  step4t: { uz: "Ovozli xabar", ru: "Голосовое сообщение", en: "Voice message" },
  step4s: { uz: "Mikrofon tugmasi orqali jonli ovoz yuboriladi.", ru: "Отправьте голос кнопкой микрофона.", en: "Send live audio with the mic button." },

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
