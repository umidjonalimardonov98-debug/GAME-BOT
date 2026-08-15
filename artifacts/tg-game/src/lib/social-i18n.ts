import type { Lang } from "@/lib/i18n";

export type L3 = Record<Lang, string>;
const L = (uz: string, ru: string, en: string): L3 => ({ uz, ru, en });

/* ─────────── UI matnlari ─────────── */
export const S: Record<string, L3> = {
  social: L("Social o'yinlar", "Социальные игры", "Social games"),
  socialSub: L("Tanish · o'yna · yut", "Знакомься · играй · выигрывай", "Meet · play · win"),
  back: L("Orqaga", "Назад", "Back"),
  play: L("O'ynash", "Играть", "Play"),
  start: L("Boshlash", "Начать", "Start"),
  again: L("Yana", "Ещё раз", "Play again"),
  next: L("Keyingi", "Далее", "Next"),
  finish: L("Yakunlash", "Завершить", "Finish"),
  result: L("Natija", "Результат", "Result"),
  level: L("Daraja", "Уровень", "Level"),
  xp: L("Tajriba", "Опыт", "XP"),
  wins: L("G'alaba", "Победы", "Wins"),
  matches: L("Moslik", "Совпадения", "Matches"),
  gifts: L("Sovg'alar", "Подарки", "Gifts"),
  rules: L("Qoidalar", "Правила", "Rules"),
  leaderboard: L("Reyting", "Рейтинг", "Leaderboard"),
  profile: L("Profil", "Профиль", "Profile"),
  today: L("Bugun", "Сегодня", "Today"),
  weekly: L("Haftalik", "Неделя", "Weekly"),
  monthly: L("Oylik", "Месяц", "Monthly"),
  online: L("Onlayn", "Онлайн", "Online"),
  you: L("Siz", "Вы", "You"),
  rival: L("Raqib", "Соперник", "Rival"),
  score: L("Ball", "Счёт", "Score"),
  time: L("Vaqt", "Время", "Time"),
  correct: L("To'g'ri", "Верно", "Correct"),
  wrong: L("Xato", "Неверно", "Wrong"),
  win: L("G'alaba", "Победа", "Victory"),
  lose: L("Mag'lubiyat", "Поражение", "Defeat"),
  draw: L("Durang", "Ничья", "Draw"),
  sendGift: L("Sovg'a yuborish", "Отправить подарок", "Send a gift"),
  giftSent: L("Sovg'a yuborildi", "Подарок отправлен", "Gift sent"),
  report: L("Shikoyat", "Жалоба", "Report"),
  block: L("Bloklash", "Заблокировать", "Block"),
  reported: L("Shikoyat yuborildi", "Жалоба отправлена", "Report sent"),
  blocked: L("Foydalanuvchi bloklandi", "Пользователь заблокирован", "User blocked"),
  skip: L("O'tkazish", "Пропустить", "Skip"),
  like: L("Yoqdi", "Нравится", "Like"),
  itsMatch: L("Moslik topildi", "Есть совпадение", "It's a match"),
  chat: L("Suhbat", "Чат", "Chat"),
  unmatch: L("Bekor qilish", "Убрать", "Unmatch"),
  noMoreCards: L("Kartochkalar tugadi", "Карточки закончились", "No more cards"),
  truth: L("Rostini ayt", "Правда", "Truth"),
  dare: L("Topshiriq", "Действие", "Dare"),
  yourTurn: L("Sizning navbatingiz", "Ваш ход", "Your turn"),
  done: L("Bajardim", "Выполнено", "Done"),
  pass: L("O'tkazib yuborish", "Пас", "Pass"),
  createRoom: L("Xona yaratish", "Создать комнату", "Create room"),
  findRoom: L("Xona qidirish", "Найти комнату", "Find room"),
  trendRooms: L("Trend xonalar", "Популярные комнаты", "Trending rooms"),
  players: L("O'yinchilar", "Игроки", "Players"),
  host: L("Xona egasi", "Хост", "Host"),
  startGame: L("O'yinni boshlash", "Запустить игру", "Start game"),
  leave: L("Chiqish", "Выйти", "Leave"),
  kick: L("Chiqarish", "Исключить", "Kick"),
  joined: L("Xonaga qo'shildingiz", "Вы вошли в комнату", "You joined the room"),
  compatibility: L("Moslik darajasi", "Совместимость", "Compatibility"),
  question: L("Savol", "Вопрос", "Question"),
  challengeTitle: L("Challenge", "Челлендж", "Challenge"),
  challengeSub: L("60 soniyada bajaring", "Выполните за 60 секунд", "Complete in 60 seconds"),
  vip: L("VIP", "VIP", "VIP"),
  earnedXp: L("Tajriba olindi", "Опыт начислен", "XP earned"),
  socialNote: L(
    "Bu bo'lim pul tikishsiz — faqat XP va daraja uchun.",
    "Этот раздел без ставок — только XP и уровни.",
    "This section has no wagering — XP and levels only.",
  ),
};

