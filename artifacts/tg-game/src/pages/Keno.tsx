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

const TOTAL = 40;
const PICKS = 5;
const PAY: Record<number, number> = { 0: 0, 1: 0, 2: 1.4, 3: 4, 4: 14, 5: 60 };

export default function Keno() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("keno");
  const [picks, setPicks] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const [hits, setHits] = useState(0);

  const toggle = (n: number) =>{
    if (busy) return;
    sfx.select();
    setPicks(p => p.includes(n) ? p.filter(x => x !== n) : p.length < PICKS ? [...p, n] : p);
  };

  const play = () =>{
    if (!canPlay || picks.length !== PICKS) return;
    setBusy(true); setWon(null); setDrawn([]); setHits(0);

    const win = riggedWin("keno");
    const hitCount = win ? (Math.random() < 0.8 ? 2 : Math.random() < 0.85 ? 3 : 4) : (Math.random() < 0.6 ? 0 : 1);
    const chosenHits = [...picks].sort(() => Math.random() - 0.5).slice(0, hitCount);
    const rest = Array.from({ length: TOTAL }, (_, i) => i + 1)
      .filter(n => !picks.includes(n))
      .sort(() => Math.random() - 0.5)
      .slice(0, PICKS - hitCount);
    const result = [...chosenHits, ...rest].sort((a, b) => a - b);

    const stopTick = startTicker(150);
    result.forEach((n, i) => setTimeout(() =>{ setDrawn(d => [...d, n]); sfx.reveal(); }, i * 260));
    setTimeout(async () =>{
      stopTick();
      setHits(hitCount);
      const mult = PAY[hitCount] ?? 0;
      const w = await settle(mult);
      setAmount(w); setWon(mult > 0); setBusy(false);
    }, result.length * 260 + 250);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.keno) }}>
      <GameHeader icon="ticket" title={` ${GAME_NAMES.keno[lang]}`} subtitle="x60" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">
        <StageFx result={won} innerClassName="w-full flex flex-col gap-4 items-center">

        <p className="text-xs font-bold" style={{ color: ts.textSub }}>{g("pickNums", lang)} ({picks.length}/{PICKS})</p>

        <style>{`
          @keyframes knDrop { 0%{transform:translateY(-40px) scale(.4);opacity:0} 60%{transform:translateY(4px) scale(1.15);opacity:1} 100%{transform:none} }
          @keyframes knHit { 0%,100%{box-shadow:0 0 0 2px #fde68a,0 0 10px #f59e0b} 50%{box-shadow:0 0 0 2px #fff,0 0 22px #fbbf24} }
        `}</style>
        <div className="w-full flex justify-center gap-2 min-h-[46px] rounded-2xl py-2 px-2" style={{ background: "linear-gradient(180deg,#0b1424,#050a14)", border: "1px solid rgba(251,191,36,.3)", boxShadow: "inset 0 4px 14px rgba(0,0,0,.7)" }}>
          {drawn.map(n => {
            const hit = picks.includes(n);
            return (
              <span key={n} className="w-[38px] h-[38px] rounded-full flex items-center justify-center font-black text-sm"
                style={{
                  background: hit ? "radial-gradient(circle at 35% 30%,#fff7c2,#f59e0b 55%,#92400e)" : "radial-gradient(circle at 35% 30%,#ffffff,#cbd5e1 55%,#64748b)",
                  color: hit ? "#451a03" : "#0f172a", boxShadow: "0 4px 8px rgba(0,0,0,.6), inset 0 -3px 6px rgba(0,0,0,.25)",
                  animation: "knDrop .45s cubic-bezier(.2,.9,.3,1.3)",
                }}>{n}</span>
            );
          })}
        </div>
        <div className="w-full grid grid-cols-8 gap-1.5 rounded-2xl p-2" style={{ background: "linear-gradient(180deg,rgba(12,22,40,.9),rgba(5,10,20,.95))", border: "1px solid rgba(120,170,255,.2)" }}>
          {Array.from({ length: TOTAL }, (_, i) => i + 1).map(n =>{
            const sel = picks.includes(n);
            const hit = drawn.includes(n);
            return (
              <button key={n} onClick={() => toggle(n)} disabled={busy}
                className="aspect-square rounded-full font-black text-xs active:scale-90 transition-all"
                style={{
                  background: hit && sel ? "radial-gradient(circle at 35% 30%,#bbf7d0,#22c55e 55%,#14532d)"
                    : hit ? "radial-gradient(circle at 35% 30%,#fff7c2,#f59e0b 55%,#92400e)"
                    : sel ? "radial-gradient(circle at 35% 30%,#bfdbfe,#2563eb 55%,#1e3a8a)"
                    : "radial-gradient(circle at 35% 30%,#2a3a55,#121c2e 70%)",
                  color: sel || hit ? "#fff" : "rgba(255,255,255,.55)",
                  boxShadow: "0 3px 6px rgba(0,0,0,.55), inset 0 -2px 4px rgba(0,0,0,.35)",
                  animation: hit && sel ? "knHit 1s ease-in-out infinite" : hit ? "knDrop .4s ease-out" : undefined,
                  transform: sel ? "scale(1.06)" : undefined,
                }}>
                {n}
              </button>
            );
          })}
        </div>

        {!!drawn.length && (
          <p className="text-sm font-black"style={{ color:"#fbbf24" }}>
            {g("matched", lang)}: {hits} → x{PAY[hits] ?? 0}
          </p>
        )}

        </StageFx>
        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <div className="bet-dock">
          <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
          <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay || picks.length !== PICKS} />
        </div>
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
