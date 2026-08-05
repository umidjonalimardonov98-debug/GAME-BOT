import { useState, useRef, useEffect } from "react";
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

const PRIZES = [
  { m: 0, icon: "skull", color: "#6b7280" },
  { m: 1.5, icon: "medal-bronze", color: "#b45309" },
  { m: 0, icon: "rock", color: "#6b7280" },
  { m: 3, icon: "medal-silver", color: "#94a3b8" },
  { m: 0, icon: "paper", color: "#6b7280" },
  { m: 8, icon: "medal-gold", color: "#f59e0b" },
  { m: 0, icon: "skull", color: "#6b7280" },
  { m: 25, icon: "gem", color: "#22d3ee" },
];
const CELL = 92;

export default function CaseOpen() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("case");
  const [offset, setOffset] = useState(0);
  const [spin, setSpin] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () =>{ if (timer.current) clearTimeout(timer.current); }, []);

  const strip = Array.from({ length: 60 }, (_, i) => PRIZES[i % PRIZES.length]);

  const play = () =>{
    if (!canPlay) return;
    setBusy(true); setWon(null); setSpin(true);
    const win = riggedWin();
    const pool = PRIZES.map((p, i) => ({ p, i })).filter(x => (win ? x.p.m > 0 : x.p.m === 0));
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const idx = 40 + chosen.i;
    const stopTick = startTicker(70);
    sfx.spin();
    setOffset(idx * CELL);
    timer.current = setTimeout(async () =>{
      stopTick(); setSpin(false);
      const m = chosen.p.m;
      if (m > 0) sfx.win(m >= 8); else sfx.lose();
      const w = await settle(m);
      setAmount(w); setWon(m > 0); setBusy(false);
    }, 1750);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.caseopen) }}>
      <GameHeader icon="chest" title={` ${GAME_NAMES.case[lang]}`} subtitle="x25" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl py-6 relative overflow-hidden"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <div style={{
            position: "absolute", left: "50%", top: 0, bottom: 0, width: 3,
            background: "#fbbf24", boxShadow: "0 0 14px #fbbf24", zIndex: 2, transform: "translateX(-50%)",
          }} />
          <div className="flex" style={{
            transform: `translateX(calc(50% - ${offset + CELL / 2}px))`,
            transition: spin ? "transform 1.6s cubic-bezier(0.16,0.76,0.06,1)":"none",
          }}>
            {strip.map((p, i) => (
              <div key={i} className="shrink-0 flex items-center justify-center rounded-xl mx-0.5"
                style={{ width: CELL - 4, height: 92, fontSize: 38, background: `${p.color}22`, border: `1px solid ${p.color}66` }}>
                <Sym n={p.icon} s={56} />
              </div>
            ))}
          </div>
        </div>

        <div className="w-full grid grid-cols-4 gap-1.5">
          {PRIZES.filter(p => p.m > 0).map((p, i) => (
            <div key={i} className="rounded-xl py-2 text-center font-black" style={{ fontSize: 11, background: `${p.color}22`, color: p.color }}>
              <Sym n={p.icon} s={18} /> x{p.m}
            </div>
          ))}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("openCase", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
