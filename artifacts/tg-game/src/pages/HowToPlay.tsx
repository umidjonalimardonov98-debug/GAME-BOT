import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg, GAME_BG } from "@/lib/theme-context";
import { GAME_RULES, RULES_TITLE } from "@/lib/rules";
import { GAME_NAMES } from "@/lib/game-i18n";
import { sfx } from "@/lib/sound";
import { useU } from "@/lib/ui-i18n";

const KEYS = Object.keys(GAME_RULES);

const EXTRA: Record<string, { title: string; items: string[] }> = {
  uz: { title: "💳 Depozit va Yechish", items: ["Har depozitga +20% bonus", "Yechish uchun depozit miqdorini 100% o'ynash kerak", "Chek (skrinshot) botga yuboriladi, admin tasdiqlaydi", "Kunlik bonus va promo kodlar mavjud"] },
  ru: { title: "💳 Депозит и вывод", items: ["Бонус +20% к каждому депозиту", "Для вывода нужно отыграть 100% депозита", "Чек (скриншот) отправляется в бот, админ подтверждает", "Есть ежедневный бонус и промокоды"] },
  en: { title: "💳 Deposit & withdrawal", items: ["+20% bonus on every deposit", "You must wager 100% of the deposit before withdrawing", "Send the receipt screenshot to the bot for admin approval", "Daily bonus and promo codes available"] },
};

