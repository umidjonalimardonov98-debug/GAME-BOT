import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { sfx, startTicker } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

/**
 * Derby Racing (1XBET uslubi)
 * — 6 ta ot, har birida o'z koeffitsienti bor.
 * — Uy foydasi barcha otlarda bir xil: p(ot) = EV_TARGET / koef.
 * — Poyga jonli: har kadrda tezlik o'zgaradi, oxirida "photo finish".
 */

/** Har bir tikish uchun kutilgan qaytim (0.72 → 28% uy foydasi, 20% o'rtacha yutish) */
const EV_TARGET = 0.72;

interface Horse {
  n: number;
  img: string;
  color: string;
  odds: number;
  name: { uz: string; ru: string; en: string };
}

const HORSES: Horse[] = [
  { n: 1, img: "/horses/h1.png", color: "#ef4444", odds: 2.6, name: { uz: "Qizil Shamol", ru: "Красный Ветер", en: "Red Wind" } },
  { n: 2, img: "/horses/h2.png", color: "#3b82f6", odds: 3.2, name: { uz: "Qora Bo'ron", ru: "Чёрный Шторм", en: "Black Storm" } },
  { n: 3, img: "/horses/h3.png", color: "#22c55e", odds: 4.0, name: { uz: "Yashil O'q", ru: "Зелёная Стрела", en: "Green Arrow" } },
  { n: 4, img: "/horses/h4.png", color: "#eab308", odds: 5.5, name: { uz: "Oltin Yol", ru: "Золотая Грива", en: "Golden Mane" } },
  { n: 5, img: "/horses/h5.png", color: "#a855f7", odds: 8.0, name: { uz: "Tungi Sher", ru: "Ночной Лев", en: "Night Lion" } },
  { n: 6, img: "/horses/h6.png", color: "#f97316", odds: 12.0, name: { uz: "Alanga", ru: "Пламя", en: "Blaze" } },
];

const T = {
  pick: { uz: "Otni tanlang", ru: "Выберите лошадь", en: "Pick a horse" },
  odds: { uz: "Koef.", ru: "Коэф.", en: "Odds" },
  start: { uz: "MARRA!", ru: "СТАРТ!", en: "GO!" },
  finish: { uz: "MARRA", ru: "ФИНИШ", en: "FINISH" },
  winner: { uz: "G'olib", ru: "Победитель", en: "Winner" },
  yours: { uz: "Sizniki", ru: "Ваша", en: "Yours" },
  payout: { uz: "To'lov", ru: "Выплата", en: "Payout" },
} as const;

const MEDAL = ["#f7e59b", "#cbd5e1", "#d97706"];

