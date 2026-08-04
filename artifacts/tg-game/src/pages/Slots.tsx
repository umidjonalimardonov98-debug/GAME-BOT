import { useState, useRef, useCallback } from "react";
import { usePlayer } from "@/lib/player-context";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg, GAME_BG } from "@/lib/theme-context";
import { placeBet } from "@/lib/api";
import { riggedLose } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import GameHeader from "@/components/GameHeader";
import SlotReel from "@/components/casino/SlotReel";


const FRUITS = ["🍒","🍊","🍋","🍇","🍉","🍓"];
const ALL    = ["🍒","🍊","🍋","🍇","🍉","🍓","⭐","💎","7️⃣"];


// Deterministic outcome first, then generate reels to match
function spinReels(): { reels: [string,string,string]; outcome: "jackpot"|"three"|"two"|"miss" } {
  // Uy foydasi: 69% hollarda darhol "miss"
  if (riggedLose()) {
    const s1 = ALL[Math.floor(Math.random() * ALL.length)];
    let s2 = ALL[Math.floor(Math.random() * ALL.length)];
    while (s2 === s1) s2 = ALL[Math.floor(Math.random() * ALL.length)];
    let s3 = ALL[Math.floor(Math.random() * ALL.length)];
    while (s3 === s1 || s3 === s2) s3 = ALL[Math.floor(Math.random() * ALL.length)];
    return { reels: [s1, s2, s3], outcome: "miss" };
  }
  const r = Math.random();
  if (r < 0.01) {
    // 1% — Jackpot 777 = x10
    return { reels: ["7️⃣","7️⃣","7️⃣"], outcome: "jackpot" };
  } else if (r < 0.08) {
    // 7% — 3 of a kind fruit = x3
    const sym = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    return { reels: [sym, sym, sym], outcome: "three" };
  } else if (r < 0.33) {
    // 25% — 2 of a kind = x1.5
    const sym = ALL[Math.floor(Math.random() * ALL.length)];
    const others = ALL.filter(s => s !== sym);
    const diff = others[Math.floor(Math.random() * others.length)];
    const pos = Math.floor(Math.random() * 3);
    const reels: [string,string,string] = [sym, sym, sym];
    reels[pos] = diff;
    return { reels, outcome: "two" };
  } else {
    // 67% — Miss
    const s1 = ALL[Math.floor(Math.random() * ALL.length)];
    let s2 = ALL[Math.floor(Math.random() * ALL.length)];
    while (s2 === s1) s2 = ALL[Math.floor(Math.random() * ALL.length)];
    let s3 = ALL[Math.floor(Math.random() * ALL.length)];
    while (s3 === s1 || s3 === s2) s3 = ALL[Math.floor(Math.random() * ALL.length)];
    return { reels: [s1, s2, s3], outcome: "miss" };
  }
}

const STRIP = ["🍒", "🍊", "7️⃣", "🍋", "💎", "🍇", "⭐", "🍉", "🍓"];