export const s = (k: keyof typeof S | string, lang: Lang) => (S[k] ? S[k][lang] : String(k));

/* ─────────── Social o'yinlar ro'yxati ─────────── */
export interface SocialGame {
  key: string;
  path: string;
  name: L3;
  desc: L3;
  c1: string;
  c2: string;
  tag: L3;
}

export const SOCIAL_GAMES: SocialGame[] = [
  {
    key: "lovematch", path: "/social/match",
    name: L("Love Match", "Love Match", "Love Match"),
    desc: L("Kartochkalar orqali tanishing", "Знакомьтесь через карточки", "Meet people via cards"),
    c1: "#ff5f8f", c2: "#7a1338", tag: L("Yangi", "Новое", "New"),
  },
  {
    key: "lovequiz", path: "/social/lovequiz",
    name: L("Love Quiz", "Love Quiz", "Love Quiz"),
    desc: L("10 savol — moslikni aniqlang", "10 вопросов — узнайте совместимость", "10 questions — find your match"),
    c1: "#ff7ab8", c2: "#5a1046", tag: L("Juftlik", "Пара", "Duo"),
  },
  {
    key: "truthordare", path: "/social/truthordare",
    name: L("Truth or Dare", "Правда или действие", "Truth or Dare"),
    desc: L("Rostini ayt yoki topshiriq", "Правда или действие", "Answer or take the dare"),
    c1: "#ff9f43", c2: "#7a3200", tag: L("Qizg'in", "Жарко", "Hot"),
  },
  {
    key: "quizbattle", path: "/social/quizbattle",
    name: L("Quiz Battle", "Квиз-битва", "Quiz Battle"),
    desc: L("Bilim bo'yicha jang", "Битва на знания", "Battle of knowledge"),
    c1: "#5aa2f0", c2: "#0b2c63", tag: L("1v1", "1v1", "1v1"),
  },
  {
    key: "party", path: "/social/party",
    name: L("Party Room", "Пати-комната", "Party Room"),
    desc: L("4–10 kishi bilan o'ynang", "Играйте с 4–10 людьми", "Play with 4–10 people"),
    c1: "#a56bff", c2: "#2c0d5e", tag: L("Guruh", "Группа", "Group"),
  },
  {
    key: "challenge", path: "/social/challenge",
    name: L("Challenge", "Челлендж", "Challenge"),
    desc: L("Kunlik topshiriqlar", "Ежедневные задания", "Daily missions"),
    c1: "#2dd4a8", c2: "#05412f", tag: L("Kunlik", "Дейли", "Daily"),
  },
];