type Sec = { t: string; items: string[] };
const BOT_RULES: Record<string, Sec[]> = {
  uz: [
    { t: "🤖 Bot haqida", items: [
      "Bot Telegram WebApp orqali ishlaydi — barcha o'yinlar ilova ichida.",
      "Ro'yxatdan o'tish shart emas: /start bosilganda hisob avtomatik ochiladi.",
      "Balans UZS da yuritiladi va serverda saqlanadi — qurilma almashtirsangiz ham yo'qolmaydi.",
      "Bir foydalanuvchi — bitta hisob. Ko'p hisob ochish bloklanadi.",
    ]},
    { t: "💰 Balans va tikish", items: [
      "Har bir o'yinda tikish miqdorini o'zingiz tanlaysiz.",
      "Tikish balansdan darhol yechiladi, yutuq esa natija chiqqach qo'shiladi.",
      "Minimal tikish 1 000 UZS, maksimal tikish o'yinga qarab farq qiladi.",
      "Balans yetmasa o'yin boshlanmaydi — avval depozit qiling.",
    ]},
    { t: "💳 Depozit", items: [
      "Botdagi «Hisob to'ldirish» bo'limidan kartaga pul o'tkazasiz.",
      "To'lov chekining skrinshotini botga yuborasiz.",
      "Admin tasdiqlagach balans to'ldiriladi (odatda bir necha daqiqa).",
      "Har depozitga +20% bonus qo'shiladi.",
    ]},
    { t: "🏦 Pul yechish", items: [
      "Yechish uchun depozit summasining 100% i o'ynalgan bo'lishi shart (wager).",
      "So'rov admin tomonidan ko'rib chiqiladi, holati «Tarix» bo'limida ko'rinadi.",
      "Karta raqami to'g'ri kiritilishi shart — xato karta uchun javobgarlik yo'q.",
      "Bekor qilingan so'rov summasi balansga qaytariladi.",
    ]},
    { t: "⚔️ LIVE PvP", items: [
      "PvP — haqiqiy odam bilan 1x1 o'yin, bot bilan emas.",
      "Tikish tanlanadi, tizim shu miqdordagi raqibni avtomatik topadi.",
      "G'olib umumiy bankning 92% ini oladi (8% — xizmat haqi).",
      "Durang bo'lsa tikilgan pul ikkala o'yinchiga qaytariladi.",
      "Raundda vaqt tugasa avtomatik tanlov qilinadi — kechikmang.",
      "O'yindan chiqib ketish mag'lubiyat hisoblanadi.",
    ]},
    { t: "💬 Chat", items: [
      "Ommaviy chatda barcha o'yinchilar yozishadi.",
      "Xabarlar 10 soat saqlanadi, so'ng avtomatik o'chadi.",
      "Haqorat, spam va reklama uchun chatga kirish yopiladi.",
      "PvP o'yin ichida raqib bilan alohida chat va emoji mavjud.",
    ]},
    { t: "🎁 Bonus, referal va daraja", items: [
      "Kunlik bonus — har 24 soatda bir marta olinadi.",
      "Promo kodlar botda e'lon qilinadi va bir marta ishlatiladi.",
      "Referal: do'stingiz sizning havolangiz orqali kirsa, bonus olasiz.",
      "O'ynagan summangizga qarab daraja (VIP) oshadi va imtiyoz beradi.",
    ]},
    { t: "📊 Tarix va shaffoflik", items: [
      "«Tarix» bo'limida har bir o'yin natijasi va pul yechish holati ko'rinadi.",
      "Natijalar server tomonida hisoblanadi — mijoz tomonidan o'zgartirib bo'lmaydi.",
      "Har bir o'yinning koeffitsiyenti qoidalar bo'limida ochiq ko'rsatilgan.",
    ]},
    { t: "⚠️ Cheklovlar", items: [
      "18 yoshdan kichiklarga ruxsat etilmaydi.",
      "Firibgarlik, bot/skript ishlatish — hisob bloklanadi va balans bekor qilinadi.",
      "Faqat yo'qotishga tayyor bo'lgan mablag' bilan o'ynang.",
      "Savol bo'lsa admin bilan bog'laning: bot menyusidagi «Yordam».",
    ]},
  ],
  ru: [
    { t: "🤖 О боте", items: [
      "Бот работает через Telegram WebApp — все игры внутри приложения.",
      "Регистрация не нужна: аккаунт создаётся при /start.",
      "Баланс в UZS хранится на сервере и не теряется при смене устройства.",
      "Один пользователь — один аккаунт. Мультиаккаунты блокируются.",
    ]},
    { t: "💰 Баланс и ставки", items: [
      "Сумму ставки вы выбираете сами в каждой игре.",
      "Ставка списывается сразу, выигрыш начисляется после результата.",
      "Минимальная ставка 1 000 UZS, максимум зависит от игры.",
      "При нехватке баланса игра не начнётся — пополните счёт.",
    ]},
    { t: "💳 Депозит", items: [
      "Пополнение через раздел «Пополнить счёт» переводом на карту.",
      "Скриншот чека отправляется в бот.",
      "После подтверждения админом баланс пополняется.",
      "К каждому депозиту +20% бонуса.",
    ]},
    { t: "🏦 Вывод средств", items: [
      "Нужно отыграть 100% суммы депозита (вейджер).",
      "Заявку проверяет админ, статус виден в разделе «История».",
      "Номер карты указывайте верно — за ошибку ответственности нет.",
      "Отклонённая заявка возвращается на баланс.",
    ]},
    { t: "⚔️ LIVE PvP", items: [
      "PvP — игра 1х1 с реальным человеком, не с ботом.",
      "Выбираете ставку — система сама найдёт соперника.",
      "Победитель получает 92% банка (8% — комиссия).",
      "При ничьей ставки возвращаются обоим.",
      "Если время раунда вышло — ход делается автоматически.",
      "Выход из игры засчитывается как поражение.",
    ]},
    { t: "💬 Чат", items: [
      "В общем чате пишут все игроки.",
      "Сообщения хранятся 10 часов, затем удаляются.",
      "За оскорбления, спам и рекламу доступ к чату закрывается.",
      "В PvP есть отдельный чат с соперником и эмодзи.",
    ]},
    { t: "🎁 Бонусы, рефералы, уровни", items: [
      "Ежедневный бонус — раз в 24 часа.",
      "Промокоды публикуются в боте, применяются один раз.",
      "Реферал: друг заходит по вашей ссылке — вы получаете бонус.",
      "Уровень (VIP) растёт от суммы игры и даёт привилегии.",
    ]},
    { t: "📊 История и прозрачность", items: [
      "В разделе «История» видны результаты игр и статусы выводов.",
      "Результаты считаются на сервере — клиент их не меняет.",
      "Коэффициенты каждой игры указаны в правилах.",
    ]},
    { t: "⚠️ Ограничения", items: [
      "Лицам младше 18 лет играть запрещено.",
      "Мошенничество и скрипты — блокировка аккаунта и обнуление баланса.",
      "Играйте только на средства, которые готовы потерять.",
      "Вопросы — «Помощь» в меню бота.",
    ]},
  ],
  en: [
    { t: "🤖 About the bot", items: [
      "The bot runs as a Telegram WebApp — all games live inside the app.",
      "No signup needed: your account is created on /start.",
      "Your UZS balance is stored server-side and survives device changes.",
      "One user — one account. Multi-accounting is blocked.",
    ]},
    { t: "💰 Balance & bets", items: [
      "You pick the stake in every game.",
      "The stake is deducted instantly; winnings are credited after the result.",
      "Minimum bet 1,000 UZS; the maximum depends on the game.",
      "If your balance is too low the round will not start — deposit first.",
    ]},
    { t: "💳 Deposits", items: [
      "Top up from the «Deposit» section via card transfer.",
      "Send the payment receipt screenshot to the bot.",
      "The admin approves it and your balance is credited.",
      "Every deposit gets a +20% bonus.",
    ]},
    { t: "🏦 Withdrawals", items: [
      "You must wager 100% of your deposit before withdrawing.",
      "Requests are reviewed by an admin; status is shown in «History».",
      "Enter the card number correctly — wrong details are not refundable.",
      "Rejected requests are returned to your balance.",
    ]},
    { t: "⚔️ LIVE PvP", items: [
      "PvP is 1v1 against a real person, not the bot.",
      "Pick a stake and matchmaking finds an opponent automatically.",
      "The winner takes 92% of the pot (8% service fee).",
      "On a draw both stakes are refunded.",
      "If the round timer runs out a move is auto-submitted.",
      "Leaving a match counts as a loss.",
    ]},
    { t: "💬 Chat", items: [
      "The global chat is shared by all players.",
      "Messages are kept for 10 hours, then auto-deleted.",
      "Abuse, spam and ads lead to a chat ban.",
      "PvP matches have a private chat with emoji reactions.",
    ]},
    { t: "🎁 Bonuses, referrals, levels", items: [
      "Daily bonus — once every 24 hours.",
      "Promo codes are announced in the bot and are single-use.",
      "Referrals: invite a friend with your link and earn a bonus.",
      "Your VIP level grows with total wagered and unlocks perks.",
    ]},
    { t: "📊 History & fairness", items: [
      "«History» shows every game result and withdrawal status.",
      "Results are computed server-side and cannot be altered by the client.",
      "Every game's payout multiplier is listed in its rules.",
    ]},
    { t: "⚠️ Limits", items: [
      "Players under 18 are not allowed.",
      "Fraud, bots or scripts lead to an account ban and balance reset.",
      "Only play with money you can afford to lose.",
      "Questions? Use «Help» in the bot menu.",
    ]},
  ],
};

