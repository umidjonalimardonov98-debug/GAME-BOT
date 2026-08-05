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

    const win = riggedWin();
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

        <p className="text-xs font-bold" style={{ color: ts.textSub }}>{g("pickNums", lang)} ({picks.length}/{PICKS})</p>

        <div className="w-full grid grid-cols-8 gap-1.5">
          {Array.from({ length: TOTAL }, (_, i) => i + 1).map(n =>{
            const sel = picks.includes(n);
            const hit = drawn.includes(n);
            return (
              <button key={n} onClick={() => toggle(n)} disabled={busy}
                className="aspect-square rounded-lg font-black text-xs active:scale-90 transition-all"
                style={{
                  background: hit && sel ? "#25a55a": hit ?"#f59e0b": sel ?"linear-gradient(135deg,#1668e3,#0d4fb0)":"rgba(255,255,255,0.06)",
                  color: sel || hit ? "#fff" : ts.textSub,
                  border: `1px solid ${sel ? "rgba(47,143,255,0.6)" : ts.cardBorder}`,
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

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay || picks.length !== PICKS} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
