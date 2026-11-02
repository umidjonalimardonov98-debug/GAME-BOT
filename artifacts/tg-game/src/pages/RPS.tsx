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
  const [count, setCount] = useState<number | null>(null);

  const play = () =>{
    if (!canPlay) return;
    setBusy(true); setWon(null); setBot(null);
    const win = riggedWin("rps");
    const b = win ? (pick + 2) % 3 : (pick + 1) % 3;
    const stopTick = startTicker(80);
    setCount(3);
    setTimeout(() => setCount(2), 450);
    setTimeout(() => setCount(1), 900);
    const iv = setInterval(() => setRolling(r => (r + 1) % 3), 110);
    setTimeout(async () =>{
      clearInterval(iv); stopTick(); setCount(null);
      setBot(b);
      const w = await settle(win ? 1.9 : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 1350);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.rps) }}>
      <GameHeader icon="rock" title={` ${GAME_NAMES.rps[lang]}`} subtitle="x1.9" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl relative overflow-hidden py-6 px-3"
          style={{ background: "linear-gradient(90deg,#0b2a5c 0%,#0a1630 50%,#5c0b1a 100%)",
            border: "1px solid rgba(255,255,255,.12)", boxShadow: "inset 0 0 50px rgba(0,0,0,.6),0 10px 30px rgba(0,0,0,.45)" }}>
          <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: "linear-gradient(transparent,rgba(255,255,255,.4),transparent)" }} />
          <div className="relative flex items-center justify-between">
            {[0, 1].map(side => {
              const ic = side === 0 ? ICON[pick] : (bot === null ? ICON[rolling] : ICON[bot]);
              const res = won === null ? null : (side === 0 ? won : !won);
              return (
                <div key={side} className="flex flex-col items-center gap-2" style={{ width: "42%" }}>
                  <span className="text-[10px] font-black tracking-widest" style={{ color: side === 0 ? "#7fb2ff" : "#ff8a9a" }}>{side === 0 ? "YOU" : "BOT"}</span>
                  <div className="rounded-full flex items-center justify-center" style={{
                    width: 112, height: 112,
                    background: `radial-gradient(circle,${side === 0 ? "rgba(60,130,255,.35)" : "rgba(255,60,90,.35)"},transparent 70%)`,
                    boxShadow: res === true ? "0 0 30px 6px rgba(255,215,0,.7)" : undefined,
                    animation: busy ? `rps-pump .45s ease-in-out infinite` : res === true ? "rps-win .6s ease" : res === false ? "rps-lose .5s ease" : undefined,
                    opacity: res === false ? .45 : 1, filter: res === false ? "grayscale(.7)" : undefined, transition: "opacity .3s",
                  }}>
                    <Sym n={ic} s={84} style={{ transform: side === 1 ? "scaleX(-1)" : undefined }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {count !== null
              ? <span key={count} className="font-black" style={{ fontSize: 46, color: "#fff", textShadow: "0 0 20px #ffd54a", animation: "rps-count .45s ease-out" }}>{count}</span>
              : <span className="font-black text-xl rounded-full px-3 py-1" style={{ color: "#ffd54a", background: "rgba(0,0,0,.5)", border: "1px solid #ffd54a55" }}>VS</span>}
          </div>
          <style>{`
            @keyframes rps-pump{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
            @keyframes rps-win{0%{transform:scale(1)}40%{transform:scale(1.25) rotate(-6deg)}100%{transform:scale(1)}}
            @keyframes rps-lose{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
            @keyframes rps-count{0%{transform:scale(2.2);opacity:0}100%{transform:scale(1);opacity:1}}
          `}</style>
        </div>

        <div className="w-full grid grid-cols-3 gap-2">
          {ICON.map((ic, i) => (
            <button key={i} disabled={busy} onClick={() =>{ setPick(i); sfx.select(); }}
              className="py-3 rounded-xl font-black active:scale-95 disabled:opacity-40"
              style={{
                background: pick === i ? "linear-gradient(135deg,#1668e3,#0d4fb0)" : ts.btnSecondary, boxShadow: pick === i ? "0 0 16px rgba(22,104,227,.6)" : undefined, transform: pick === i ? "translateY(-3px)" : undefined, transition: "all .2s",
                color: pick === i ? "#fff" : ts.btnSecondaryText, border: `1px solid ${ts.cardBorder}`,
              }}>
              <Sym n={ic} s={34} /><br />
              <span style={{ fontSize: 9 }}>{g(i === 0 ? "rock": i === 1 ?"paper":"scissors", lang)}</span>
            </button>
          ))}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <div className="bet-dock">
          <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
          <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        </div>
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