export default function HowToPlay() {
  const u = useU();
  const [, nav] = useLocation();
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const [active, setActive] = useState<string>(KEYS[0]);

  const cur = GAME_RULES[active];
  const extra = EXTRA[lang];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.home) }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => nav("/")}
          className="w-10 h-10 flex items-center justify-center rounded-2xl active:scale-90 transition-transform"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft className="w-4 h-4" style={{ color: ts.text }} />
        </button>
        <h1 className="font-black text-lg" style={{ color: ts.text }}>{RULES_TITLE[lang]}</h1>
      </div>

      {/* 4 qatorli o'yin tanlash gridi */}
      <div className="grid grid-cols-4 gap-2 px-4 mb-4">
        {KEYS.map(k => (
          <button key={k} onClick={() =>{ setActive(k); sfx.select(); }}
            className="rounded-2xl py-2.5 px-1 flex flex-col items-center gap-1 active:scale-95 transition-all"
            style={{
              background: active === k ? "linear-gradient(135deg,#1668e3,#0d4fb0)" : ts.card,
              border: `1px solid ${active === k ? "rgba(47,143,255,0.6)" : ts.cardBorder}`,
            }}>
            <span style={{ fontSize: 20 }}>{GAME_RULES[k].emoji}</span>
            <span className="font-black text-center leading-tight"
              style={{ fontSize: 8.5, color: active === k ? "#fff" : ts.textSub }}>
              {GAME_NAMES[k][lang]}
            </span>
          </button>
        ))}
      </div>

      <div className="px-4 pb-8 space-y-3">
        <div className="rounded-2xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{cur.emoji}</span>
            <h2 className="font-black text-sm" style={{ color: ts.text }}>{GAME_NAMES[active][lang]}</h2>
          </div>
          <ol className="space-y-1.5">
            {cur.rules[lang].map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className="font-black shrink-0"style={{ color:"#fbbf24", minWidth: 18 }}>{i + 1}.</span>
                <span style={{ color: ts.textSub }}>{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl p-4"style={{ background:"rgba(37,165,90,0.06)", border: "1px solid rgba(37,165,90,0.15)" }}>
          <p className="font-bold mb-2.5"style={{ color:"#39c46f" }}>{extra.title}</p>
          <ul className="space-y-2">
            {extra.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: ts.textSub }}>
                <span>•</span><span>{it}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ─── BOTNING TO'LIQ QOIDALARI ─── */}
        {(BOT_RULES[lang] ?? BOT_RULES.uz!).map((sec) => (
          <div key={sec.t} className="rounded-2xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
            <p className="font-black mb-2.5" style={{ fontSize: 13, color: "#fbbf24" }}>{sec.t}</p>
            <ul className="space-y-2">
              {sec.items.map((it, i) => (
                <li key={i} className="flex items-start gap-2" style={{ fontSize: 12.5, color: ts.textSub }}>
                  <span style={{ color: "#fbbf24" }}>•</span><span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
