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

const MULT = 2.8;

/** Naperstki — 3 ta stakan, ball qaysi birida? */
export default function Thimbles() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("thimbles");
  const [pick, setPick] = useState<number | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [ball, setBall] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const [shift, setShift] = useState([0, 0, 0]);

  const play = () => {
    if (!canPlay || pick === null) return;
    setBusy(true); setWon(null); setBall(null); setShuffling(true);
    const win = riggedWin();
    const stopTick = startTicker(80);
    sfx.spin();
    const iv = setInterval(() => setShift([
      Math.round((Math.random() - 0.5) * 60),
      Math.round((Math.random() - 0.5) * 60),
      Math.round((Math.random() - 0.5) * 60),
    ]), 180);
    setTimeout(async () => {
      clearInterval(iv); stopTick(); setShift([0, 0, 0]); setShuffling(false);
      const other = [0, 1, 2].filter(i => i !== pick);
      const res = win ? pick : other[Math.floor(Math.random() * other.length)];
      setBall(res);
      if (win) sfx.win(); else sfx.lose();
      const w = await settle(win ? MULT : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.thimbles) }}>
      <GameHeader icon="question" title={` ${GAME_NAMES.thimbles[lang]}`} subtitle={`x${MULT}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-8 flex items-end justify-center gap-4"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          {[0, 1, 2].map(i => {
            const open = ball !== null;
            const hasBall = ball === i;
            return (
              <button key={i} disabled={busy} onClick={() => { setPick(i); sfx.select(); }}
                className="flex flex-col items-center gap-2 active:scale-95 disabled:opacity-100"
                style={{ transform: `translateX(${shift[i]}px)`, transition: "transform .16s ease-out" }}>
                <div className="rounded-t-full flex items-end justify-center"
                  style={{
                    width: 74, height: open && hasBall ? 30 : 92,
                    background: pick === i
                      ? "linear-gradient(160deg,#f7e59b,#d4af37 55%,#8a6b16)"
                      : "linear-gradient(160deg,#b91c1c,#7f1d1d)",
                    boxShadow: "0 10px 22px rgba(0,0,0,.45), inset 0 4px 10px rgba(255,255,255,.25)",
                    transition: "height .32s",
                  }} />
                <div className="flex items-center justify-center" style={{ height: 30 }}>
                  {open && hasBall && <Sym n="gem" s={28} glow />}
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-black tracking-widest" style={{ color: ts.textSub }}>
          {shuffling ? "..." : g("choose", lang)}
        </p>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay || pick === null} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
