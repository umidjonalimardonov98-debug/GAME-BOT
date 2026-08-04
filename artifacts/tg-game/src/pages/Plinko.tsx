import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

const ROWS = 8;
const BUCKETS: Record<string, number[]> = {
  low:  [1.6, 1.2, 1.05, 0, 0, 0, 1.05, 1.2, 1.6],
  mid:  [4, 2, 1.2, 0, 0, 0, 1.2, 2, 4],
  high: [12, 4, 1.5, 0, 0, 0, 1.5, 4, 12],
};

export default function Plinko() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("plinko");
  const [risk, setRisk] = useState<"low"|"mid"|"high">("mid");
  const [ballPos, setBallPos] = useState<{ row: number; col: number } | null>(null);
  const [landed, setLanded] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const mults = BUCKETS[risk];

  const drop = () =>{
    if (!canPlay) return;
    setBusy(true); setWon(null); setLanded(null);
    const winning = riggedWin();
    const winIdx = [0, 1, 2, 6, 7, 8].filter(i => mults[i] > 0);
    const loseIdx = [3, 4, 5];
    const target = winning
      ? winIdx[Math.floor(Math.random() * winIdx.length)]
      : loseIdx[Math.floor(Math.random() * loseIdx.length)];

    const stopTick = startTicker(90);
    sfx.spin();
    const path: number[] = [];
    let col = 4;
    for (let r = 0; r < ROWS; r++) {
      const dir = target > col ? 1 : target < col ? -1 : (Math.random() < 0.5 ? -1 : 1);
      col = Math.max(0, Math.min(8, col + (r >= ROWS - Math.abs(target - col) ? (target > col ? 1 : -1) : dir * 0.5 >= 0 ? dir : dir)));
      col = Math.round(col);
      path.push(col);
    }
    path[ROWS - 1] = target;

    path.forEach((c, r) =>{
      timers.current.push(setTimeout(() => setBallPos({ row: r, col: c }), r * 90));
    });

    timers.current.push(setTimeout(async () =>{
      stopTick();
      setBallPos(null);
      setLanded(target);
      const mult = mults[target];
      if (mult > 0) sfx.win(mult >= 4); else sfx.lose();
      const w = await settle(mult);
      setAmount(w); setWon(mult > 0); setBusy(false);
    }, ROWS * 90 + 220));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme) }}>
      <GameHeader title={` ${GAME_NAMES.plinko[lang]}`} subtitle="x12" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <div className="w-full rounded-3xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <div className="flex flex-col items-center gap-1.5 mb-3">
            {Array.from({ length: ROWS }).map((_, r) => (
              <div key={r} className="flex gap-2.5 items-center">
                {Array.from({ length: r + 3 }).map((_, c) =>{
                  const active = ballPos?.row === r && Math.abs(ballPos.col - c) < 1;
                  return (
                    <span key={c} style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: active ? "#fbbf24":"rgba(255,255,255,0.45)",
                      boxShadow: active ? "0 0 12px #fbbf24":"none",
                      transition: "background .12s",
                    }} />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-9 gap-1">
            {mults.map((m, i) => (
              <div key={i} className="text-center py-1.5 rounded-lg font-black"
                style={{
                  fontSize: 9,
                  background: landed === i ? (m > 0 ? "#25a55a":"#dc2626") : (m > 0 ? "rgba(251,191,36,0.16)":"rgba(255,255,255,0.06)"),
                  color: landed === i ? "#fff": (m > 0 ?"#fbbf24" : ts.textSub),
                }}>
                {m > 0 ? `x${m}` : "0"}
              </div>
            ))}
          </div>
        </div>

        <div className="w-full grid grid-cols-3 gap-2">
          {(["low", "mid", "high"] as const).map(r => (
            <button key={r} disabled={busy} onClick={() =>{ setRisk(r); sfx.select(); }}
              className="py-2.5 rounded-xl text-xs font-black active:scale-95 disabled:opacity-40"
              style={{
                background: risk === r ? "linear-gradient(135deg,#1668e3,#0d4fb0)" : ts.btnSecondary,
                color: risk === r ? "#fff" : ts.btnSecondaryText,
                border: `1px solid ${ts.cardBorder}`,
              }}>
              {r === "low" ? g("low", lang) : r === "mid" ? g("mid", lang) : g("high", lang)}
            </button>
          ))}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={drop} disabled={!canPlay} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