/* ─────────── Sovg'alar ─────────── */
export interface GiftItem { key: string; name: L3; cost: number; c1: string; c2: string }
export const GIFTS: GiftItem[] = [
  { key: "rose", name: L("Atirgul", "Роза", "Rose"), cost: 50, c1: "#ff5f8f", c2: "#7a1338" },
  { key: "heart", name: L("Yurak", "Сердце", "Heart"), cost: 100, c1: "#ff3b6b", c2: "#5e0a22" },
  { key: "butterfly", name: L("Kapalak", "Бабочка", "Butterfly"), cost: 200, c1: "#67c7ff", c2: "#0b3c63" },
  { key: "diamond", name: L("Olmos", "Алмаз", "Diamond"), cost: 500, c1: "#8ef0ff", c2: "#0a4756" },
  { key: "crown", name: L("Toj", "Корона", "Crown"), cost: 1000, c1: "#ffd76a", c2: "#6b4a05" },
  { key: "rocket", name: L("Raketa", "Ракета", "Rocket"), cost: 1500, c1: "#b18cff", c2: "#33115e" },
];

/* ─────────── Love Quiz savollari ─────────── */
export interface QOption { text: L3; v: number }
export interface LoveQ { q: L3; opts: QOption[] }

export const LOVE_QUESTIONS: LoveQ[] = [
  { q: L("Ideal dam olish?", "Идеальный отдых?", "Ideal getaway?"), opts: [
    { text: L("Sayohat", "Путешествие", "Travel"), v: 1 },
    { text: L("Kino", "Кино", "Movies"), v: 2 },
    { text: L("O'yin", "Игры", "Gaming"), v: 3 },
    { text: L("Sayr", "Прогулка", "A walk"), v: 4 },
  ]},
  { q: L("Sevimli musiqa?", "Любимая музыка?", "Favourite music?"), opts: [
    { text: L("Pop", "Поп", "Pop"), v: 1 },
    { text: L("Rok", "Рок", "Rock"), v: 2 },
    { text: L("Milliy", "Национальная", "Folk"), v: 3 },
    { text: L("Klassika", "Классика", "Classical"), v: 4 },
  ]},
  { q: L("Ertalab yoki kechqurun?", "Утро или вечер?", "Morning or evening?"), opts: [
    { text: L("Ertalab", "Утро", "Morning"), v: 1 },
    { text: L("Kechqurun", "Вечер", "Evening"), v: 2 },
    { text: L("Tun", "Ночь", "Night"), v: 3 },
    { text: L("Farqi yo'q", "Без разницы", "No difference"), v: 4 },
  ]},
  { q: L("Qaysi taom?", "Какая еда?", "Which food?"), opts: [
    { text: L("Osh", "Плов", "Plov"), v: 1 },
    { text: L("Pitsa", "Пицца", "Pizza"), v: 2 },
    { text: L("Sushi", "Суши", "Sushi"), v: 3 },
    { text: L("Shirinlik", "Десерт", "Dessert"), v: 4 },
  ]},
  { q: L("Dam olish kuni?", "Выходной день?", "Weekend plan?"), opts: [
    { text: L("Do'stlar bilan", "С друзьями", "With friends"), v: 1 },
    { text: L("Uyda", "Дома", "At home"), v: 2 },
    { text: L("Tabiatda", "На природе", "In nature"), v: 3 },
    { text: L("Sport", "Спорт", "Sport"), v: 4 },
  ]},
  { q: L("Qaysi mavsum?", "Какое время года?", "Which season?"), opts: [
    { text: L("Bahor", "Весна", "Spring"), v: 1 },
    { text: L("Yoz", "Лето", "Summer"), v: 2 },
    { text: L("Kuz", "Осень", "Autumn"), v: 3 },
    { text: L("Qish", "Зима", "Winter"), v: 4 },
  ]},
  { q: L("Muloqot uslubi?", "Стиль общения?", "Chat style?"), opts: [
    { text: L("Ovozli", "Голосом", "Voice"), v: 1 },
    { text: L("Yozma", "Текстом", "Text"), v: 2 },
    { text: L("Video", "Видео", "Video"), v: 3 },
    { text: L("Jonli", "Вживую", "In person"), v: 4 },
  ]},
  { q: L("Sizni nima jalb qiladi?", "Что вас привлекает?", "What attracts you?"), opts: [
    { text: L("Hazil", "Юмор", "Humour"), v: 1 },
    { text: L("Aql", "Ум", "Intelligence"), v: 2 },
    { text: L("Halollik", "Честность", "Honesty"), v: 3 },
    { text: L("G'amxo'rlik", "Забота", "Care"), v: 4 },
  ]},
  { q: L("Bo'sh vaqt?", "Свободное время?", "Free time?"), opts: [
    { text: L("Kitob", "Книги", "Books"), v: 1 },
    { text: L("Serial", "Сериалы", "Series"), v: 2 },
    { text: L("O'yin", "Игры", "Games"), v: 3 },
    { text: L("Ijod", "Творчество", "Creating"), v: 4 },
  ]},
  { q: L("Kelajak rejasi?", "Планы на будущее?", "Future plan?"), opts: [
    { text: L("Karyera", "Карьера", "Career"), v: 1 },
    { text: L("Oila", "Семья", "Family"), v: 2 },
    { text: L("Sayohat", "Путешествия", "Travel"), v: 3 },
    { text: L("Biznes", "Бизнес", "Business"), v: 4 },
  ]},
];

