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

const SYM = ["cherry", "bell", "gem", "star", "clover", "seven"];

export default function Scratch() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("scratch");
  const [cells, setCells] = useState<string[]>([]);
  const [open, setOpen] = useState<boolean[]>(Array(9).fill(false));
  const [mult, setMult] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);

  const start = () =>{
    if (!canPlay) return;
    sfx.spin();
    const win = riggedWin();
    const m = win ? [2, 3, 5, 10][Math.floor(Math.random() * 4)] : 0;
    const target = SYM[Math.floor(Math.random() * SYM.length)];
    const arr: string[] = [];
    if (win) {
      for (let i = 0; i < 3; i++) arr.push(target);
      while (arr.length < 9) {
        const s = SYM[Math.floor(Math.random() * SYM.length)];
        if (s !== target) arr.push(s);
      }
    } else {
      const counts: Record<string, number> = {};
      while (arr.length < 9) {
        const s = SYM[Math.floor(Math.random() * SYM.length)];
        if ((counts[s] ?? 0) < 2) { counts[s] = (counts[s] ?? 0) + 1; arr.push(s); }
      }
    }
    setCells(arr.sort(() => Math.random() - 0.5));
    setOpen(Array(9).fill(false));
    setMult(m); setWon(null); setBusy(true);
  };

  const scratch = async (i: number) =>{
    if (!busy || open[i]) return;
    sfx.reveal();
    const next = [...open]; next[i] = true;
    setOpen(next);
    if (next.every(Boolean)) {
      const w = await settle(mult);
      setAmount(w); setWon(mult > 0); setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.scratch) }}>
      <GameHeader icon="ticket" title={` ${GAME_NAMES.scratch[lang]}`} subtitle="x10" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <p className="text-xs font-bold" style={{ color: ts.textSub }}>{g("scratchIt", lang)}</p>

        <div className="w-full rounded-3xl p-4 grid grid-cols-3 gap-2"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <button key={i} onClick={() => scratch(i)} disabled={!busy}
              className="aspect-square rounded-2xl flex items-center justify-center active:scale-95 transition-all"
              style={{
                fontSize: 30,
                background: open[i] ? "rgba(251,191,36,0.16)":"linear-gradient(145deg,#9ca3af,#6b7280)",
                border: `1px solid ${ts.cardBorder}`,
              }}>
              {open[i] ? <Sym n={cells[i]} s={40} className="idle-float" /> : <Sym n="question" s={30} className="idle-flick" style={{ opacity: 0.75 }} />}
            </button>
          ))}
        </div>

        <ResultBanner win={won} text={won ? `${g("win", lang)} x${mult}` : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={start} disabled={!canPlay} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
