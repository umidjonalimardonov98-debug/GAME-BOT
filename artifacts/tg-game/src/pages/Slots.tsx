import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { usePlayer } from "@/lib/player-context";
import { useLang } from "@/lib/lang-context";
import { useTheme, pageBg, GAME_BG, GOLD } from "@/lib/theme-context";
import { placeBet } from "@/lib/api";
import { winRateFor } from "@/lib/odds";
import { sfx, startTicker } from "@/lib/sound";
import GameHeader from "@/components/GameHeader";
import SlotColumn from "@/components/casino/SlotColumn";
import Sym from "@/components/casino/Sym";
import {
  spin as spinEngine, PAYTABLE, PAYLINES, LINE_COLORS, LINE_OPTIONS,
  SYMBOLS, WILD, SCATTER, REELS, ROWS, type SpinResult,
} from "@/lib/slot-engine";

const CHIPS = [1000, 3000, 5000, 10000, 25000, 50000];
const CELL = 58;

const EMPTY_GRID: string[][] = Array.from({ length: REELS }, (_, c) =>
  Array.from({ length: ROWS }, (_, r) => SYMBOLS[(c * 3 + r) % SYMBOLS.length])
);

const PAY_ROWS: string[] = [WILD, "seven", "bell", "star", "melon", "grape", "orange", "lemon", "cherry"];

