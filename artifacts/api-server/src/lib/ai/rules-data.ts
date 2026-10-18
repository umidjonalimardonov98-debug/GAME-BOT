// AUTO-GENERATED from artifacts/tg-game/src/lib/rules.ts — qo'lda tahrirlamang
export type GameRulesEntry = { key: string; label: string; rules: string[] };

/** Qoidalari matn ko'rinishida mavjud bo'lgan o'yinlar */
export const GAME_RULES_DATA: GameRulesEntry[] = [
  {
    "key": "apple",
    "label": "🍎 Olma",
    "rules": [
      "Tikish miqdorini kiriting (min 2 000 UZS)",
      "Kataklarni birma-bir oching",
      "Har olma koeffitsiyentni oshiradi (max x10)",
      "Qo'ziqorin chiqsa — tikish yonadi, o'z vaqtida CHIQARISH bosing"
    ]
  },
  {
    "key": "dice",
    "label": "🎲 Zar",
    "rules": [
      "Tikishni kiriting",
      "Bashorat: 7 dan katta / teng / kichik",
      "2 ta zar tashlanadi",
      "To'g'ri bashorat = x2.3, aniq 7 = x5.8"
    ]
  },
  {
    "key": "aviator",
    "label": "✈️ Aviator",
    "rules": [
      "Tikishni kiriting va BOSHLASH bosing",
      "Samolyot ko'tariladi, koeffitsiyent oshadi",
      "Qulashdan oldin OLISH bosing",
      "Avto-olish belgisini oldindan qo'yish mumkin"
    ]
  },
  {
    "key": "spin",
    "label": "🎡 Spin",
    "rules": [
      "Har 24 soatda 1 ta bepul aylantirish",
      "Pullik aylantirish ham mavjud",
      "G'ildirak 10 segmentdan iborat",
      "Yutuq darhol balansga tushadi"
    ]
  },
  {
    "key": "blackjack",
    "label": "🃏 Blackjack",
    "rules": [
      "Maqsad — 21 ga yaqinlashish, oshirmaslik",
      "KARTA OL yoki TO'XTA",
      "Diler 17 gacha karta oladi",
      "Blackjack = x2.5, oddiy yutuq = x2"
    ]
  },
  {
    "key": "slots",
    "label": "🎰 Slot",
    "rules": [
      "Tikishni kiriting va SPIN bosing",
      "3 ta g'ildirak tez aylanadi",
      "777 = x10 jekpot",
      "3 bir xil = x3, 2 bir xil = x1.5"
    ]
  },
  {
    "key": "parity",
    "label": "🔢 Toq-Juft",
    "rules": [
      "JUFT / TOQ / KICHIK / KATTA tanlang",
      "1–90 oralig'ida son chiqadi",
      "KICHIK: 1–45, KATTA: 46–90",
      "To'g'ri taxmin = x2"
    ]
  },
  {
    "key": "mines",
    "label": "💣 Mines",
    "rules": [
      "Minalar sonini tanlang",
      "Xavfsiz kataklarni oching",
      "Har katak koeffitsiyentni oshiradi",
      "Minaga tegsangiz — tikish yonadi"
    ]
  },
  {
    "key": "roulette",
    "label": "🎡 Ruletka",
    "rules": [
      "Raqam yoki rangga tiking",
      "Bitta raqam = x36",
      "Qizil/Qora = x2",
      "Sharcha to'xtagan katak yutadi"
    ]
  },
  {
    "key": "plinko",
    "label": "🟣 Plinko",
    "rules": [
      "Xavf darajasini tanlang: past / o'rta / yuqori",
      "Tikishni kiriting va shar tashlang",
      "Shar 8 qator mixdan o'tadi",
      "Tushgan katak koeffitsiyenti (max x12) to'lanadi"
    ]
  },
  {
    "key": "towers",
    "label": "🏰 Towers",
    "rules": [
      "Har bosqichda 3 tadan 1 ta katak tanlang",
      "To'g'ri tanlov — yuqoriga ko'tarilasiz",
      "Har bosqich koeffitsiyentni oshiradi (max x20)",
      "Istalgan payt CHIQARISH bosing"
    ]
  },
  {
    "key": "limbo",
    "label": "📈 Limbo",
    "rules": [
      "Maqsad koeffitsiyentni belgilang (1.1–100)",
      "Tikishni kiriting va o'ynang",
      "Tasodifiy koeffitsiyent chiqadi",
      "Natija maqsaddan katta bo'lsa — yutasiz"
    ]
  },
  {
    "key": "keno",
    "label": "🔢 Keno",
    "rules": [
      "40 ta raqamdan 5 tasini tanlang",
      "5 ta raqam tortiladi",
      "2 mos = x1.4, 3 = x4, 4 = x14",
      "5 tasi mos kelsa — x60"
    ]
  },
  {
    "key": "hilo",
    "label": "🔼 Hi-Lo",
    "rules": [
      "Ochiq karta ko'rsatiladi",
      "Keyingi karta KATTA yoki KICHIK bo'lishini tanlang",
      "Har to'g'ri taxmin x1.65",
      "Istalgan payt CHIQARISH bosing"
    ]
  },
  {
    "key": "coinflip",
    "label": "🪙 Coinflip",
    "rules": [
      "GERB yoki RAQAM tanlang",
      "Tikishni kiriting",
      "Tanga aylanadi",
      "To'g'ri tomon = x1.9"
    ]
  },
  {
    "key": "baccarat",
    "label": "🎴 Baccarat",
    "rules": [
      "O'YINCHI, BANKIR yoki DURRANG tanlang",
      "Har tomonga 2 tadan karta tarqatiladi",
      "Yig'indining oxirgi raqami hisoblanadi",
      "O'yinchi x1.95, bankir x1.9, durrang x8"
    ]
  },
  {
    "key": "case",
    "label": "📦 Case Open",
    "rules": [
      "Tikishni kiriting va keysni oching",
      "Sovg'alar lentasi aylanadi",
      "Ko'rsatkich to'xtagan sovg'a sizniki",
      "Eng katta sovg'a —  x25"
    ]
  },
  {
    "key": "scratch",
    "label": "🎫 Scratch",
    "rules": [
      "Tikishni kiriting va chiptani oling",
      "9 ta katakni chizib oching",
      "3 ta bir xil belgi — yutuq",
      "Yutuq x2 dan x10 gacha"
    ]
  },
  {
    "key": "dragontiger",
    "label": "🐉 Dragon Tiger",
    "rules": [
      "AJDARHO, YO'LBARS yoki DURRANG tanlang",
      "Har tomonga bittadan karta ochiladi",
      "Katta karta yutadi",
      "Ajdarho/yo'lbars x1.95, durrang x9"
    ]
  },
  {
    "key": "rps",
    "label": "✂️ Tosh-Qaychi-Qog'oz",
    "rules": [
      "TOSH, QOG'OZ yoki QAYCHI tanlang",
      "Bot ham tanlaydi",
      "Tosh > qaychi > qog'oz > tosh",
      "Yutuq = x1.9"
    ]
  }
];

