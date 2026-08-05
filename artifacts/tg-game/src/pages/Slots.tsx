import { useState, useRef, useCallback } from "react";
import { usePlayer } from "@/lib/player-context";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg, GAME_BG, GOLD } from "@/lib/theme-context";
import { placeBet } from "@/lib/api";
import { riggedLose } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import GameHeader from "@/components/GameHeader";
import SlotReel from "@/components/casino/SlotReel";
import Sym from "@/components/casino/Sym";


const FRUITS = ["cherry", "lemon", "orange", "grape", "melon", "strawberry"];
const ALL    = ["cherry", "lemon", "orange", "grape", "melon", "strawberry", "bell", "star", "seven"];


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
    return { reels: ["seven", "seven", "seven"], outcome: "jackpot" };
  } else if (r < 0.08) {
    const sym = FRUITS[Math.floor(Math.random() * FRUITS.length)];
    return { reels: [sym, sym, sym], outcome: "three" };
  } else if (r < 0.33) {
    const sym = ALL[Math.floor(Math.random() * ALL.length)];
    const others = ALL.filter(s => s !== sym);
    const diff = others[Math.floor(Math.random() * others.length)];
    const pos = Math.floor(Math.random() * 3);
    const reels: [string,string,string] = [sym, sym, sym];
    reels[pos] = diff;
    return { reels, outcome: "two" };
  } else {
    const s1 = ALL[Math.floor(Math.random() * ALL.length)];
    let s2 = ALL[Math.floor(Math.random() * ALL.length)];
    while (s2 === s1) s2 = ALL[Math.floor(Math.random() * ALL.length)];
    let s3 = ALL[Math.floor(Math.random() * ALL.length)];
    while (s3 === s1 || s3 === s2) s3 = ALL[Math.floor(Math.random() * ALL.length)];
    return { reels: [s1, s2, s3], outcome: "miss" };
  }
}

const STRIP = ["cherry", "lemon", "seven", "orange", "grape", "melon", "strawberry", "bell", "star"];

/** 1XBET Diamond Slots uslubidagi tikish chiplari */
const CHIPS = [3000, 10000, 40000, 100000, 200000, 1000000];

/** Chap tomondagi to'lovlar jadvali (o'yin ichida, ramka ichida) */
const PAYS: { sym: string; mult: string; color: string }[] = [
  { sym: "seven",      mult: "x12",  color: "#ffd766" },
  { sym: "star",       mult: "x8",   color: "#ffe9a8" },
  { sym: "bell",       mult: "x6",   color: "#ffd766" },
  { sym: "melon",      mult: "x3.6", color: "#9be8b4" },
  { sym: "grape",      mult: "x3.6", color: "#9be8b4" },
  { sym: "strawberry", mult: "x1.8", color: "#ffc9c9" },
];


