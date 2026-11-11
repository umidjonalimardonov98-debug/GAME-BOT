import { Ambient } from "@/components/casino/GameAtmosphere";
import StageFx from "@/components/casino/StageFx";
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

export default function CoinFlip() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("coinflip");
  const [side, setSide] = useState<"h"|"t">("h");
  const [spin, setSpin] = useState(false);
  const [face, setFace] = useState<"h"|"t">("h");
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const play = () =>{
    if (!canPlay) return;
    setBusy(true); setWon(null); setSpin(true);
    const win = riggedWin("coinflip");
    const stopTick = startTicker(70);
    sfx.spin();
    setTimeout(async () =>{
      stopTick(); setSpin(false);
      const res: "h"|"t"= win ? side : (side ==="h"?"t":"h");
      setFace(res);
      const w = await settle(win ? 1.9 : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col relative isolate" style={{ background: pageBg(theme, GAME_BG.coinflip) }}>
      <Ambient behind color="#fbbf24" layer="stars" syms={["coin", "coin1"]} live={busy} />
      <GameHeader icon="coin" title={` ${GAME_NAMES.coinflip[lang]}`} subtitle="x1.9" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">
        <StageFx pattern="spiral" syms={["coin", "coin1"]} color="#fbbf24" result={won} innerClassName="w-full flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl relative overflow-hidden flex items-center justify-center" style={{
          height: 260, perspective: 900,
          background: "radial-gradient(ellipse at 50% 30%, rgba(251,191,36,.18), transparent 60%), linear-gradient(180deg,#14233a,#070d18)",
          border: "1px solid rgba(251,191,36,.35)", boxShadow: "inset 0 0 50px rgba(0,0,0,.7), 0 14px 30px rgba(0,0,0,.45)",
        }}>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full" style={{
            width: spin ? 70 : 130, height: 16, background: "radial-gradient(ellipse, rgba(0,0,0,.6), transparent 70%)", transition: "width .5s",
          }} />
          <div style={{
            width: 150, height: 150, position: "relative", transformStyle: "preserve-3d",
            animation: spin ? "cfToss 1s cubic-bezier(.3,.6,.4,1)" : won !== null ? "cfLand .45s ease-out" : "cfIdle 3s ease-in-out infinite",
            transform: face === "t" ? "rotateY(180deg)" : "rotateY(0deg)",
          }}>
            <img src="/symbols/coin-heads.webp" alt="" width={150} height={150} draggable={false}
              style={{ position: "absolute", inset: 0, width: 150, height: 150, backfaceVisibility: "hidden", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.6))" }} />
            <img src="/symbols/coin-tails.webp" alt="" width={150} height={150} draggable={false}
              style={{ position: "absolute", inset: 0, width: 150, height: 150, backfaceVisibility: "hidden", transform: "rotateY(180deg)", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.6))" }} />
          </div>
          <style>{`
            @keyframes cfToss { 0%{transform:translateY(0) rotateX(0)} 50%{transform:translateY(-70px) rotateX(1440deg) scale(1.15)} 100%{transform:translateY(0) rotateX(2880deg)} }
            @keyframes cfLand { 0%{scale:1.12} 60%{scale:.94} 100%{scale:1} }
            @keyframes cfIdle { 0%,100%{translate:0 0} 50%{translate:0 -6px} }
          `}</style>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          {(["h", "t"] as const).map(s => (
            <button key={s} disabled={busy} onClick={() =>{ setSide(s); sfx.select(); }}
              className="py-4 rounded-2xl font-black active:scale-95 disabled:opacity-40"
              style={{
                background: side === s ? "linear-gradient(145deg,#b3121f,#7a0c16)" : ts.btnSecondary,
                color: side === s ? "#fff" : ts.btnSecondaryText,
                border: `1px solid ${ts.cardBorder}`,
              }}>
              <span className="inline-flex items-center gap-2">
                <img src={s === "h" ? "/symbols/coin-heads.webp" : "/symbols/coin-tails.webp"} alt="" width={26} height={26} style={{ width: 26, height: 26 }} />
                {s === "h" ? g("heads", lang) : g("tails", lang)}
              </span>
            </button>
          ))}
        </div>

        </StageFx>
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
