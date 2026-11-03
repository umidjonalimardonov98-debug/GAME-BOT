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
    <div className="min-h-screen flex flex-col relative isolate" style={{ background: pageBg(theme, GAME_BG.hands) }}>
      <Ambient behind color="#e879f9" layer="stars" syms={["coin", "question"]} live={busy} />
      <GameHeader icon="coin" title={` ${GAME_NAMES.hands[lang]}`} subtitle={`x${MULT}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">
        <StageFx result={won} innerClassName="w-full flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl relative overflow-hidden px-4 pt-6 pb-8"
          style={{ background: "radial-gradient(ellipse at 50% 30%,#2a6b45 0%,#123b26 60%,#0a2416 100%)",
            border: "2px solid #c9a24a", boxShadow: "inset 0 0 40px rgba(0,0,0,.6),0 10px 30px rgba(0,0,0,.5)" }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(45deg,rgba(255,255,255,.015) 0 2px,transparent 2px 6px)" }} />
          <p className="relative text-center text-xs font-bold tracking-widest mb-3" style={{ color: "#f7e59b" }}>
            {busy ? "• • •" : coinIn === null ? (pick === null ? "?" : "✓") : ""}
          </p>
          <div className="relative grid grid-cols-2 gap-4">
          {([0, 1] as const).map(i => {
            const open = coinIn !== null;
            const hasCoin = coinIn === i;
            const sel = pick === i;
            return (
              <button key={i} disabled={busy} onClick={() => { setPick(i); sfx.select(); }}
                className="relative flex flex-col items-center justify-end"
                style={{ height: 190 }}>
                <div className="absolute bottom-2 rounded-full" style={{ width: 110, height: 18, background: "rgba(0,0,0,.45)", filter: "blur(6px)" }} />
                {sel && !open && <div className="absolute inset-x-2 top-4 bottom-0 rounded-full" style={{ background: "radial-gradient(circle,rgba(247,229,155,.35),transparent 70%)", animation: "gh-pulse 1.4s ease-in-out infinite" }} />}
                <div className="relative" style={{
                  animation: shaking ? `gh-shake${i} .45s ease-in-out infinite` : open ? "gh-open .45s cubic-bezier(.2,1.4,.4,1)" : sel ? "gh-float 2s ease-in-out infinite" : undefined,
                  transform: i === 1 ? "scaleX(-1)" : undefined,
                }}>
                  <img src={open ? "/symbols/palm.webp" : "/symbols/fist.webp"} alt="" draggable={false}
                    style={{ width: 130, height: 150, objectFit: "contain", filter: `drop-shadow(0 8px 12px rgba(0,0,0,.5))${sel ? " drop-shadow(0 0 10px rgba(247,229,155,.7))" : ""}` }} />
                </div>
                {open && hasCoin && (
                  <div className="absolute" style={{ top: 58, animation: "gh-coin .7s cubic-bezier(.2,1.5,.4,1) both" }}>
                    <img src="/symbols/coin-heads.webp" alt="" style={{ width: 56, height: 56, filter: "drop-shadow(0 0 14px rgba(255,215,0,.9))" }} />
                  </div>
                )}
                {open && hasCoin && Array.from({ length: 8 }).map((_, k) => (
                  <span key={k} className="absolute rounded-full" style={{ top: 85, width: 6, height: 6, background: "#ffd54a",
                    animation: `gh-spark .8s ease-out ${k * 0.03}s both`, ["--a" as any]: `${k * 45}deg` }} />
                ))}
                <span className="relative mt-1 text-[11px] font-black px-3 py-0.5 rounded-full"
                  style={{ background: sel ? "#f7e59b" : "rgba(0,0,0,.35)", color: sel ? "#3a2a00" : "#cfe8d6" }}>
                  {i === 0 ? "L" : "R"}
                </span>
              </button>
            );
          })}
          </div>
          <style>{`
            @keyframes gh-shake0{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-18px) rotate(-8deg)}}
            @keyframes gh-shake1{0%,100%{transform:scaleX(-1) translateY(0) rotate(0)}50%{transform:scaleX(-1) translateY(-18px) rotate(-8deg)}}
            @keyframes gh-open{0%{transform:scale(.85)}100%{transform:scale(1)}}
            @keyframes gh-float{0%,100%{translate:0 0}50%{translate:0 -5px}}
            @keyframes gh-pulse{0%,100%{opacity:.5}50%{opacity:1}}
            @keyframes gh-coin{0%{transform:translateY(20px) scale(.2) rotateY(0)}100%{transform:translateY(0) scale(1) rotateY(720deg)}}
            @keyframes gh-spark{0%{transform:rotate(var(--a)) translateX(0);opacity:1}100%{transform:rotate(var(--a)) translateX(60px);opacity:0}}
          `}</style>
        </div>

        </StageFx>
        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <div className="bet-dock">
          <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
          <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay || pick === null} />
        </div>
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
