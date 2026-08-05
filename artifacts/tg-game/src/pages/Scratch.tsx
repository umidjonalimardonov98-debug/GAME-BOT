import { useState, useRef, useEffect } from "react";
import { useLang } from "@/lib/lang-context";
import { useTheme, GAME_BG, pageBg } from "@/lib/theme-context";
import { useBet } from "@/lib/use-bet";
import { rollOutcome } from "@/lib/odds";
import { sfx } from "@/lib/sound";
import { g, GAME_NAMES } from "@/lib/game-i18n";
import GameHeader from "@/components/GameHeader";
import Sym from "@/components/casino/Sym";
import BetPanel from "@/components/casino/BetPanel";
import PlayButton from "@/components/casino/PlayButton";
import ResultBanner from "@/components/casino/ResultBanner";

/**
 * CHIZIB OCHISH — to'liq avtomatik kartochka.
 * O'yinchi hech narsa bosmaydi: kataklar o'zi tasodifiy tartibda qiriladi.
 * 3 ta bir xil belgi tushsa — yutuq. Koeffitsiyentlar 1.1 dan boshlanadi.
 */

const SYM = ["gem", "bell", "crown", "star", "clover", "seven", "coin1"];
const MULTS = [1.1, 1.3, 1.8, 3.5, 7, 15];

export default function Scratch() {
  const { lang } = useLang();
  const { theme, ts } = useTheme();
  const { bet, betInput, setBetInput, quick, settle, canPlay, busy, setBusy, saving } = useBet("scratch");
  const [cells, setCells] = useState<string[]>(Array(9).fill("question"));
  const [open, setOpen] = useState<boolean[]>(Array(9).fill(false));
  const [mult, setMult] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const start = () => {
    if (!canPlay || busy) return;
    sfx.spin();
    const out = rollOutcome("scratch");
    const m = out === "win" ? MULTS[Math.floor(Math.random() * MULTS.length)] : out === "refund" ? 1 : 0;
    const target = SYM[Math.floor(Math.random() * SYM.length)];
    const arr: string[] = [];
    if (m > 1) {
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
    const board = arr.sort(() => Math.random() - 0.5);
    setCells(board);
    setOpen(Array(9).fill(false));
    setMult(m); setWon(null); setBusy(true);

    // AVTO-QIRISH: kataklar tasodifiy tartibda o'zi ochiladi
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const order = [...Array(9).keys()].sort(() => Math.random() - 0.5);
    order.forEach((cell, k) => {
      timers.current.push(setTimeout(async () => {
        sfx.reveal();
        setOpen((prev) => { const n = [...prev]; n[cell] = true; return n; });
        if (k === 8) {
          const w = await settle(m);
          setAmount(w); setWon(m > 1); setBusy(false);
        }
      }, 300 + k * 260));
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.scratch) }}>
      <GameHeader icon="ticket" title={` ${GAME_NAMES.scratch[lang]}`} subtitle="x1.1 - x15" />
      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 items-center">

        <p className="text-xs font-bold" style={{ color: ts.textSub }}>
          {busy ? "Kartochka o'zi qirilmoqda..." : "3 ta bir xil belgi - yutuq"}
        </p>

        <div className="w-full rounded-3xl p-4 grid grid-cols-3 gap-2"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i}
              className="aspect-square rounded-2xl flex items-center justify-center transition-all duration-300"
              style={{
                background: open[i]
                  ? "linear-gradient(180deg,rgba(251,191,36,0.22),rgba(0,0,0,0.5))"
                  : "linear-gradient(135deg,#cbd5e1,#6b7280 55%,#9ca3af)",
                border: `1px solid ${open[i] ? "rgba(251,191,36,.6)" : ts.cardBorder}`,
                transform: open[i] ? "scale(1)" : "scale(0.985)",
              }}>
              {open[i]
                ? <Sym n={cells[i]} s={42} className="idle-float" />
                : <Sym n="question" s={28} style={{ opacity: 0.6 }} />}
            </div>
          ))}
        </div>

        <div className="w-full grid grid-cols-6 gap-1">
          {MULTS.map((m) => (
            <div key={m} className="rounded-lg py-1.5 text-center font-black"
              style={{ fontSize: 10, background: "rgba(251,191,36,.12)", color: "#fbbf24" }}>x{m}</div>
          ))}
        </div>

        <ResultBanner win={won} text={won ? `${g("win", lang)} x${mult}` : g("lose", lang)} amount={amount} />
        <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
        <PlayButton label={busy ? "OCHILMOQDA..." : ` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={start} disabled={!canPlay || busy} />
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
