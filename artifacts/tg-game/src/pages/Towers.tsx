import { useState } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg } from "@/lib/theme-context";
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
    const safe = riggedWin() || level < 1; // birinchi bosqich yengilroq
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
      sfx.win(true);
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
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme) }}>
      <GameHeader title={` ${GAME_NAMES.towers[lang]}`} subtitle="x20" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl p-3 flex flex-col-reverse gap-1.5"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          {Array.from({ length: LEVELS }).map((_, lvl) => (
            <div key={lvl} className="flex items-center gap-2">
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
                      className="py-2.5 rounded-lg font-black text-sm active:scale-95 transition-all"
                      style={{
                        background: exploded ? "#dc2626": done ?"#25a55a": current ?"linear-gradient(135deg,#1668e3,#0d4fb0)":"rgba(255,255,255,0.05)",
                        color: "#fff",
                        opacity: current || done || exploded ? 1 : 0.45,
                      }}>
                      {exploded ? <Sym n="boom" s={26} /> : done ? <Sym n="star" s={24} /> : current ? "?" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />

        {active ? (
          <PlayButton label={` ${g("cashout", lang)} · x${level ? MULTS[level - 1] : 0}`} onClick={cashout}
            disabled={level === 0}
            color="linear-gradient(145deg,#1a7d43,#25a55a)" shadow="0 7px 0 #064e3b" />
        ) : (
          <>
            <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} />
            <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={start} disabled={!canPlay} />
          </>
        )}
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