export default function Derby() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("derby");

  const [pick, setPick] = useState<number | null>(null);
  const [pos, setPos] = useState<number[]>(() => HORSES.map(() => 0));
  const [order, setOrder] = useState<number[] | null>(null);
  const [count, setCount] = useState<string | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);

  const play = () => {
    if (!canPlay || pick === null) return;
    setBusy(true); setWon(null); setOrder(null); setAmount(0);
    setPos(HORSES.map(() => 0));

    const horse = HORSES[pick];
    const win = Math.random() < EV_TARGET / horse.odds;

    // g'olib: yutuqda — tanlangan ot, aks holda koeffitsientga teskari vazn bilan boshqasi
    let winner = pick;
    if (!win) {
      const rest = HORSES.map((h, i) => i).filter((i) => i !== pick);
      const w = rest.map((i) => 1 / HORSES[i].odds);
      const total = w.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      winner = rest[rest.length - 1];
      for (let k = 0; k < rest.length; k++) { r -= w[k]; if (r <= 0) { winner = rest[k]; break; } }
    }

    // har bir otning "kuchi" — g'olib eng katta, qolganlari yaqin (photo finish)
    const power = HORSES.map((_, i) => (i === winner ? 1 : 0.9 + Math.random() * 0.075));
    const wobble = HORSES.map(() => Math.random() * 100);

    // START sanog'i
    const seq = ["3", "2", "1", T.start[lang]];
    let ci = 0;
    setCount(seq[0]);
    const cIv = setInterval(() => {
      ci++;
      if (ci < seq.length) { setCount(seq[ci]); sfx.select(); }
      else { clearInterval(cIv); setCount(null); runRace(); }
    }, 700);

    const runRace = () => {
      sfx.spin();
      const stopTick = startTicker(70);
      const t0 = performance.now();
      const DUR = 7200;

      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / DUR);
        // start portlashi + barqaror chopish + finish sprinti
        const base = t < 0.12 ? (t / 0.12) ** 2 * 0.12 : t;
        const next = HORSES.map((_, i) => {
          const noise = Math.sin((now / 240) + wobble[i]) * 0.022 + Math.sin((now / 90) + i) * 0.008;
          const p = (base * power[i] + noise * (1 - t) ) * 100;
          return Math.max(0, Math.min(100, t >= 1 ? (i === winner ? 100 : 88 + power[i] * 10) : p));
        });
        setPos(next);
        if (t < 1) raf.current = requestAnimationFrame(step);
        else finish();
      };

      const finish = async () => {
        stopTick();
        const ranking = HORSES.map((_, i) => i).sort((a, b) => (b === winner ? 1 : 0) - (a === winner ? 1 : 0) || power[b] - power[a]);
        setOrder(ranking);
        if (win) sfx.win(horse.odds >= 6); else sfx.lose();
        const w = await settle(win ? horse.odds : 0);
        setAmount(w); setWon(win); setBusy(false);
      };

      raf.current = requestAnimationFrame(step);
    };
  };

  const rank = (i: number) => (order ? order.indexOf(i) : -1);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.derby) }}>
      <GameHeader icon="trophy" title={` ${GAME_NAMES.derby[lang]}`} subtitle="x2.6 — x12" />

      <div className="flex-1 px-3 pb-8 flex flex-col gap-3 items-center">

        {/* ——— IPPODROM ——— */}
        <div className="w-full rounded-3xl overflow-hidden relative"
          style={{ border: `1px solid ${ts.cardBorder}`, boxShadow: "0 10px 30px rgba(0,0,0,.35)" }}>
          <div className="absolute inset-0"
            style={{ backgroundImage: "url(/bg/derby.jpg)", backgroundSize: "cover", backgroundPosition: "center" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(3,20,10,.55),rgba(3,20,10,.86))" }} />

          <div className="relative p-2.5 flex flex-col gap-1.5">
            {HORSES.map((h, i) => {
              const r = rank(i);
              return (
                <div key={h.n} className="relative h-12 rounded-lg overflow-hidden"
                  style={{
                    background: i % 2 ? "linear-gradient(90deg,#0d3a20,#12592f)" : "linear-gradient(90deg,#0a2f1a,#0f4d29)",
                    border: `1.5px solid ${pick === i ? "#f7e59b" : "rgba(255,255,255,.07)"}`,
                    boxShadow: pick === i ? "0 0 14px rgba(247,229,155,.35) inset" : "none",
                  }}>
                  {/* masofa belgilari */}
                  <div className="absolute inset-0 flex justify-between opacity-25 px-6">
                    {[0, 1, 2, 3, 4].map((k) => <span key={k} style={{ width: 1, background: "#fff" }} />)}
                  </div>
                  {/* marra chizig'i */}
                  <div className="absolute top-0 bottom-0" style={{
                    right: 6, width: 8,
                    backgroundImage: "repeating-conic-gradient(#fff 0 25%, #111 0 50%)",
                    backgroundSize: "8px 8px", opacity: .9,
                  }} />
                  {/* raqam */}
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black text-white z-10"
                    style={{ background: h.color, boxShadow: `0 0 8px ${h.color}` }}>{h.n}</span>

                  {/* ot */}
                  <div className="absolute top-1/2 -translate-y-1/2 z-[5]"
                    style={{ left: `calc(${6 + pos[i] * 0.84}% )`, transition: busy ? "none" : "left .4s ease" }}>
                    <img src={h.img} alt={h.name[lang]} width={54} height={54} loading="lazy" draggable={false}
                      className={busy ? "gallop" : ""}
                      style={{ width: 54, height: 40, objectFit: "contain", filter: `drop-shadow(0 2px 6px rgba(0,0,0,.6))` }} />
                  </div>

                  {/* natija */}
                  {r >= 0 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black px-1.5 py-0.5 rounded z-10"
                      style={{ background: r < 3 ? MEDAL[r] : "rgba(255,255,255,.12)", color: r < 3 ? "#12240f" : "#fff" }}>
                      {r + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {count && (
            <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: "rgba(0,0,0,.35)" }}>
              <span className="font-black" style={{ fontSize: 64, color: "#f7e59b", textShadow: "0 6px 24px rgba(0,0,0,.7)" }}>{count}</span>
            </div>
          )}
        </div>

        {/* ——— KOEFFITSIENT TAXTASI ——— */}
        <div className="w-full rounded-2xl p-2.5" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-[11px] font-bold mb-2 px-1" style={{ color: ts.textSub }}>{T.pick[lang]}</p>
          <div className="grid grid-cols-3 gap-2">
            {HORSES.map((h, i) => (
              <button key={h.n} disabled={busy} onClick={() => { setPick(i); sfx.select(); }}
                className="rounded-xl p-1.5 flex flex-col items-center gap-0.5 active:scale-95 transition"
                style={{
                  background: pick === i ? "linear-gradient(180deg,rgba(247,229,155,.22),rgba(247,229,155,.06))" : "rgba(255,255,255,.05)",
                  border: `1.5px solid ${pick === i ? "#f7e59b" : "rgba(255,255,255,.08)"}`,
                }}>
                <img src={h.img} alt={h.name[lang]} width={64} height={44} loading="lazy" draggable={false}
                  style={{ width: 64, height: 44, objectFit: "contain" }} />
                <span className="text-[9px] font-bold truncate w-full text-center" style={{ color: ts.text }}>{h.name[lang]}</span>
                <span className="text-[11px] font-black" style={{ color: h.color }}>x{h.odds.toFixed(2)}</span>
              </button>
            ))}
          </div>
          {pick !== null && (
            <p className="text-[11px] font-bold mt-2 text-center" style={{ color: ts.textSub }}>
              {T.payout[lang]}: <span style={{ color: "#f7e59b" }}>{Math.floor(bet * HORSES[pick].odds).toLocaleString()} UZS</span>
            </p>
          )}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay || pick === null} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>

      <style>{`
        @keyframes gallopY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
        .gallop { animation: gallopY .22s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
