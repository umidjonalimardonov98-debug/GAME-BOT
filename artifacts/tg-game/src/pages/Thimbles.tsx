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
  const [order, setOrder] = useState([0, 1, 2]);
  const [hop, setHop] = useState([false, false, false]);

  const play = () => {
    if (!canPlay || pick === null) return;
    setBusy(true); setWon(null); setBall(null); setShuffling(true);
    const win = riggedWin("thimbles");
    const stopTick = startTicker(80);
    sfx.spin();
    const iv = setInterval(() => {
      setOrder(o => {
        const n = [...o]; const a = Math.floor(Math.random() * 3); let b = Math.floor(Math.random() * 3); if (b === a) b = (a + 1) % 3;
        [n[a], n[b]] = [n[b], n[a]];
        const h = [false, false, false]; h[n[a]] = true; setHop(h);
        return n;
      });
    }, 360);
    setTimeout(async () => {
      clearInterval(iv); stopTick(); setHop([false, false, false]); setShuffling(false);
      const other = [0, 1, 2].filter(i => i !== pick);
      const res = win ? pick : other[Math.floor(Math.random() * other.length)];
      setBall(res);
      const w = await settle(win ? MULT : 0);
      setAmount(w); setWon(win); setBusy(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen flex flex-col relative isolate" style={{ background: pageBg(theme, GAME_BG.thimbles) }}>
      <Ambient behind color="#b45309" layer="smoke" syms={["coin", "question"]} live={busy} />
      <GameHeader icon="question" title={` ${GAME_NAMES.thimbles[lang]}`} subtitle={`x${MULT}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">
        <StageFx result={won} innerClassName="w-full flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl relative overflow-hidden" style={{
          height: 250,
          background: "radial-gradient(ellipse at 50% 35%, #1f7a4a 0%, #0f4a2c 55%, #06261a 100%)",
          border: "3px solid #6b4a1f",
          boxShadow: "inset 0 0 40px rgba(0,0,0,.7), 0 14px 30px rgba(0,0,0,.5), 0 0 0 2px #c9a24a",
        }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(45deg, rgba(255,255,255,.018) 0 2px, transparent 2px 5px)" }} />
          <div className="absolute inset-x-6 bottom-9 h-5 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(0,0,0,.45), transparent 70%)" }} />
          {[0, 1, 2].map(i => {
            const slot = order.indexOf(i);
            const open = ball !== null;
            const lift = open ? (ball === i || pick === i ? -78 : -40) : shuffling ? (hop[i] ? -18 : 0) : pick === i ? -8 : 0;
            return (
              <button key={i} disabled={busy} onClick={() => { setPick(i); sfx.select(); }}
                aria-label={`cup ${i + 1}`}
                className="absolute bottom-6"
                style={{
                  left: `calc(${slot * 33.333 + 16.666}% - 40px)`, width: 80, height: 150,
                  transition: "left .32s cubic-bezier(.45,.05,.35,1)", zIndex: hop[i] ? 3 : 2,
                  background: "transparent", border: "none", padding: 0,
                }}>
                <div className="absolute left-1/2 bottom-1 -translate-x-1/2" style={{ opacity: open && ball === i ? 1 : 0, transition: "opacity .25s .15s" }}>
                  <img src="/symbols/ball.webp" alt="" width={34} height={34} draggable={false}
                    style={{ width: 34, height: 34, filter: "drop-shadow(0 4px 6px rgba(0,0,0,.6))", animation: open && ball === i ? "popIn .5s ease-out" : undefined }} />
                </div>
                <img src="/symbols/cup.webp" alt="" width={80} height={100} draggable={false}
                  className="absolute left-0 bottom-0"
                  style={{
                    width: 80, height: 100, objectFit: "contain",
                    transform: `translateY(${lift}px) rotate(${open && (ball === i || pick === i) ? (i - 1) * 6 : 0}deg)`,
                    transition: "transform .38s cubic-bezier(.2,.9,.3,1.2)",
                    filter: pick === i && !open ? "drop-shadow(0 0 14px rgba(251,191,36,.9)) drop-shadow(0 10px 10px rgba(0,0,0,.55))" : "drop-shadow(0 12px 10px rgba(0,0,0,.6))",
                  }} />
              </button>
            );
          })}
          {won !== null && (
            <div className="absolute top-3 inset-x-0 text-center font-black tracking-widest" style={{ color: won ? "#fde68a" : "#fca5a5", fontSize: 13, animation: "popIn .4s ease-out" }}>
              {won ? "TOPDINGIZ!" : "BU YERDA EDI"}
            </div>
          )}
        </div>

        <p className="text-xs font-black tracking-widest" style={{ color: ts.textSub }}>
          {shuffling ? "..." : g("choose", lang)}
        </p>

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
