import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg, GOLD } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { riggedWin } from "@/lib/odds";
import { sfx } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";
import TableFrame from "@/components/casino/TableFrame";
import PlinkoBoard from "@/components/casino/PlinkoBoard";

type Risk = "low" | "mid" | "high";
const ROW_OPTIONS = [8, 12, 16] as const;

/** Haqiqiy plinko to'lov jadvallari (chetlari — yuqori, o'rtasi — 0) */
const TABLES: Record<number, Record<Risk, number[]>> = {
  8: {
    low: [3.2, 1.9, 1.4, 1.1, 0, 1.1, 1.4, 1.9, 3.2],
    mid: [8, 3, 1.6, 1.1, 0, 1.1, 1.6, 3, 8],
    high: [24, 6, 2, 1.1, 0, 1.1, 2, 6, 24],
  },
  12: {
    low: [5, 2.6, 1.8, 1.4, 1.1, 1.05, 0, 1.05, 1.1, 1.4, 1.8, 2.6, 5],
    mid: [16, 6, 3, 1.8, 1.2, 1.05, 0, 1.05, 1.2, 1.8, 3, 6, 16],
    high: [60, 14, 5, 2, 1.2, 1.05, 0, 1.05, 1.2, 2, 5, 14, 60],
  },
  16: {
    low: [8, 4, 2.4, 1.7, 1.4, 1.2, 1.1, 1.05, 0, 1.05, 1.1, 1.2, 1.4, 1.7, 2.4, 4, 8],
    mid: [40, 12, 6, 3, 1.8, 1.3, 1.1, 1.05, 0, 1.05, 1.1, 1.3, 1.8, 3, 6, 12, 40],
    high: [180, 40, 12, 5, 2, 1.3, 1.1, 1.05, 0, 1.05, 1.1, 1.3, 2, 5, 12, 40, 180],
  },
};

export default function Plinko() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("plinko");
  const [risk, setRisk] = useState<Risk>("mid");
  const [rows, setRows] = useState<number>(12);
  const [drop, setDrop] = useState<{ id: number; target: number } | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const [last, setLast] = useState<number[]>([]);
  const [width, setWidth] = useState(320);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(0);
  const pegTick = useRef(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.max(240, el.clientWidth)));
    ro.observe(el);
    setWidth(Math.max(240, el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const mults = TABLES[rows][risk];

  const play = () => {
    if (!canPlay) return;
    setBusy(true);
    setWon(null);
    const winning = riggedWin("plinko");
    const idxs = mults.map((_, i) => i);
    const winIdx = idxs.filter((i) => mults[i] > 0);
    const loseIdx = idxs.filter((i) => mults[i] === 0);
    // Yutuqda chetlarga yaqinlik ehtimoli kichik (haqiqiy plinko taqsimoti)
    let target: number;
    if (winning) {
      const r = Math.random();
      const sorted = [...winIdx].sort((a, b) => mults[a] - mults[b]);
      const zone = r < 0.72 ? sorted.slice(0, Math.ceil(sorted.length * 0.6))
        : r < 0.95 ? sorted.slice(Math.ceil(sorted.length * 0.5))
        : sorted.slice(-2);
      target = zone[Math.floor(Math.random() * zone.length)];
    } else {
      target = loseIdx[Math.floor(Math.random() * loseIdx.length)];
    }
    sfx.spin();
    setDrop({ id: ++idRef.current, target });
  };

  const onLanded = async (idx: number) => {
    const mult = mults[idx];
    setLast((l) => [mult, ...l].slice(0, 8));
    const w = await settle(mult);
    setAmount(w);
    setWon(mult > 0);
    setBusy(false);
  };

  const onPeg = () => {
    const now = performance.now();
    if (now - pegTick.current > 55) { pegTick.current = now; sfx.click(); }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.plinko) }}>
      <GameHeader icon="gem" title={` ${GAME_NAMES.plinko[lang]}`} subtitle={`x${Math.max(...mults)}`} />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-3 items-center">

        {/* oxirgi natijalar */}
        <div className="w-full flex gap-1.5 overflow-x-auto">
          {last.map((m, i) => (
            <span key={i} className="shrink-0 text-[11px] font-black px-2.5 py-1 rounded-xl"
              style={{
                background: m > 0 ? "rgba(57,196,111,0.16)" : "rgba(239,68,68,0.14)",
                color: m > 0 ? "#39c46f" : "#f87171",
                border: `1px solid ${m > 0 ? "rgba(57,196,111,0.3)" : "rgba(239,68,68,0.28)"}`,
              }}>x{m}</span>
          ))}
        </div>

        <TableFrame skin="blue" title="PLINKO PRO" bulbs bulbsActive={busy}>
          <div ref={wrapRef} className="rounded-2xl overflow-hidden"
            style={{
              background: "radial-gradient(ellipse at 50% 0%, rgba(80,170,255,0.16) 0%, rgba(3,16,31,0.94) 70%)",
              border: "1px solid rgba(120,190,255,0.35)",
              boxShadow: "inset 0 8px 24px rgba(0,0,0,0.6)",
            }}>
            <PlinkoBoard rows={rows} mults={mults} width={width} drop={drop} onLanded={onLanded} onPeg={onPeg} />
          </div>
        </TableFrame>

        {/* qatorlar */}
        <div className="w-full grid grid-cols-3 gap-2">
          {ROW_OPTIONS.map((r) => (
            <button key={r} disabled={busy} onClick={() => { setRows(r); sfx.select(); }}
              className="py-2 rounded-xl text-[11px] font-black active:scale-95 disabled:opacity-40 transition-all"
              style={{
                background: rows === r ? GOLD.frame : "linear-gradient(180deg,rgba(20,50,90,0.85),rgba(6,20,40,0.9))",
                color: rows === r ? "#2a1c00" : "#9fc5ef",
                border: `1px solid ${rows === r ? "#ffd766" : "rgba(120,190,255,0.3)"}`,
              }}>{r} QATOR</button>
          ))}
        </div>

        {/* risk */}
        <div className="w-full grid grid-cols-3 gap-2">
          {(["low", "mid", "high"] as const).map((r) => (
            <button key={r} disabled={busy} onClick={() => { setRisk(r); sfx.select(); }}
              className="py-2.5 rounded-xl text-xs font-black active:scale-95 disabled:opacity-40 transition-all"
              style={{
                background: risk === r
                  ? "linear-gradient(180deg,#5fb0ec 0%,#1668e3 55%,#0b3f8f 100%)"
                  : "linear-gradient(180deg,rgba(20,50,90,0.85),rgba(6,20,40,0.9))",
                color: risk === r ? "#fff" : "#9fc5ef",
                border: `1px solid ${risk === r ? "#bfe3ff" : "rgba(120,190,255,0.3)"}`,
                boxShadow: risk === r ? "0 4px 0 #072a56, 0 0 16px rgba(61,143,214,0.5)" : "0 3px 0 rgba(0,0,0,0.4)",
              }}>
              {r === "low" ? g("low", lang) : r === "mid" ? g("mid", lang) : g("high", lang)}
            </button>
          ))}
        </div>

        <ResultBanner win={won} text={won ? g("win", lang) : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={play} disabled={!canPlay} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