/* ─────────── Quiz Battle savollari ─────────── */
export interface QuizQ { q: L3; opts: L3[]; a: number }
export const QUIZ_QUESTIONS: QuizQ[] = [
  { q: L("O'zbekiston poytaxti?", "Столица Узбекистана?", "Capital of Uzbekistan?"),
    opts: [L("Samarqand","Самарканд","Samarkand"), L("Toshkent","Ташкент","Tashkent"), L("Buxoro","Бухара","Bukhara"), L("Xiva","Хива","Khiva")], a: 1 },
  { q: L("Eng katta okean?", "Самый большой океан?", "Largest ocean?"),
    opts: [L("Atlantika","Атлантический","Atlantic"), L("Hind","Индийский","Indian"), L("Tinch","Тихий","Pacific"), L("Shimoliy","Северный","Arctic")], a: 2 },
  { q: L("Bir yilda necha kun?", "Сколько дней в году?", "Days in a year?"),
    opts: [L("360","360","360"), L("365","365","365"), L("370","370","370"), L("355","355","355")], a: 1 },
  { q: L("Quyosh sistemasidagi eng katta sayyora?", "Самая большая планета?", "Largest planet?"),
    opts: [L("Yer","Земля","Earth"), L("Mars","Марс","Mars"), L("Yupiter","Юпитер","Jupiter"), L("Saturn","Сатурн","Saturn")], a: 2 },
  { q: L("Suvning kimyoviy formulasi?", "Формула воды?", "Formula of water?"),
    opts: [L("CO2","CO2","CO2"), L("H2O","H2O","H2O"), L("O2","O2","O2"), L("NaCl","NaCl","NaCl")], a: 1 },
  { q: L("Amir Temur poytaxti?", "Столица Амира Темура?", "Amir Temur's capital?"),
    opts: [L("Samarqand","Самарканд","Samarkand"), L("Toshkent","Ташкент","Tashkent"), L("Shahrisabz","Шахрисабз","Shahrisabz"), L("Termiz","Термез","Termez")], a: 0 },
  { q: L("Futbol jamoasida nechta o'yinchi?", "Сколько игроков в футболе?", "Players in a football team?"),
    opts: [L("9","9","9"), L("10","10","10"), L("11","11","11"), L("12","12","12")], a: 2 },
  { q: L("Eng baland tog' cho'qqisi?", "Самая высокая вершина?", "Highest peak?"),
    opts: [L("K2","K2","K2"), L("Everest","Эверест","Everest"), L("Elbrus","Эльбрус","Elbrus"), L("Monblan","Монблан","Mont Blanc")], a: 1 },
  { q: L("Rangin kamalakda nechta rang?", "Сколько цветов в радуге?", "Colours in a rainbow?"),
    opts: [L("5","5","5"), L("6","6","6"), L("7","7","7"), L("8","8","8")], a: 2 },
  { q: L("Kompyuter miyasi nima deyiladi?", "Мозг компьютера?", "Brain of a computer?"),
    opts: [L("RAM","RAM","RAM"), L("CPU","CPU","CPU"), L("SSD","SSD","SSD"), L("GPU","GPU","GPU")], a: 1 },
];

