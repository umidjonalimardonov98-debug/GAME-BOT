import type { Lang } from "./i18n";

export type Rules = Record<Lang, string[]>;

export const GAME_RULES: Record<string, { emoji: string; rules: Rules }> = {
  apple: {
    emoji: "",
    rules: {
      uz: ["Tikish miqdorini kiriting (min 2 000 UZS)", "Kataklarni birma-bir oching", "Har olma koeffitsiyentni oshiradi (max x10)", "Qo'ziqorin chiqsa — tikish yonadi, o'z vaqtida CHIQARISH bosing"],
      ru: ["Введите ставку (мин. 2 000 UZS)", "Открывайте ячейки по одной", "Каждое яблоко повышает коэффициент (до x10)", "Гриб — проигрыш, вовремя нажмите ЗАБРАТЬ"],
      en: ["Enter your bet (min 2,000 UZS)", "Open the cells one by one", "Each apple raises the multiplier (up to x10)", "A mushroom ends the round — cash out in time"],
    },
  },
  dice: {
    emoji: "",
    rules: {
      uz: ["Tikishni kiriting", "Bashorat: 7 dan katta / teng / kichik", "2 ta zar tashlanadi", "To'g'ri bashorat = x2.3, aniq 7 = x5.8"],
      ru: ["Введите ставку", "Прогноз: больше 7 / ровно 7 / меньше 7", "Бросаются 2 кости", "Верный прогноз = x2.3, ровно 7 = x5.8"],
      en: ["Enter your bet", "Predict: over 7 / exactly 7 / under 7", "Two dice are rolled", "Correct guess = x2.3, exact 7 = x5.8"],
    },
  },
  aviator: {
    emoji: "",
    rules: {
      uz: ["Tikishni kiriting va BOSHLASH bosing", "Samolyot ko'tariladi, koeffitsiyent oshadi", "Qulashdan oldin OLISH bosing", "Avto-olish belgisini oldindan qo'yish mumkin"],
      ru: ["Введите ставку и начните раунд", "Самолёт взлетает, коэффициент растёт", "Заберите до краша", "Можно задать авто-вывод"],
      en: ["Place a bet and start the round", "The plane flies, multiplier grows", "Cash out before the crash", "Auto-cashout can be preset"],
    },
  },
  spin: {
    emoji: "",
    rules: {
      uz: ["Har 24 soatda 1 ta bepul aylantirish", "Pullik aylantirish ham mavjud", "G'ildirak 10 segmentdan iborat", "Yutuq darhol balansga tushadi"],
      ru: ["1 бесплатное вращение каждые 24 часа", "Есть и платное вращение", "Колесо из 10 секторов", "Выигрыш сразу на баланс"],
      en: ["One free spin every 24 hours", "Paid spins also available", "The wheel has 10 segments", "Winnings credited instantly"],
    },
  },
  blackjack: {
    emoji: "",
    rules: {
      uz: ["Maqsad — 21 ga yaqinlashish, oshirmaslik", "KARTA OL yoki TO'XTA", "Diler 17 gacha karta oladi", "Blackjack = x2.5, oddiy yutuq = x2"],
      ru: ["Цель — набрать ближе к 21, не перебрать", "ЕЩЁ или ХВАТИТ", "Дилер берёт до 17", "Блэкджек = x2.5, обычная победа = x2"],
      en: ["Get as close to 21 as possible", "Hit or stand", "Dealer draws to 17", "Blackjack = x2.5, normal win = x2"],
    },
  },
  slots: {
    emoji: "",
    rules: {
      uz: ["Tikishni kiriting va SPIN bosing", "3 ta g'ildirak tez aylanadi", "777 = x10 jekpot", "3 bir xil = x3, 2 bir xil = x1.5"],
      ru: ["Введите ставку и нажмите СПИН", "3 барабана быстро вращаются", "777 = джекпот x10", "3 одинаковых = x3, 2 = x1.5"],
      en: ["Place a bet and hit SPIN", "Three reels spin fast", "777 = x10 jackpot", "Three of a kind = x3, two = x1.5"],
    },
  },
  parity: {
    emoji: "",
    rules: {
      uz: ["JUFT / TOQ / KICHIK / KATTA tanlang", "1–90 oralig'ida son chiqadi", "KICHIK: 1–45, KATTA: 46–90", "To'g'ri taxmin = x2"],
      ru: ["Выберите ЧЁТ / НЕЧЕТ / МЕНЬШЕ / БОЛЬШЕ", "Выпадает число 1–90", "МЕНЬШЕ: 1–45, БОЛЬШЕ: 46–90", "Верный выбор = x2"],
      en: ["Pick EVEN / ODD / LOW / HIGH", "A number 1–90 is drawn", "LOW: 1–45, HIGH: 46–90", "Correct pick = x2"],
    },
  },
  mines: {
    emoji: "",
    rules: {
      uz: ["Minalar sonini tanlang", "Xavfsiz kataklarni oching", "Har katak koeffitsiyentni oshiradi", "Minaga tegsangiz — tikish yonadi"],
      ru: ["Выберите количество мин", "Открывайте безопасные ячейки", "Каждая ячейка повышает коэффициент", "Мина — проигрыш"],
      en: ["Choose the number of mines", "Open safe tiles", "Each tile raises the multiplier", "Hitting a mine ends the round"],
    },
  },
  roulette: {
    emoji: "",
    rules: {
      uz: ["Raqam yoki rangga tiking", "Bitta raqam = x36", "Qizil/Qora = x2", "Sharcha to'xtagan katak yutadi"],
      ru: ["Ставьте на число или цвет", "Одно число = x36", "Красное/Чёрное = x2", "Выигрывает сектор, где остановился шарик"],
      en: ["Bet on a number or colour", "Straight number = x36", "Red/Black = x2", "The pocket where the ball lands wins"],
    },
  },
  plinko: {
    emoji: "",
    rules: {
      uz: ["Xavf darajasini tanlang: past / o'rta / yuqori", "Tikishni kiriting va shar tashlang", "Shar 8 qator mixdan o'tadi", "Tushgan katak koeffitsiyenti (max x12) to'lanadi"],
      ru: ["Выберите риск: низкий / средний / высокий", "Введите ставку и бросьте шар", "Шар проходит 8 рядов штырьков", "Платит коэффициент ячейки (до x12)"],
      en: ["Choose risk: low / medium / high", "Place a bet and drop the ball", "The ball falls through 8 peg rows", "The landing bucket pays (up to x12)"],
    },
  },
  towers: {
    emoji: "",
    rules: {
      uz: ["Har bosqichda 3 tadan 1 ta katak tanlang", "To'g'ri tanlov — yuqoriga ko'tarilasiz", "Har bosqich koeffitsiyentni oshiradi (max x20)", "Istalgan payt CHIQARISH bosing"],
      ru: ["На каждом уровне выбирайте 1 из 3 ячеек", "Верный выбор — поднимаетесь выше", "Каждый уровень повышает коэффициент (до x20)", "Можно ЗАБРАТЬ в любой момент"],
      en: ["Pick 1 of 3 tiles on each level", "A safe tile moves you up", "Each level raises the multiplier (up to x20)", "Cash out at any time"],
    },
  },
  limbo: {
    emoji: "",
    rules: {
      uz: ["Maqsad koeffitsiyentni belgilang (1.1–100)", "Tikishni kiriting va o'ynang", "Tasodifiy koeffitsiyent chiqadi", "Natija maqsaddan katta bo'lsa — yutasiz"],
      ru: ["Задайте целевой коэффициент (1.1–100)", "Введите ставку и играйте", "Выпадает случайный коэффициент", "Если он больше цели — выигрыш"],
      en: ["Set a target multiplier (1.1–100)", "Place a bet and play", "A random multiplier is rolled", "Roll above target = win"],
    },
  },
  keno: {
    emoji: "",
    rules: {
      uz: ["40 ta raqamdan 5 tasini tanlang", "5 ta raqam tortiladi", "2 mos = x1.4, 3 = x4, 4 = x14", "5 tasi mos kelsa — x60"],
      ru: ["Выберите 5 чисел из 40", "Выпадает 5 чисел", "2 совпадения = x1.4, 3 = x4, 4 = x14", "5 совпадений = x60"],
      en: ["Pick 5 numbers out of 40", "5 numbers are drawn", "2 hits = x1.4, 3 = x4, 4 = x14", "All 5 hits = x60"],
    },
  },
  hilo: {
    emoji: "",
    rules: {
      uz: ["Ochiq karta ko'rsatiladi", "Keyingi karta KATTA yoki KICHIK bo'lishini tanlang", "Har to'g'ri taxmin x1.65", "Istalgan payt CHIQARISH bosing"],
      ru: ["Показана открытая карта", "Угадайте: следующая БОЛЬШЕ или МЕНЬШЕ", "Каждое верное угадывание x1.65", "Забрать можно в любой момент"],
      en: ["An open card is shown", "Guess if the next is higher or lower", "Each correct guess pays x1.65", "Cash out whenever you like"],
    },
  },
  coinflip: {
    emoji: "",
    rules: {
      uz: ["GERB yoki RAQAM tanlang", "Tikishni kiriting", "Tanga aylanadi", "To'g'ri tomon = x1.9"],
      ru: ["Выберите ОРЁЛ или РЕШКА", "Введите ставку", "Монета подбрасывается", "Верная сторона = x1.9"],
      en: ["Choose heads or tails", "Place your bet", "The coin flips", "Correct side pays x1.9"],
    },
  },
  baccarat: {
    emoji: "",
    rules: {
      uz: ["O'YINCHI, BANKIR yoki DURRANG tanlang", "Har tomonga 2 tadan karta tarqatiladi", "Yig'indining oxirgi raqami hisoblanadi", "O'yinchi x1.95, bankir x1.9, durrang x8"],
      ru: ["Выберите ИГРОК, БАНКИР или НИЧЬЯ", "Каждой стороне сдают 2 карты", "Считается последняя цифра суммы", "Игрок x1.95, банкир x1.9, ничья x8"],
      en: ["Bet on player, banker or tie", "Two cards are dealt to each side", "Only the last digit of the total counts", "Player x1.95, banker x1.9, tie x8"],
    },
  },
  case: {
    emoji: "",
    rules: {
      uz: ["Tikishni kiriting va keysni oching", "Sovg'alar lentasi aylanadi", "Ko'rsatkich to'xtagan sovg'a sizniki", "Eng katta sovg'a —  x25"],
      ru: ["Введите ставку и откройте кейс", "Лента призов прокручивается", "Приз под указателем — ваш", "Максимальный приз —  x25"],
      en: ["Place a bet and open the case", "The prize strip spins", "The prize under the marker is yours", "Top prize is  x25"],
    },
  },
  scratch: {
    emoji: "",
    rules: {
      uz: ["Tikishni kiriting va chiptani oling", "9 ta katakni chizib oching", "3 ta bir xil belgi — yutuq", "Yutuq x2 dan x10 gacha"],
      ru: ["Введите ставку и получите билет", "Сотрите 9 ячеек", "3 одинаковых символа — выигрыш", "Выигрыш от x2 до x10"],
      en: ["Place a bet and get a ticket", "Scratch all 9 cells", "Three matching symbols win", "Payouts from x2 up to x10"],
    },
  },
  dragontiger: {
    emoji: "",
    rules: {
      uz: ["AJDARHO, YO'LBARS yoki DURRANG tanlang", "Har tomonga bittadan karta ochiladi", "Katta karta yutadi", "Ajdarho/yo'lbars x1.95, durrang x9"],
      ru: ["Выберите ДРАКОН, ТИГР или НИЧЬЯ", "Каждой стороне открывается одна карта", "Побеждает старшая карта", "Дракон/тигр x1.95, ничья x9"],
      en: ["Bet on dragon, tiger or tie", "One card is dealt to each side", "The higher card wins", "Dragon/tiger x1.95, tie x9"],
    },
  },
  rps: {
    emoji: "",
    rules: {
      uz: ["TOSH, QOG'OZ yoki QAYCHI tanlang", "Bot ham tanlaydi", "Tosh > qaychi > qog'oz > tosh", "Yutuq = x1.9"],
      ru: ["Выберите КАМЕНЬ, БУМАГУ или НОЖНИЦЫ", "Бот тоже делает выбор", "Камень > ножницы > бумага > камень", "Выигрыш = x1.9"],
      en: ["Pick rock, paper or scissors", "The bot picks too", "Rock > scissors > paper > rock", "A win pays x1.9"],
    },
  },
};

export const RULES_TITLE: Record<Lang, string> = {
  uz: " Qanday O'ynaladi",
  ru: " Как играть",
  en: " How to play",
};