/** Batafsil qoida matni hali kiritilmagan o'yinlar (faqat nomi ma'lum) */
export const GAMES_WITHOUT_RULES: { key: string; label: string }[] = [
  {
    "key": "thimbles",
    "label": "🥤 Naperstok"
  },
  {
    "key": "luckycard",
    "label": "🃏 Lucky Card"
  },
  {
    "key": "hands",
    "label": "✋ Qo'lni top"
  },
  {
    "key": "fruitblast",
    "label": "🍉 Fruit Blast"
  },
  {
    "key": "derby",
    "label": "🐎 Derby"
  },
  {
    "key": "moneywheel",
    "label": "🎡 Money Wheel"
  },
  {
    "key": "minesfield",
    "label": "💣 Mina Maydoni"
  },
  {
    "key": "diamondmine",
    "label": "💎 Olmos Koni"
  },
  {
    "key": "rocketcrash",
    "label": "🚀 Raketa Kresh"
  },
  {
    "key": "jetx",
    "label": "🛩 Jet X"
  },
  {
    "key": "sicbo",
    "label": "🎲 Sic Bo"
  },
  {
    "key": "dicetriple",
    "label": "🎲 Zar Uchligi"
  },
  {
    "key": "euroroulette",
    "label": "🎡 Yevropa Ruletkasi"
  },
  {
    "key": "goldroulette",
    "label": "🎡 Oltin Ruletka"
  },
  {
    "key": "hilostreak",
    "label": "🔼 Hi-Lo Seriya"
  },
  {
    "key": "kingsroad",
    "label": "👑 Shoh Yo'li"
  },
  {
    "key": "casinowar",
    "label": "⚔️ Kazino Urushi"
  },
  {
    "key": "dragoncard",
    "label": "🐲 Ajdar Kartasi"
  },
  {
    "key": "plinkogold",
    "label": "🟡 Oltin Plinko"
  },
  {
    "key": "plinkoneon",
    "label": "🟣 Neon Plinko"
  },
  {
    "key": "keno40",
    "label": "🔢 Keno 40"
  },
  {
    "key": "turbokeno",
    "label": "🔢 Turbo Keno"
  },
  {
    "key": "silvercard",
    "label": "🎫 Kumush Kartochka"
  },
  {
    "key": "goldcard",
    "label": "🎫 Oltin Kartochka"
  },
  {
    "key": "crystalblast",
    "label": "💎 Kristall Portlash"
  },
  {
    "key": "royalcascade",
    "label": "👑 Shohona Kaskad"
  },
  {
    "key": "bingo75",
    "label": "🔢 Bingo 75"
  },
  {
    "key": "speedbingo",
    "label": "🔢 Tezkor Bingo"
  },
  {
    "key": "lottodrum",
    "label": "🎟 Lotereya Barabani"
  },
  {
    "key": "megalotto",
    "label": "🎟 Mega Lotto"
  },
  {
    "key": "memorypairs",
    "label": "🧠 Xotira Juftlari"
  },
  {
    "key": "secretpairs",
    "label": "🧠 Sirli Juftlik"
  },
  {
    "key": "fishhunt",
    "label": "🎣 Baliq Ovi"
  },
  {
    "key": "pearlhunt",
    "label": "🎣 Marvarid Ovi"
  },
  {
    "key": "vipwheel",
    "label": "🎡 VIP G'ildirak"
  },
  {
    "key": "neonwheel",
    "label": "🎡 Neon G'ildirak"
  },
  {
    "key": "goldenpharaoh",
    "label": "🎰 Oltin Fir'avn"
  },
  {
    "key": "diamondbonanza",
    "label": "🎰 Olmos Bonanza"
  },
  {
    "key": "camelrace",
    "label": "🐫 Tuya Poygasi"
  },
  {
    "key": "goldtower",
    "label": "🏰 Oltin Minora"
  },
  {
    "key": "nardgold",
    "label": "🎲 Oltin Nard"
  }
];