export default function Slots() {
  const { player, refresh } = usePlayer();
  const { t } = useLang();
  const { theme, ts } = useTheme();
  const [betInput, setBetInput] = useState("2000");
  const [reels, setReels] = useState<[string,string,string]>(["🍒","🍒","🍒"]);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<"jackpot"|"three"|"two"|"miss"|null>(null);
  const [winAmt, setWinAmt] = useState(0);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeBet = Math.max(Number(betInput) || 2000, 2000);
  const isLight = theme === "light";

  function setQuickBet(a: string) {
    const bal = player?.balance ?? 0;
    let v = activeBet;
    if (a === "MIN") v = 2000;
    else if (a === "MAX") v = Math.min(bal, 500000);
    else if (a === "X2") v = Math.min(activeBet * 2, bal, 500000);
    else if (a === "1/2") v = Math.max(2000, Math.floor(activeBet / 2));
    setBetInput(String(v));
  }

  const spin = useCallback(async () => {
    if (!player || player.balance < activeBet || spinning) return;
    setSpinning(true);
    setOutcome(null);
    const { reels: finalReels, outcome: finalOutcome } = spinReels();
    const stopTick = startTicker(70);
    // barabanlar oldindan aniqlangan belgida to'xtaydi (haqiqiy slot kabi)
    setReels(finalReels);

    setTimeout(() => {
      stopTick();
      setSpinning(false);
      setOutcome(finalOutcome);

      const mult = finalOutcome === "jackpot" ? 12 : finalOutcome === "three" ? 3.6 : finalOutcome === "two" ? 1.8 : 0;
      const win = mult > 0 ? Math.floor(activeBet * mult) : 0;
      setWinAmt(win);
      if (win > 0) sfx.win(finalOutcome === "jackpot"); else sfx.lose();

      setSaving(true);
      placeBet(player.telegramId, { amount: activeBet, game: "slots", won: mult > 0, winAmount: win })
        .then(() => refresh()).catch(() => {}).finally(() => setSaving(false));
    }, 780);
  }, [player, activeBet, spinning]);


  const OUTCOME_STYLE = {
    jackpot: { color: "#fbbf24", glow: "0 0 30px #fbbf2499", label: "🏆 JACKPOT! x12" },
    three:   { color: "#4ade80", glow: "0 0 20px #4ade8055", label: `✅ 3x! x3.6` },
    two:     { color: isLight ? "#6366f1" : "#a5b4fc", glow: "none", label: `✌️ 2x! x1.8` },
    miss:    { color: "#f87171", glow: "none", label: t.noLuck },
  };

  const machineBg =
    "linear-gradient(180deg,#b5140f 0%,#7c0b09 40%,#4a0604 100%)";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.slots) }}>
      <GameHeader title={`🎰 ${t.slotsTitle}`} subtitle="777 · Mevalar · Kombinatsiyalar" />

      <div className="flex-1 px-4 pb-6 flex flex-col gap-4 items-center">

        {/* Haqiqiy slot mashina korpusi */}
        <div className="w-full rounded-3xl p-5 flex flex-col items-center gap-4 relative overflow-hidden"
          style={{
            background: machineBg,
            border: "3px solid #d4af37",
            boxShadow:
              "0 12px 0 #2a0302, 0 20px 44px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -24px 40px rgba(0,0,0,0.5)",
          }}>
          {/* korpus yaltirashi */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 42%)" }} />

          {/* yuqori lampalar */}
          <div className="relative flex gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} className={spinning ? "bulb-run" : ""}
                style={{
                  width: 9, height: 9, borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 30%,#fffbe6,#fbbf24 60%,#b45309)",
                  boxShadow: "0 0 10px rgba(251,191,36,0.9)",
                  animationDelay: `${i * 0.09}s`,
                }} />
            ))}
          </div>

          {/* Barabanlar */}
          <div className="relative flex gap-2.5 p-3 rounded-2xl"
            style={{
              background: "linear-gradient(180deg,#1b1206,#000)",
              border: "2px solid rgba(212,175,55,0.6)",
              boxShadow: "inset 0 6px 18px rgba(0,0,0,0.8)",
            }}>
            {reels.map((s, i) => (
              <SlotReel key={i} strip={STRIP} target={s} spinning={spinning} idx={i} cell={84} />
            ))}
            {/* to'lov chizig'i */}
            <div className="absolute left-2 right-2 top-1/2 h-[2px] pointer-events-none"
              style={{ background: "linear-gradient(90deg,transparent,#ef4444,transparent)", opacity: 0.7 }} />
          </div>


          <div className="w-3/4 h-0.5 rounded-full"
            style={{ background: `linear-gradient(90deg, transparent, ${isLight ? "#818cf8" : "#7c3aed"}, transparent)` }} />

          {/* Result */}
          {outcome ? (
            <div className="text-center">
              <p className="font-black text-2xl" style={{ color: OUTCOME_STYLE[outcome].color, textShadow: OUTCOME_STYLE[outcome].glow }}>
                {OUTCOME_STYLE[outcome].label}
              </p>
              {winAmt > 0 && <p className="font-bold text-sm mt-1" style={{ color: isLight ? "#059669" : "#4ade80" }}>+{winAmt.toLocaleString()} UZS</p>}
            </div>
          ) : spinning ? (
            <p className="font-bold animate-pulse" style={{ color: isLight ? "#4338ca" : "#c4b5fd" }}>{t.spinning}</p>
          ) : (
            <p className="text-sm" style={{ color: ts.textSub }}>{t.pressToSpin}</p>
          )}
        </div>

        {/* Payout table — simple 3 rows */}
        <div className="w-full rounded-2xl p-4"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-xs font-black mb-3 text-center tracking-widest" style={{ color: ts.textSub }}>{t.payoutTable}</p>
          <div className="flex flex-col gap-1.5">
            {[
              { label: "7️⃣7️⃣7️⃣  JACKPOT", mult: "x10", color: "#fbbf24" },
              { label: `3x bir xil meva`, mult: "x3", color: "#4ade80" },
              { label: `2x bir xil`, mult: "x1.5", color: isLight ? "#6366f1" : "#a5b4fc" },
              { label: "Boshqa kombinatsiya", mult: "❌", color: "#f87171" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: ts.input, border: `1px solid ${ts.inputBorder}` }}>
                <span className="text-sm" style={{ color: ts.text }}>{row.label}</span>
                <span className="font-black text-sm" style={{ color: row.color }}>{row.mult}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bet */}
        <div className="w-full rounded-2xl p-4"
          style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-xs font-bold mb-3 tracking-widest" style={{ color: ts.textSub }}>💰 {t.betAmount}</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {["MIN","1/2","X2","MAX"].map(a => (
              <button key={a} onClick={() => setQuickBet(a)}
                className="py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                style={{ background: ts.btnSecondary, color: ts.btnSecondaryText, border: `1px solid ${ts.cardBorder}`, boxShadow: "0 2px 0 rgba(0,0,0,0.1)" }}>
                {a}
              </button>
            ))}
          </div>
          <input type="number" value={betInput} onChange={e => setBetInput(e.target.value)}
            className="w-full rounded-xl px-4 py-3 font-black text-center text-lg outline-none"
            style={{ background: ts.input, border: `1px solid ${ts.inputBorder}`, color: ts.text }}
            placeholder="2000" min={2000} />
        </div>

        <button onClick={spin}
          disabled={!player || player.balance < activeBet || spinning}
          className="w-full py-4 rounded-2xl font-black text-xl active:scale-95 transition-all disabled:opacity-40"
          style={{
            background: spinning ? "rgba(124,58,237,0.3)" : (isLight ? "linear-gradient(145deg,#4f46e5,#6d28d9)" : "linear-gradient(145deg,#7c3aed,#4f46e5)"),
            boxShadow: spinning ? "none" : (isLight ? "0 6px 0 #312e81, 0 8px 24px rgba(79,70,229,0.4)" : "0 7px 0 #3b1278, 0 10px 28px #7c3aed55"),
            color: spinning ? (isLight ? "#6d28d9" : "#c4b5fd") : "white",
          }}>
          {spinning ? t.spinning : `🎰 ${t.spinBtn}`}
        </button>

        {saving && <p className="text-xs text-center" style={{ color: ts.textSub }}>{t.saving}</p>}
      </div>
    </div>
  );
}