export default function Slots() {
  const { player, refresh } = usePlayer();
  const { t } = useLang();
  const { theme, ts } = useTheme();

  const [betPerLine, setBetPerLine] = useState(1000);
  const [lines, setLines] = useState(10);
  const [grid, setGrid] = useState<string[][]>(EMPTY_GRID);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPays, setShowPays] = useState(false);
  const [auto, setAuto] = useState(0);
  const [lever, setLever] = useState(false);
  const autoRef = useRef(0);

  const totalBet = betPerLine * lines;
  const balance = player?.balance ?? 0;
  const canSpin = !!player && balance >= totalBet && !spinning;

  /** yonadigan kataklar */
  const highlight = useMemo(() => {
    const map: boolean[][] = Array.from({ length: REELS }, () => Array(ROWS).fill(false));
    if (!spinning && result) {
      result.lineWins.forEach((w) => w.cells.forEach(([c, r]) => { map[c][r] = true; }));
      if (result.scatterWin > 0)
        for (let c = 0; c < REELS; c++)
          for (let r = 0; r < ROWS; r++) if (result.grid[c][r] === SCATTER) map[c][r] = true;
    }
    return map;
  }, [result, spinning]);

  const doSpin = useCallback(() => {
    if (!player || player.balance < totalBet || spinning) return;
    setSpinning(true);
    setResult(null);
    setLever(true);
    setTimeout(() => setLever(false), 400);
    sfx?.click?.();

    const res = spinEngine(lines, betPerLine, winRateFor("slots"));
    setGrid(res.grid);
    const stopTick = startTicker(70);

    const total = 900 + (REELS - 1) * 260 + 260;
    setTimeout(() => {
      stopTick();
      setSpinning(false);
      setResult(res);
      if (res.totalWin > 0) sfx?.win?.(); else sfx?.lose?.();

      setSaving(true);
      placeBet(player.telegramId, {
        amount: totalBet, game: "slots",
        won: res.totalWin > 0, winAmount: res.totalWin,
      }).then(() => refresh()).catch(() => {}).finally(() => setSaving(false));
    }, total);
  }, [player, totalBet, lines, betPerLine, spinning, refresh]);

  // AVTO-SPIN
  useEffect(() => {
    autoRef.current = auto;
  }, [auto]);
  useEffect(() => {
    if (auto <= 0 || spinning) return;
    const id = setTimeout(() => {
      if (!canSpin) { setAuto(0); return; }
      setAuto((a) => Math.max(0, a - 1));
      doSpin();
    }, 700);
    return () => clearTimeout(id);
  }, [auto, spinning, canSpin, doSpin]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.slots) }}>
      <GameHeader icon="seven" title="Diamond Slots 5×3" subtitle="10 liniya · Wild · Scatter" />

      <div className="flex-1 px-2.5 pb-6 flex flex-col gap-3 items-center">

        {/* ===== KABINET ===== */}
        <div className="w-full rounded-[24px] p-[3px] relative"
          style={{ background: GOLD.frame, boxShadow: `0 14px 40px rgba(0,0,0,0.62), 0 0 40px ${GOLD.glow}` }}>
          <div className="rounded-[21px] p-2.5 relative overflow-hidden"
            style={{
              background: "linear-gradient(180deg,#241703 0%,#140c02 45%,#0a0600 100%)",
              boxShadow: "inset 0 2px 0 rgba(255,235,170,0.25), inset 0 -30px 50px rgba(0,0,0,0.6)",
            }}>

            {/* lampalar */}
            <div className="flex justify-between px-1 mb-2">
              {Array.from({ length: 15 }).map((_, i) => (
                <span key={i} className={spinning ? "bulb-run" : ""}
                  style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 30%,#fffbe6,#ffd766 55%,#8d6512)",
                    boxShadow: "0 0 9px rgba(255,215,102,0.85)",
                    animationDelay: `${i * 0.06}s`,
                  }} />
              ))}
            </div>

            {/* tablo */}
            <div className="flex items-stretch gap-1.5 mb-2">
              <div className="flex-1 rounded-lg px-2 py-1 text-center"
                style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${GOLD.border}` }}>
                <p className="text-[9px] tracking-widest" style={{ color: "#c9b071" }}>BALANS</p>
                <p className="font-black text-[13px]" style={{ color: "#ffe9a8" }}>{balance.toLocaleString()}</p>
              </div>
              <div className="flex-1 rounded-lg px-2 py-1 text-center"
                style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${GOLD.border}` }}>
                <p className="text-[9px] tracking-widest" style={{ color: "#c9b071" }}>TIKIM</p>
                <p className="font-black text-[13px]" style={{ color: "#ffe9a8" }}>{totalBet.toLocaleString()}</p>
              </div>
              <div className="flex-1 rounded-lg px-2 py-1 text-center"
                style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${GOLD.border}` }}>
                <p className="text-[9px] tracking-widest" style={{ color: "#c9b071" }}>YUTUQ</p>
                <p className="font-black text-[13px]" style={{ color: result?.totalWin ? "#39c46f" : "#ffe9a8" }}>
                  {(result?.totalWin ?? 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* barabanlar + chiziq raqamlari */}
            <div className="flex items-center gap-1.5">
              <div className="flex flex-col justify-around" style={{ height: CELL * 3 }}>
                {PAYLINES.slice(0, lines).slice(0, 5).map((_, i) => (
                  <span key={i} className="text-[8px] font-black" style={{ color: LINE_COLORS[i] }}>{i + 1}</span>
                ))}
              </div>

              <div className="flex-1 rounded-xl p-1.5 relative"
                style={{
                  background: "linear-gradient(180deg,#120b01,#000)",
                  border: `2px solid ${GOLD.main}`,
                  boxShadow: `inset 0 8px 22px rgba(0,0,0,0.85), 0 0 22px ${GOLD.glow}`,
                }}>
                <div className="flex gap-1 justify-center">
                  {grid.map((col, i) => (
                    <SlotColumn key={i} target={col} spinning={spinning} idx={i}
                      cell={CELL} strip={SYMBOLS} highlight={highlight[i]} />
                  ))}
                </div>
              </div>

              {/* richag */}
              <div className="shrink-0 flex flex-col items-center justify-center" style={{ width: 20 }}>
                <div style={{
                  width: 4, height: 64, borderRadius: 4,
                  background: "linear-gradient(180deg,#e8c257,#7a5a10)",
                  transformOrigin: "bottom center",
                  transform: lever ? "rotate(26deg)" : "rotate(0deg)",
                  transition: "transform .32s cubic-bezier(.2,.8,.25,1)",
                }} />
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", marginTop: -72,
                  background: "radial-gradient(circle at 32% 28%,#ff8b8b,#c0261f 60%,#6b0f0b)",
                  boxShadow: "0 3px 8px rgba(0,0,0,0.6)",
                  transform: lever ? "translateY(22px)" : "none",
                  transition: "transform .32s cubic-bezier(.2,.8,.25,1)",
                }} />
              </div>
            </div>

            {/* natija */}
            <div className="mt-2 rounded-xl py-1.5 px-2 text-center min-h-[46px] flex flex-col justify-center"
              style={{ background: "rgba(0,0,0,0.55)", border: `1px solid ${GOLD.border}` }}>
              {spinning ? (
                <p className="font-black animate-pulse" style={{ color: "#ffe9a8" }}>{t.spinning}</p>
              ) : result ? (
                result.totalWin > 0 ? (
                  <>
                    <p className="font-black text-lg" style={{ color: "#39c46f", textShadow: "0 0 18px rgba(57,196,111,.55)" }}>
                      +{result.totalWin.toLocaleString()} UZS
                    </p>
                    <div className="flex flex-wrap gap-1 justify-center mt-0.5">
                      {result.lineWins.map((w, i) => (
                        <span key={i} className="text-[9px] font-bold px-1.5 py-[1px] rounded"
                          style={{ background: "rgba(255,215,102,0.14)", color: LINE_COLORS[w.line] }}>
                          L{w.line + 1} · {w.count}× · {w.amount.toLocaleString()}
                        </span>
                      ))}
                      {result.scatterWin > 0 && (
                        <span className="text-[9px] font-bold px-1.5 py-[1px] rounded"
                          style={{ background: "rgba(95,176,255,0.16)", color: "#5fb0ff" }}>
                          SCATTER {result.scatterCount}× · {result.scatterWin.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="font-black" style={{ color: "#f87171" }}>{t.noLuck}</p>
                )
              ) : (
                <p className="text-sm" style={{ color: "#c9b071" }}>{t.pressToSpin}</p>
              )}
            </div>
          </div>
        </div>

        {/* ===== CHIZIQLAR ===== */}
        <div className="w-full">
          <p className="text-[10px] font-black mb-1.5 tracking-[0.2em] text-center" style={{ color: "#c9b071" }}>
            LINIYALAR: {lines}
          </p>
          <div className="grid grid-cols-8 gap-1">
            {LINE_OPTIONS.map((n) => {
              const active = lines === n;
              return (
                <button key={n} onClick={() => setLines(n)} disabled={spinning}
                  className="py-2 rounded-lg font-black text-[12px] active:scale-95 transition-all disabled:opacity-40"
                  style={{
                    background: active ? GOLD.grad : "rgba(255,215,102,0.10)",
                    color: active ? "#3a2705" : "#ffe9a8",
                    border: `1px solid ${active ? "#fff3c4" : "rgba(255,214,102,0.3)"}`,
                  }}>
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== TIKIM (1 chiziqqa) ===== */}
        <div className="w-full">
          <p className="text-[10px] font-black mb-1.5 tracking-[0.2em] text-center" style={{ color: "#c9b071" }}>
            1 LINIYAGA TIKIM
          </p>
          <div className="grid grid-cols-3 gap-2">
            {CHIPS.map((c) => {
              const active = betPerLine === c;
              const disabled = c * lines > balance;
              return (
                <button key={c} onClick={() => setBetPerLine(c)} disabled={disabled || spinning}
                  className="py-2.5 rounded-xl font-black text-[13px] active:scale-95 transition-all disabled:opacity-35"
                  style={{
                    background: active
                      ? "linear-gradient(180deg,#ff5f57 0%,#d61f18 55%,#8e0b06 100%)"
                      : "linear-gradient(180deg,#c93a33 0%,#8e1710 60%,#5a0703 100%)",
                    color: "#fff3c4",
                    border: `1px solid ${active ? "#ffd766" : "rgba(255,214,102,0.35)"}`,
                    boxShadow: active ? `0 4px 0 #4a0503, 0 0 18px ${GOLD.glow}` : "0 4px 0 #3d0402",
                    textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                  }}>
                  {c.toLocaleString()}
                </button>
              );
            })}
          </div>
        </div>

        {/* ===== SPIN + AVTO ===== */}
        <div className="w-full flex gap-2">
          <button onClick={doSpin} disabled={!canSpin}
            className="flex-1 py-4 rounded-2xl font-black text-xl active:scale-95 transition-all disabled:opacity-40"
            style={{
              background: GOLD.grad, color: "#3a2705", border: "1px solid #fff3c4",
              boxShadow: spinning ? "none" : `0 7px 0 #6a4a0c, 0 12px 30px ${GOLD.glow}`,
              letterSpacing: "0.12em",
            }}>
            {spinning ? t.spinning : t.spinBtn}
          </button>
          <button onClick={() => setAuto(auto > 0 ? 0 : 10)}
            className="px-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
            style={{
              background: auto > 0 ? "linear-gradient(180deg,#39c46f,#136c36)" : "rgba(255,215,102,0.12)",
              color: auto > 0 ? "#eafff1" : "#ffe9a8",
              border: "1px solid rgba(255,214,102,0.4)",
            }}>
            {auto > 0 ? `AUTO ${auto}` : "AUTO"}
          </button>
        </div>

        {/* ===== TO'LOVLAR JADVALI ===== */}
        <button onClick={() => setShowPays((s) => !s)}
          className="w-full py-2 rounded-xl font-bold text-[12px]"
          style={{ background: "rgba(255,215,102,0.10)", color: "#ffe9a8", border: "1px solid rgba(255,214,102,0.3)" }}>
          {showPays ? "To'lovlar jadvalini yopish" : "To'lovlar jadvali"}
        </button>

        {showPays && (
          <div className="w-full rounded-xl p-2.5"
            style={{ background: "rgba(0,0,0,0.5)", border: `1px solid ${GOLD.border}` }}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {PAY_ROWS.map((s) => (
                <div key={s} className="flex items-center justify-between">
                  <Sym n={s} s={22} />
                  <span className="text-[10px] font-bold" style={{ color: "#ffe9a8" }}>
                    x{PAYTABLE[s][0]} / x{PAYTABLE[s][1]} / x{PAYTABLE[s][2]}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between col-span-2 pt-1 mt-1"
                style={{ borderTop: "1px solid rgba(255,215,102,0.2)" }}>
                <div className="flex items-center gap-1">
                  <Sym n={SCATTER} s={22} />
                  <span className="text-[10px]" style={{ color: "#c9b071" }}>SCATTER (istalgan joyda)</span>
                </div>
                <span className="text-[10px] font-bold" style={{ color: "#5fb0ff" }}>x3 / x10 / x50</span>
              </div>
              <p className="col-span-2 text-[9px] mt-1" style={{ color: "#c9b071" }}>
                Kombinatsiyalar chapdan o'ngga · WILD barcha belgilar o'rniga o'tadi · 3/4/5 ta belgi
              </p>
            </div>
          </div>
        )}

        {saving && <p className="text-xs text-center" style={{ color: ts.textSub }}>{t.saving}</p>}
      </div>
    </div>
  );
}