/* ─────────── Truth / Dare ─────────── */
export const TRUTHS: L3[] = [
  L("Sevimli filmingiz qaysi?", "Какой ваш любимый фильм?", "What's your favourite movie?"),
  L("Eng yoqtirgan qo'shig'ingiz?", "Любимая песня?", "Your favourite song?"),
  L("Qaysi davlatga borishni xohlaysiz?", "В какую страну хотите поехать?", "Which country would you visit?"),
  L("Bolalikdagi eng yorqin xotirangiz?", "Ярчайшее детское воспоминание?", "Brightest childhood memory?"),
  L("Kim sizning ilhomchingiz?", "Кто вас вдохновляет?", "Who inspires you?"),
  L("Eng katta orzuingiz nima?", "Какая у вас самая большая мечта?", "Your biggest dream?"),
  L("Qaysi taomni doim tanlaysiz?", "Какое блюдо выберете всегда?", "Which dish do you always pick?"),
  L("Do'stlikda eng muhim narsa nima?", "Что важнее всего в дружбе?", "What matters most in friendship?"),
  L("Oxirgi marta nimadan kulgansiz?", "Над чем смеялись в последний раз?", "What made you laugh last?"),
  L("Qaysi kitob sizni o'zgartirgan?", "Какая книга вас изменила?", "Which book changed you?"),
];

export const DARES: L3[] = [
  L("3 ta emoji bilan kayfiyatingizni ko'rsating.", "Покажите настроение 3 смайликами.", "Show your mood with 3 emojis."),
  L("10 soniyada 5 ta hayvon nomini yozing.", "Назовите 5 животных за 10 секунд.", "Name 5 animals in 10 seconds."),
  L("Biror filmni so'z bilan tasvirlang.", "Опишите фильм словами.", "Describe a movie in words."),
  L("Sevimli qo'shig'ingizdan bir qator yozing.", "Напишите строчку любимой песни.", "Write one line of your favourite song."),
  L("Bugungi kuningizni 3 so'zda ayting.", "Опишите день тремя словами.", "Describe your day in 3 words."),
  L("Raqibingizga chiroyli maqtov ayting.", "Сделайте сопернику комплимент.", "Give your rival a compliment."),
  L("Bitta qiziq faktni ulashing.", "Поделитесь интересным фактом.", "Share one fun fact."),
  L("Ovozli xabarda salom ayting.", "Отправьте голосовое приветствие.", "Send a voice greeting."),
  L("5 soniyada 3 ta shahar nomini ayting.", "Назовите 3 города за 5 секунд.", "Name 3 cities in 5 seconds."),
  L("Kelasi haftaga bitta maqsad yozing.", "Напишите цель на неделю.", "Write one goal for next week."),
];

/* ─────────── Challenge topshiriqlari ─────────── */
export const CHALLENGES: { title: L3; xp: number }[] = [
  { title: L("3 ta o'yin o'ynang", "Сыграйте 3 игры", "Play 3 games"), xp: 100 },
  { title: L("Bitta sovg'a yuboring", "Отправьте один подарок", "Send one gift"), xp: 80 },
  { title: L("Love Quizni yakunlang", "Пройдите Love Quiz", "Finish a Love Quiz"), xp: 150 },
  { title: L("Party xonaga qo'shiling", "Зайдите в пати-комнату", "Join a party room"), xp: 120 },
  { title: L("Quiz Battle'da g'alaba qozoning", "Победите в Quiz Battle", "Win a Quiz Battle"), xp: 200 },
  { title: L("Kunlik bonusni oling", "Заберите ежедневный бонус", "Claim the daily bonus"), xp: 60 },
];

