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

const MULT = 3.5;
const CARDS = ["crown", "gem", "clover", "skull"] as const;

/** Lucky Card — 4 ta yopiq kartadan omadlisini toping */
export default function LuckyCard() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("luckycard");
  const [pick, setPick] = useState<number | null>(null);
  const [lucky, setLucky] = useState<number | null>(null);
  const [flip, setFlip] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const play = () => {
    if (!canPlay || pick === null) return;
    setBusy(true); setWon(null); setLucky(null); setFlip(true);
    const win = riggedWin();
    const stopTick = startTicker(90);
    sfx.spin();
    setTimeout(async () => {
      stopTick(); setFlip(false);
      const other = [0, 1, 2, 3].filter(i => i !== pick);
      const res = win ? pick : other[Math.floor(Math.random() * other.length)];
      setLucky(res);
      if (win) sfx.win(); else sfx.lose();
      const w = await settle(win ? MULT : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.luckycard) }}>
      <GameHeader icon="cardback" title={` ${GAME_NAMES.luckycard[lang]}`} subtitle={`x${MULT}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-8 grid grid-cols-4 gap-2 px-4"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          {CARDS.map((sym, i) => {
            const open = lucky !== null;
            const isLucky = lucky === i;
            return (
              <button key={i} disabled={busy} onClick={() => { setPick(i); sfx.select(); }}
                className="rounded-2xl flex items-center justify-center active:scale-95"
                style={{
                  height: 110,
                  background: open
                    ? (isLucky ? "linear-gradient(160deg,#f7e59b,#d4af37,#8a6b16)" : "linear-gradient(160deg,#1f2937,#0b1220)")
                    : "linear-gradient(160deg,#123a6b,#0b1f3d)",
                  border: `2px solid ${pick === i ? "#f7e59b" : "rgba(255,255,255,.1)"}`,
                  boxShadow: pick === i ? "0 0 18px rgba(247,229,155,.45)" : "0 8px 18px rgba(0,0,0,.4)",
                  transform: flip ? "rotateY(180deg)" : "rotateY(0)",
                  transition: "transform .32s, background .22s",
                }}>
                {open ? <Sym n={isLucky ? "crown" : sym} s={44} glow={isLucky} /> : <Sym n="cardback" s={44} />}
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
