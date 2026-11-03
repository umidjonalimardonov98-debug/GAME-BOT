import StageFx from "@/components/casino/StageFx";
import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import Sym from "@/components/casino/Sym";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

const LEVELS = 8;
const MULTS = [1.35, 1.9, 2.7, 3.9, 5.6, 8.2, 12, 20];

export default function Towers() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("towers");
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(false);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [boom, setBoom] = useState<{ lvl: number; col: number } | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const start = () =>{
    if (!canPlay) return;
    sfx.spin();
    setActive(true); setBusy(true); setLevel(0); setPicked({}); setBoom(null); setWon(null);
  };

  const choose = async (col: number) =>{
    if (!active) return;
    const safe = riggedWin("towers") || level < 1; // birinchi bosqich yengilroq
    setPicked(p => ({ ...p, [level]: col }));
    if (!safe) {
      sfx.boom();
      setBoom({ lvl: level, col });
      setActive(false);
      const w = await settle(0);
      setAmount(w); setWon(false); setBusy(false);
      return;
    }
    sfx.tile();
    if (level + 1 >= LEVELS) {
      const w = await settle(MULTS[LEVELS - 1]);
      setAmount(w); setWon(true); setActive(false); setBusy(false);
      return;
    }
    setLevel(l => l + 1);
  };

  const cashout = async () =>{
    if (!active || level === 0) return;
    sfx.cash();
    const w = await settle(MULTS[level - 1]);
    setAmount(w); setWon(true); setActive(false); setBusy(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.towers) }}>
      <GameHeader icon="gem" title={` ${GAME_NAMES.towers[lang]}`} subtitle="x20" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">
        <StageFx result={won} innerClassName="w-full flex flex-col gap-4 items-center">

        <style>{`
          @keyframes twRow { 0%,100%{box-shadow:0 0 0 1px rgba(251,191,36,.5),0 0 14px rgba(251,191,36,.25)} 50%{box-shadow:0 0 0 1px rgba(251,191,36,.9),0 0 24px rgba(251,191,36,.55)} }
          @keyframes twPop { 0%{transform:scale(.4) rotate(-20deg);opacity:0} 70%{transform:scale(1.2)} 100%{transform:scale(1);opacity:1} }
          @keyframes twShake { 0%,100%{transform:none} 25%{transform:translateX(-5px) rotate(-2deg)} 75%{transform:translateX(5px) rotate(2deg)} }
        `}</style>
        <div className="w-full rounded-3xl p-3 flex flex-col-reverse gap-1.5 relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg,rgba(20,14,6,.85),rgba(40,26,10,.92)), repeating-linear-gradient(0deg,#3b2a14 0 22px,#2c1f0e 22px 24px)",
            border: "2px solid #8a6b2a", boxShadow: "inset 0 0 40px rgba(0,0,0,.7), 0 14px 30px rgba(0,0,0,.5)",
            animation: boom ? "twShake .5s" : undefined,
          }}>
          {Array.from({ length: LEVELS }).map((_, lvl) => (
            <div key={lvl} className="flex items-center gap-2 rounded-xl px-1 py-0.5" style={{ animation: active && lvl === level ? "twRow 1.2s ease-in-out infinite" : undefined }}>
              <span className="font-black w-10 text-right"style={{ fontSize: 10, color: lvl === level && active ?"#fbbf24" : ts.textSub }}>
                x{MULTS[lvl]}
              </span>
              <div className="flex-1 grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map(col =>{
                  const done = picked[lvl] === col;
                  const exploded = boom?.lvl === lvl && boom.col === col;
                  const current = active && lvl === level;
                  return (
                    <button key={col} disabled={!current} onClick={() => choose(col)}
                      className="h-11 rounded-lg font-black text-sm active:scale-95 transition-all flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: exploded ? "radial-gradient(circle,#ef4444,#7f1d1d)" : done ? "radial-gradient(circle,#2dd47a,#0b5b33)" : current
                          ? "linear-gradient(180deg,#d6a547,#8a5a17)" : "linear-gradient(180deg,#5a4220,#3a2a12)",
                        border: `1px solid ${current ? "#ffd77a" : "rgba(0,0,0,.5)"}`,
                        boxShadow: "inset 0 2px 0 rgba(255,255,255,.25), inset 0 -3px 0 rgba(0,0,0,.35), 0 3px 0 rgba(0,0,0,.45)",
                        color: "#fff",
                        opacity: current || done || exploded ? 1 : lvl < level ? 0.55 : 0.75,
                      }}>
                      {current && <span className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(110deg,transparent 30%,rgba(255,255,255,.35) 50%,transparent 70%)", animation: "proShine 2.2s ease-in-out infinite" }} />}
                      {exploded ? <span style={{ animation: "twPop .45s ease-out" }}><Sym n="boom" s={34} /></span>
                        : done ? <span style={{ animation: "twPop .4s ease-out" }}><Sym n="gem" s={30} glow /></span>
                        : current ? <Sym n="question" s={22} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        </StageFx>
        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />

        {active ? (
          <PlayButton label={` ${g("cashout", lang)} · x${level ? MULTS[level - 1] : 0}`} onClick={cashout}
            disabled={level === 0}
            color="linear-gradient(145deg,#1a7d43,#25a55a)" shadow="0 7px 0 #064e3b" />
        ) : (
          <>
            <div className="bet-dock">
              <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} />
              <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={start} disabled={!canPlay} />
            </div>
          </>
        )}
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
