import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg, GAME_BG } from "@/lib/theme-context";
import { GAME_RULES, RULES_TITLE } from "@/lib/rules";
import { GAME_NAMES } from "@/lib/game-i18n";
import { sfx } from "@/lib/sound";

const KEYS = Object.keys(GAME_RULES);

const EXTRA: Record<string, { title: string; items: string[] }> = {
  uz: { title: " Depozit va Yechish", items: ["Har depozitga +20% bonus", "Yechish uchun depozit miqdorini 100% o'ynash kerak", "Chek (skrinshot) botga yuboriladi, admin tasdiqlaydi", "Kunlik bonus va promo kodlar mavjud"] },
  ru: { title: " Депозит и вывод", items: ["Бонус +20% к каждому депозиту", "Для вывода нужно отыграть 100% депозита", "Чек (скриншот) отправляется в бот, админ подтверждает", "Есть ежедневный бонус и промокоды"] },
  en: { title: " Deposit & withdrawal", items: ["+20% bonus on every deposit", "You must wager 100% of the deposit before withdrawing", "Send the receipt screenshot to the bot for admin approval", "Daily bonus and promo codes available"] },
};

export default function HowToPlay() {
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
              background: active === k ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : ts.card,
              border: `1px solid ${active === k ? "rgba(167,139,250,0.6)" : ts.cardBorder}`,
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

        <div className="rounded-2xl p-4"style={{ background:"rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <p className="font-bold mb-2.5"style={{ color:"#4ade80" }}>{extra.title}</p>
          <ul className="space-y-2">
            {extra.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: ts.textSub }}>
                <span>•</span><span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