/* ─────────── Demo profillar ─────────── */
export interface MatchProfile { name: string; age: number; city: L3; tags: L3[]; pct: number; c1: string; c2: string }
export const MATCH_PROFILES: MatchProfile[] = [
  { name: "Malika", age: 21, city: L("Toshkent","Ташкент","Tashkent"), tags: [L("Musiqa","Музыка","Music"), L("Kino","Кино","Movies"), L("O'yin","Игры","Games")], pct: 87, c1: "#ff5f8f", c2: "#5e0a37" },
  { name: "Sevara", age: 23, city: L("Samarqand","Самарканд","Samarkand"), tags: [L("Sayohat","Путешествия","Travel"), L("Kitob","Книги","Books")], pct: 74, c1: "#b18cff", c2: "#2c0d5e" },
  { name: "Umid", age: 24, city: L("Buxoro","Бухара","Bukhara"), tags: [L("Sport","Спорт","Sport"), L("Musiqa","Музыка","Music")], pct: 68, c1: "#5aa2f0", c2: "#0b2c63" },
  { name: "Aziz", age: 22, city: L("Namangan","Наманган","Namangan"), tags: [L("O'yin","Игры","Games"), L("Kino","Кино","Movies")], pct: 81, c1: "#2dd4a8", c2: "#05412f" },
  { name: "Nigora", age: 20, city: L("Farg'ona","Фергана","Fergana"), tags: [L("Raqs","Танцы","Dance"), L("Moda","Мода","Fashion")], pct: 92, c1: "#ff9f43", c2: "#7a3200" },
  { name: "Jasur", age: 25, city: L("Andijon","Андижан","Andijan"), tags: [L("Biznes","Бизнес","Business"), L("Sport","Спорт","Sport")], pct: 63, c1: "#67c7ff", c2: "#0b3c63" },
];

