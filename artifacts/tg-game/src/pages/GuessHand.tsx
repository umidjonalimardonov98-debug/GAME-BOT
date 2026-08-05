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

const MULT = 1.9;

/** Guess which hand — tanga qaysi qo'lda? */
export default function GuessHand() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("hands");
  const [pick, setPick] = useState<0 | 1 | null>(null);
  const [coinIn, setCoinIn] = useState<0 | 1 | null>(null);
  const [shaking, setShaking] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const play = () => {
    if (!canPlay || pick === null) return;
    setBusy(true); setWon(null); setCoinIn(null); setShaking(true);
    const win = riggedWin("hands");
    const stopTick = startTicker(85);
    sfx.spin();
    setTimeout(async () => {
      stopTick(); setShaking(false);
      const res: 0 | 1 = win ? pick : (pick === 0 ? 1 : 0);
      setCoinIn(res);
      const w = await settle(win ? MULT : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.hands) }}>
      <GameHeader icon="coin" title={` ${GAME_NAMES.hands[lang]}`} subtitle={`x${MULT}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-10 grid grid-cols-2 gap-4 px-6"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          {([0, 1] as const).map(i => {
            const open = coinIn !== null;
            const hasCoin = coinIn === i;
            return (
              <button key={i} disabled={busy} onClick={() => { setPick(i); sfx.select(); }}
                className="rounded-3xl flex items-center justify-center active:scale-95"
                style={{
                  height: 150,
                  background: pick === i
                    ? "linear-gradient(160deg,#f7e59b22,#d4af3722)"
                    : "rgba(255,255,255,.04)",
                  border: `2px solid ${pick === i ? "#f7e59b" : "rgba(255,255,255,.1)"}`,
                  transform: shaking ? `rotate(${i === 0 ? -6 : 6}deg)` : "rotate(0)",
                  transition: "transform .16s",
                  animation: shaking ? "dice-bounce 0.5s infinite" : undefined,
                }}>
                {open
                  ? (hasCoin ? <Sym n="coin" s={64} glow className="idle-bob" /> : <Sym n="question" s={54} />)
                  : <Sym n="paper" s={64} />}
              </button>
            );
          })}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay || pick === null} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