export default function Slots() {
  const { player, refresh } = usePlayer();
  const { t } = useLang();
  const { theme, ts } = useTheme();
  const [bet, setBet] = useState(3000);
  const [reels, setReels] = useState<[string,string,string]>(["cherry", "lemon", "orange"]);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<"jackpot"|"three"|"two"|"miss"|null>(null);
  const [winAmt, setWinAmt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lever, setLever] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeBet = Math.max(bet, 3000);
  const isLight = false;
  const balance = player?.balance ?? 0;

  const spin = useCallback(async () => {
    if (!player || player.balance < activeBet || spinning) return;
    setSpinning(true);
    setLever(true);
    setTimeout(() => setLever(false), 420);
    setOutcome(null);
    const { reels: finalReels, outcome: finalOutcome } = spinReels();
    const stopTick = startTicker(70);
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
    }, 1150);
  }, [player, activeBet, spinning]);


  const OUTCOME_STYLE = {
    jackpot: { color: "#ffd766", glow: "0 0 32px rgba(255,215,102,0.75)", label: "JACKPOT! x12" },
    three:   { color: "#39c46f", glow: "0 0 20px rgba(57,196,111,0.45)", label: "3x! x3.6" },
    two:     { color: "#ffe9a8", glow: "none", label: "2x! x1.8" },
    miss:    { color: "#f87171", glow: "none", label: t.noLuck },
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.slots) }}>
      <GameHeader icon="seven" title="Diamond Slots" subtitle="777 · Mevalar · Kombinatsiyalar" />

      <div className="flex-1 px-3 pb-6 flex flex-col gap-4 items-center">

        {/* ===== Oltin kabinet ===== */}
        <div className="w-full rounded-[26px] p-[3px] relative"
          style={{ background: GOLD.frame, boxShadow: `0 14px 40px rgba(0,0,0,0.62), 0 0 40px ${GOLD.glow}` }}>
          <div className="rounded-[23px] p-3 relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg,#241703 0%,#140c02 45%,#0a0600 100%)",
              boxShadow: "inset 0 2px 0 rgba(255,235,170,0.25), inset 0 -30px 50px rgba(0,0,0,0.6)",
            }}>

            {/* marquee lampalar */}
            <div className="flex justify-between px-1 mb-2">
              {Array.from({ length: 13 }).map((_, i) => (
                <span key={i} className={spinning ? "bulb-run" : ""}
                  style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 30%,#fffbe6,#ffd766 55%,#8d6512)",
                    boxShadow: "0 0 9px rgba(255,215,102,0.85)",
                    animationDelay: `${i * 0.07}s`,
                  }} />
              ))}
            </div>

            {/* sarlavha plakati */}
            <div className="mx-auto mb-3 px-5 py-1.5 rounded-full text-center"
              style={{ background: GOLD.grad, boxShadow: "0 4px 0 #6a4a0c, 0 8px 18px rgba(0,0,0,0.5)" }}>
              <span className="font-black tracking-[0.22em] text-[13px]" style={{ color: "#3a2705" }}>DIAMOND SLOTS</span>
            </div>

            <div className="flex gap-2.5 items-stretch">
              {/* chap: to'lov jadvali ustuni */}
              <div className="rounded-2xl p-1.5 flex flex-col justify-between shrink-0"
                style={{
                  width: 74,
                  background: "linear-gradient(180deg,rgba(212,175,55,0.20),rgba(0,0,0,0.55))",
                  border: `1px solid ${GOLD.border}`,
                }}>
                {PAYS.map(p => (
                  <div key={p.sym} className="flex items-center justify-between px-1 py-[3px]">
                    <Sym n={p.sym} s={20} />
                    <span className="font-black text-[10px]" style={{ color: p.color }}>{p.mult}</span>
                  </div>
                ))}
              </div>

              {/* markaz: barabanlar */}
              <div className="flex-1 rounded-2xl p-2.5 relative"
                style={{
                  background: "linear-gradient(180deg,#120b01,#000)",
                  border: `2px solid ${GOLD.main}`,
                  boxShadow: `inset 0 8px 22px rgba(0,0,0,0.85), 0 0 22px ${GOLD.glow}`,
                }}>
                <div className="flex gap-2 justify-center">
                  {reels.map((s, i) => (
                    <SlotReel key={i} strip={STRIP} target={s} spinning={spinning} idx={i} cell={72} />
                  ))}
                </div>
                {/* to'lov chizig'i */}
                <div className="absolute left-3 right-3 top-1/2 h-[2px] pointer-events-none"
                  style={{ background: "linear-gradient(90deg,transparent,#ffd766,transparent)", opacity: 0.85 }} />
              </div>

              {/* o'ng: richag */}
              <div className="shrink-0 flex flex-col items-center justify-center" style={{ width: 26 }}>
                <div style={{
                  width: 4, height: 76, borderRadius: 4,
                  background: "linear-gradient(180deg,#e8c257,#7a5a10)",
                  transformOrigin: "bottom center",
                  transform: lever ? "rotate(26deg)" : "rotate(0deg)",
                  transition: "transform .35s cubic-bezier(.3,1.4,.5,1)",
                }} />
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", marginTop: -84,
                  background: "radial-gradient(circle at 32% 28%,#ff8b8b,#c0261f 60%,#6b0f0b)",
                  boxShadow: "0 3px 8px rgba(0,0,0,0.6)",
                  transform: lever ? "translateY(26px)" : "none",
                  transition: "transform .35s cubic-bezier(.3,1.4,.5,1)",
                }} />
              </div>
            </div>

            {/* natija tablosi */}
            <div className="mt-3 rounded-xl py-2 text-center"
              style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${GOLD.border}` }}>
              {outcome ? (
                <>
                  <p className="font-black text-xl" style={{ color: OUTCOME_STYLE[outcome].color, textShadow: OUTCOME_STYLE[outcome].glow }}>
                    {OUTCOME_STYLE[outcome].label}
                  </p>
                  {winAmt > 0 && <p className="font-bold text-sm mt-0.5" style={{ color: "#39c46f" }}>+{winAmt.toLocaleString()} UZS</p>}
                </>
              ) : spinning ? (
                <p className="font-black animate-pulse" style={{ color: "#ffe9a8" }}>{t.spinning}</p>
              ) : (
                <p className="text-sm" style={{ color: "#c9b071" }}>{t.pressToSpin}</p>
              )}
            </div>
          </div>
        </div>

        {/* ===== Tikish chiplari (1XBET uslubi) ===== */}
        <div className="w-full">
          <p className="text-[11px] font-black mb-2 tracking-[0.2em] text-center" style={{ color: "#c9b071" }}>
            {t.betAmount}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CHIPS.map(c => {
              const active = activeBet === c;
              const disabled = c > balance;
              return (
                <button key={c} onClick={() => setBet(c)} disabled={disabled || spinning}
                  className="py-2.5 rounded-xl font-black text-[13px] active:scale-95 transition-all disabled:opacity-35"
                  style={{
                    background: active
                      ? "linear-gradient(180deg,#ff5f57 0%,#d61f18 55%,#8e0b06 100%)"
                      : "linear-gradient(180deg,#c93a33 0%,#8e1710 60%,#5a0703 100%)",
                    color: "#fff3c4",
                    border: `1px solid ${active ? "#ffd766" : "rgba(255,214,102,0.35)"}`,
                    boxShadow: active
                      ? `0 4px 0 #4a0503, 0 0 18px ${GOLD.glow}`
                      : "0 4px 0 #3d0402, 0 6px 14px rgba(0,0,0,0.45)",
                    textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                  }}>
                  {c.toLocaleString()}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== SPIN ===== */}
        <button onClick={spin}
          disabled={!player || balance < activeBet || spinning}
          className="w-full py-4 rounded-2xl font-black text-xl active:scale-95 transition-all disabled:opacity-40"
          style={{
            background: GOLD.grad,
            color: "#3a2705",
            border: "1px solid #fff3c4",
            boxShadow: spinning ? "none" : `0 7px 0 #6a4a0c, 0 12px 30px ${GOLD.glow}`,
            letterSpacing: "0.12em",
          }}>
          {spinning ? t.spinning : t.spinBtn}
        </button>

        {saving && <p className="text-xs text-center" style={{ color: ts.textSub }}>{t.saving}</p>}
      </div>
    </div>
  );
}
