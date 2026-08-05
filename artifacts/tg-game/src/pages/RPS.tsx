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

const ICON = ["rock", "paper", "scissors"];

export default function RPS() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("rps");
  const [pick, setPick] = useState(0);
  const [bot, setBot] = useState<number | null>(null);
  const [rolling, setRolling] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const play = () =>{
    if (!canPlay) return;
    setBusy(true); setWon(null); setBot(null);
    const win = riggedWin();
    const b = win ? (pick + 2) % 3 : (pick + 1) % 3;
    const stopTick = startTicker(80);
    const iv = setInterval(() => setRolling(r => (r + 1) % 3), 110);
    setTimeout(async () =>{
      clearInterval(iv); stopTick();
      setBot(b);
      if (win) sfx.win(); else sfx.lose();
      const w = await settle(win ? 1.9 : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 950);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.rps) }}>
      <GameHeader icon="rock" title={` ${GAME_NAMES.rps[lang]}`} subtitle="x1.9" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-8 flex items-center justify-around"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <Sym n={ICON[pick]} s={82} />
          <span className="font-black text-xl" style={{ color: ts.textSub }}>VS</span>
          <Sym n={bot === null ? ICON[rolling] : ICON[bot]} s={82} />
        </div>

        <div className="w-full grid grid-cols-3 gap-2">
          {ICON.map((ic, i) => (
            <button key={i} disabled={busy} onClick={() =>{ setPick(i); sfx.select(); }}
              className="py-3 rounded-xl font-black active:scale-95 disabled:opacity-40"
              style={{
                background: pick === i ? "linear-gradient(135deg,#1668e3,#0d4fb0)" : ts.btnSecondary,
                color: pick === i ? "#fff" : ts.btnSecondaryText, border: `1px solid ${ts.cardBorder}`,
              }}>
              <Sym n={ic} s={34} /><br />
              <span style={{ fontSize: 9 }}>{g(i === 0 ? "rock": i === 1 ?"paper":"scissors", lang)}</span>
            </button>
          ))}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
