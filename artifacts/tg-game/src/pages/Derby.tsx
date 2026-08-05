import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import Sym from "@/components/casino/Sym";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

const MULT = 3.6;
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];

/** Derby Racing — 4 ta ot, birinchi kelganini toping */
export default function Derby() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("derby");
  const [pick, setPick] = useState<number | null>(null);
  const [pos, setPos] = useState([0, 0, 0, 0]);
  const [winner, setWinner] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const play = () => {
    if (!canPlay || pick === null) return;
    setBusy(true); setWon(null); setWinner(null); setPos([0, 0, 0, 0]);
    const win = riggedWin();
    const others = [0, 1, 2, 3].filter(i => i !== pick);
    const first = win ? pick : others[Math.floor(Math.random() * others.length)];
    const stopTick = startTicker(60);
    sfx.spin();

    const steps = 30;
    let n = 0;
    const iv = setInterval(() => {
      n++;
      const t = n / steps;
      setPos([0, 1, 2, 3].map(i =>
        Math.min(100, (i === first ? 100 : 78 + Math.random() * 14) * t + (i === first ? 0 : 0))
      ));
    }, 100);

    setTimeout(async () => {
      clearInterval(iv); stopTick();
      setPos([0, 1, 2, 3].map(i => (i === first ? 100 : 74 + Math.random() * 18)));
      setWinner(first);
      if (win) sfx.win(); else sfx.lose();
      const w = await settle(win ? MULT : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.derby) }}>
      <GameHeader icon="trophy" title={` ${GAME_NAMES.derby[lang]}`} subtitle={`x${MULT}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-5 px-4 flex flex-col gap-3"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          {[0, 1, 2, 3].map(i => (
            <button key={i} disabled={busy} onClick={() => { setPick(i); sfx.select(); }}
              className="relative rounded-xl h-12 overflow-hidden active:scale-[.99]"
              style={{
                background: "linear-gradient(90deg,#0b2a1a,#0e4a2b)",
                border: `2px solid ${pick === i ? "#f7e59b" : "rgba(255,255,255,.08)"}`,
              }}>
              <div className="absolute inset-y-0 right-1 flex items-center">
                <span className="text-xs font-black" style={{ color: winner === i ? "#f7e59b" : "rgba(255,255,255,.3)" }}>
                  {winner === i ? "1st" : `#${i + 1}`}
                </span>
              </div>
              <div className="absolute top-1/2 -translate-y-1/2"
                style={{ left: `calc(${pos[i]}% - 34px)`, transition: "left .1s linear" }}>
                <span className="rounded-full flex items-center justify-center"
                  style={{ display: "flex", width: 30, height: 30, background: COLORS[i], boxShadow: `0 0 12px ${COLORS[i]}` }}>
                  <Sym n="rocket" s={20} />
                </span>
              </div>
            </button>
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
