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

        <style>{`
          @keyframes scScratch { 0%{clip-path:inset(0 0 0 0)} 100%{clip-path:inset(0 0 0 100%)} }
          @keyframes scDust { 0%{opacity:1;transform:translate(0,0)} 100%{opacity:0;transform:translate(var(--dx),18px)} }
          @keyframes scReveal { 0%{transform:scale(.5) rotate(-12deg);opacity:0} 70%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        `}</style>
        <div className="w-full rounded-3xl p-3 relative" style={{
          background: "linear-gradient(160deg,#f6d77a,#c8961f 45%,#8a5d0b)", boxShadow: "0 14px 30px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.5)",
        }}>
          <p className="text-center font-black tracking-[0.3em] mb-2" style={{ fontSize: 11, color: "#3b2503" }}>LUCKY SCRATCH</p>
          <div className="grid grid-cols-3 gap-2 rounded-2xl p-2" style={{ background: "#2a1a03", boxShadow: "inset 0 4px 12px rgba(0,0,0,.6)" }}>
          {Array.from({ length: 9 }).map((_, i) => {
            const winCell = won && open[i] && cells.filter(c => c === cells[i]).length >= 3;
            return (
            <div key={i} className="aspect-square rounded-xl relative overflow-hidden flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 50% 40%, #fff8e1, #f3e3b3 70%)",
                boxShadow: winCell ? "0 0 0 2px #22c55e, 0 0 18px rgba(34,197,94,.8)" : "inset 0 2px 6px rgba(0,0,0,.25)",
              }}>
              {open[i] && <span style={{ animation: "scReveal .45s cubic-bezier(.2,.9,.3,1.3)" }}><Sym n={cells[i]} s={46} glow={!!winCell} /></span>}
              <div className="absolute inset-0" style={{
                background: "linear-gradient(135deg,#e5e7eb,#9ca3af 40%,#d1d5db 60%,#6b7280)",
                animation: open[i] ? "scScratch .35s ease-in forwards" : undefined,
              }}>
                <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(45deg,rgba(255,255,255,.18) 0 2px,transparent 2px 6px)" }} />
                {!open[i] && <div className="absolute inset-0 flex items-center justify-center"><Sym n="coin" s={26} style={{ opacity: .5, filter: "grayscale(1)" }} /></div>}
              </div>
              {open[i] && [0, 1, 2, 3].map(d => (
                <span key={d} className="absolute w-1.5 h-1.5 rounded-full" style={{ top: `${30 + d * 12}%`, right: 4, background: "#9ca3af", ["--dx" as any]: `${8 + d * 5}px`, animation: `scDust .5s ease-out ${d * 0.05}s forwards` }} />
              ))}
            </div>
          ); })}
          </div>
        </div>

        <div className="w-full grid grid-cols-6 gap-1">
          {MULTS.map((m) => (
            <div key={m} className="rounded-lg py-1.5 text-center font-black"
              style={{ fontSize: 10, background: "rgba(251,191,36,.12)", color: "#fbbf24" }}>x{m}</div>
          ))}
        </div>

        <ResultBanner win={won} text={won ? `${g("win", lang)} x${mult}` : g("lose", lang)} amount={amount} />
        <div className="bet-dock">
          <BetPanel value={betInput} onChange={setBetInput} onQuick={quick} disabled={busy} />
          <PlayButton label={busy ? "OCHILMOQDA..." : ` ${g("play", lang)} · ${bet.toLocaleString()}`} onClick={start} disabled={!canPlay || busy} />
        </div>
        {saving && <p className="text-xs" style={{ color: ts.textSub }}>...</p>}
      </div>
    </div>
  );
}