/* ─────────── QOIDALAR ─────────── */
export interface RuleSection { title: L3; items: L3[] }
export const RULE_SECTIONS: RuleSection[] = [
  { title: L("Umumiy qoidalar", "Общие правила", "General rules"), items: [
    L("Har bir foydalanuvchi faqat o'z akkauntidan foydalanadi.", "Каждый пользователь использует только свой аккаунт.", "Each user may use only their own account."),
    L("Bir nechta akkaunt bilan aldash taqiqlanadi.", "Мультиаккаунты запрещены.", "Multi-accounting is forbidden."),
    L("Botdagi xatoliklardan foydalanish taqiqlanadi.", "Использование багов запрещено.", "Exploiting bugs is forbidden."),
    L("Spam va boshqalarni bezovta qilish taqiqlanadi.", "Спам и беспокойство других запрещены.", "Spam and harassment are forbidden."),
    L("Soxta ma'lumot tarqatish taqiqlanadi.", "Распространение ложной информации запрещено.", "Spreading false information is forbidden."),
  ]},
  { title: L("O'yin qoidalari", "Правила игр", "Game rules"), items: [
    L("Har bir o'yinning maqsadi, vaqti va ball berish tartibi o'yin ichida ko'rsatiladi.", "Цель, время и начисление очков указаны внутри каждой игры.", "Each game shows its goal, timer and scoring."),
    L("Aloqa uzilsa, o'yin holati serverda saqlanadi.", "При обрыве связи состояние игры сохраняется на сервере.", "If the connection drops, game state is kept on the server."),
    L("Javob berilmasa — 0 ball.", "Нет ответа — 0 очков.", "No answer — 0 points."),
    L("Raund tugagach natija va XP beriladi.", "После раунда выдаётся результат и XP.", "After the round you get the result and XP."),
  ]},
  { title: L("LIVE PvP", "LIVE PvP", "LIVE PvP"), items: [
    L("2 o'yinchi navbat bilan harakat qiladi.", "Два игрока ходят по очереди.", "Two players move in turns."),
    L("Har harakatga vaqt chegarasi bor.", "На каждый ход есть лимит времени.", "Each move has a time limit."),
    L("G'olibga XP va reyting beriladi.", "Победитель получает XP и рейтинг.", "The winner gets XP and rating."),
    L("Ataylab o'yindan chiqish mag'lubiyat hisoblanadi.", "Намеренный выход = поражение.", "Leaving on purpose counts as a loss."),
  ]},
  { title: L("Chat", "Чат", "Chat"), items: [
    L("Haqorat va toksik so'zlar filtrlanadi.", "Оскорбления и токсичность фильтруются.", "Insults and toxic words are filtered."),
    L("Reklama va tashqi havolalar taqiqlanadi.", "Реклама и внешние ссылки запрещены.", "Ads and external links are forbidden."),
    L("Shaxsiy ma'lumot so'rash taqiqlanadi.", "Запрещено спрашивать личные данные.", "Asking for personal data is forbidden."),
  ]},
  { title: L("Sovg'alar", "Подарки", "Gifts"), items: [
    L("Sovg'alar virtual — pulga almashtirilmaydi.", "Подарки виртуальные и не обмениваются на деньги.", "Gifts are virtual and not exchangeable for money."),
    L("Yuborilgan sovg'a profilda ko'rinadi.", "Отправленный подарок виден в профиле.", "A sent gift appears on the profile."),
    L("Sovg'a orqali savdo qilish taqiqlanadi.", "Торговля подарками запрещена.", "Trading gifts is forbidden."),
  ]},
  { title: L("Profil va daraja", "Профиль и уровни", "Profile & levels"), items: [
    L("O'yin g'alabasi +100 XP.", "Победа в игре +100 XP.", "Game win +100 XP."),
    L("Moslik +50 XP.", "Совпадение +50 XP.", "Match +50 XP."),
    L("Turnir g'alabasi +500 XP.", "Победа в турнире +500 XP.", "Tournament win +500 XP."),
    L("Har kuni kirish bonus beradi.", "Ежедневный вход даёт бонус.", "Daily login gives a bonus."),
    L("50-darajadan keyin VIP maqomi ochiladi.", "После 50 уровня открывается VIP.", "VIP unlocks after level 50."),
  ]},
  { title: L("Shikoyat va bloklash", "Жалобы и блокировка", "Report & block"), items: [
    L("Har bir profilni shikoyat qilish yoki bloklash mumkin.", "Любой профиль можно заблокировать или пожаловаться.", "Any profile can be reported or blocked."),
    L("18 yoshdan kichiklarga ruxsat berilmaydi.", "Лицам младше 18 доступ запрещён.", "Under-18 users are not allowed."),
    L("Qoida buzilsa akkaunt bloklanadi.", "За нарушение правил аккаунт блокируется.", "Breaking the rules leads to a ban."),
  ]},
  { title: L("Maxfiylik", "Конфиденциальность", "Privacy"), items: [
    L("Faqat Telegram profilingizdagi ochiq ma'lumotlar ishlatiladi.", "Используются только публичные данные Telegram.", "Only public Telegram profile data is used."),
    L("Yozishmalar suhbat yakunlangach o'chiriladi.", "Переписка удаляется после завершения чата.", "Chats are deleted after the conversation ends."),
    L("Ma'lumotlaringiz uchinchi shaxsga berilmaydi.", "Ваши данные не передаются третьим лицам.", "Your data is never shared with third parties."),
  ]},
];
