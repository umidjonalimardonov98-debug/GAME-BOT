import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

/** Money Wheel — 12 sektor, tanlagan sektoringiz tushsa yutuq */
const SECTORS = [2, 5, 2, 10, 2, 5, 2, 20, 2, 5, 2, 40];
const COLORS = ["#1668e3", "#0b3f8f"];

export default function MoneyWheel() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("moneywheel");
  const [pick, setPick] = useState<number | null>(null);
  const [angle, setAngle] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const step = 360 / SECTORS.length;

  const play = () => {
    if (!canPlay || pick === null) return;
    setBusy(true); setWon(null);
    const win = riggedWin();
    const options = SECTORS.map((v, i) => i).filter(i => (win ? SECTORS[i] === pick : SECTORS[i] !== pick));
    const idx = options[Math.floor(Math.random() * options.length)];
    const stopTick = startTicker(55);
    sfx.spin();
    // sektor markazi ko'rsatkich ostiga aniq to'g'ri keladi
    const target = (360 - (idx * step + step / 2)) % 360;
    setAngle(a => a + 360 * 6 + (((target - (a % 360)) % 360) + 360) % 360);
    setTimeout(async () => {
      stopTick();
      const realWin = SECTORS[idx] === pick;
      if (realWin) sfx.win(); else sfx.lose();
      const w = await settle(realWin ? SECTORS[idx] : 0);
      setAmount(w); setWon(realWin); setBusy(false);
    }, 1700);
  };

  const gradient = `conic-gradient(${SECTORS.map((v, i) =>
    `${COLORS[i % 2]} ${i * step}deg ${(i + 1) * step}deg`).join(",")})`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.moneywheel) }}>
      <GameHeader icon="wheel" title={` ${GAME_NAMES.moneywheel[lang]}`} subtitle="x2 · x5 · x10 · x20 · x40" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-8 flex items-center justify-center relative"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <div className="absolute z-10" style={{ top: 14 }}>
            <div style={{
              width: 0, height: 0,
              borderLeft: "12px solid transparent", borderRight: "12px solid transparent",
              borderTop: "22px solid #f7e59b", filter: "drop-shadow(0 3px 6px rgba(0,0,0,.6))",
            }} />
          </div>
          <div className="rounded-full p-[6px]"
            style={{ background: "linear-gradient(150deg,#fff6cf,#d4af37,#6d4a08)", boxShadow: "0 0 34px rgba(212,175,55,.45)" }}>
            <div className="rounded-full relative"
              style={{
                width: 250, height: 250, background: gradient,
                transform: `rotate(${angle}deg)`,
                transition: "transform 1.6s cubic-bezier(0.16,0.76,0.06,1)",
              }}>
              {SECTORS.map((v, i) => (
                <span key={i} className="absolute font-black text-sm"
                  style={{
                    left: "50%", top: "50%", color: "#fff",
                    transform: `rotate(${i * step + step / 2}deg) translateY(-96px) translateX(-50%)`,
                    textShadow: "0 2px 4px rgba(0,0,0,.7)",
                  }}>x{v}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-5 gap-2">
          {[2, 5, 10, 20, 40].map(v => (
            <button key={v} disabled={busy} onClick={() => { setPick(v); sfx.select(); }}
              className="py-3 rounded-xl font-black active:scale-95 disabled:opacity-40"
              style={{
                background: pick === v ? "linear-gradient(145deg,#f7e59b,#d4af37)" : ts.btnSecondary,
                color: pick === v ? "#2b1c02" : ts.btnSecondaryText,
                border: `1px solid ${ts.cardBorder}`,
              }}>x{v}</button>
          ))}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay || pick === null} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
