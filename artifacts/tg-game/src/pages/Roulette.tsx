import { useState, useCallback, useEffect, useRef } from "react";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg, GAME_BG } from "@/lib/theme-context";
import { placeBet } from "@/lib/api";
import { rollOutcome, randomWhere } from "@/lib/odds";
import GameHeader from "@/components/GameHeader";
import TableFrame from "@/components/casino/TableFrame";
import RouletteWheel from "@/components/casino/RouletteWheel";
import { sfx } from "@/lib/sound";
import { useU } from "@/lib/ui-i18n";

const WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

type BetKey =
  | "red"|"black"|"even"|"odd"|"low"|"high"
  | "d1"|"d2"|"d3"|"zero";

const BETS: Record<BetKey, { label: string; mult: number; color: string; test: (n: number) => boolean }> = {
  red:   { label: "Qizil",  mult: 2.15, color: "#ef4444", test: (n) => REDS.has(n) },
  black: { label: "Qora",   mult: 2.15, color: "#64748b", test: (n) => n !== 0 && !REDS.has(n) },
  even:  { label: "Juft",   mult: 2.15, color: "#38bdf8", test: (n) => n !== 0 && n % 2 === 0 },
  odd:   { label: "Toq",    mult: 2.15, color: "#78b6ff", test: (n) => n % 2 === 1 },
  low:   { label: "1–18",   mult: 2.15, color: "#34d399", test: (n) => n >= 1 && n <= 18 },
  high:  { label: "19–36",  mult: 2.15, color: "#fbbf24", test: (n) => n >= 19 },
  d1:    { label: "1–12",   mult: 3.3, color: "#f472b6", test: (n) => n >= 1 && n <= 12 },
  d2:    { label: "13–24",  mult: 3.3, color: "#22d3ee", test: (n) => n >= 13 && n <= 24 },
  d3:    { label: "25–36",  mult: 3.3, color: "#c084fc", test: (n) => n >= 25 },
  zero:  { label: "Zero 0", mult: 38, color: "#39c46f", test: (n) => n === 0 },
};

const ORDER: BetKey[] = ["red", "black", "even", "odd", "low", "high", "d1", "d2", "d3", "zero"];

function colorOf(n: number) {
  if (n === 0) return "#25a55a";
  return REDS.has(n) ? "#dc2626":"#1f2937";
}

export default function Roulette() {
  const u = useU();
  const { player, refresh } = usePlayer();
  const { theme, ts } = useTheme();
  // kichik telefonlarda g'ildirak ekranga sig'sin
  const [wheelScale, setWheelScale] = useState(1);
  useEffect(() =>{
    const fit = () => setWheelScale(Math.min(1, (window.innerWidth - 84) / 264));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const isLight = false;

  const [betInput, setBetInput] = useState("2000");
  const [pick, setPick] = useState<BetKey | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [prize, setPrize] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [spinCmd, setSpinCmd] = useState<{ id: number; num: number } | null>(null);
  const spinIdRef = useRef(0);
  const outcomeRef = useRef<"win" | "refund" | "lose">("lose");
  const tickRef = useRef(0);

  const bet = Math.max(Number(betInput) || 0, 0);
  const potential = pick ? Math.floor(bet * BETS[pick].mult) : 0;

  function quick(action: string) {
    const bal = player?.balance ?? 0;
    let v = bet;
    if (action === "MIN") v = 2000;
    else if (action === "MAX") v = Math.min(bal, 500000);
    else if (action === "X2") v = Math.min(bet * 2, bal, 500000);
    else if (action === "X/2") v = Math.max(Math.floor(bet / 2), 2000);
    setBetInput(String(v));
  }

  const spin = useCallback(() => {
    if (!pick || !player || spinning || bet < 2000 || player.balance < bet) return;
    setSpinning(true);
    setResult(null);
    setPrize(0);
    sfx.spin();
    // Uy foydasi: yutqaziladigan/yutuqli son oldindan tanlanadi, keyin shar
    // real fizika bilan aynan shu uyaga tushadi.
    const outcome = rollOutcome();
    outcomeRef.current = outcome;
    const num = randomWhere(WHEEL, (n) => (outcome === "win" ? BETS[pick].test(n) : !BETS[pick].test(n)));
    setSpinCmd({ id: ++spinIdRef.current, num });
  }, [pick, player, spinning, bet]);

  const onSettled = useCallback(async (num: number) => {
    if (!pick || !player) return;
    const won = BETS[pick].test(num);
    // x1 — pul qaytarish rejimi (yutqazgan raundlarning bir qismi)
    const refund = !won && outcomeRef.current === "refund";
    const win = won ? Math.floor(bet * BETS[pick].mult) : refund ? bet : 0;
    setResult(num);
    setPrize(win);
    setHistory((h) => [num, ...h].slice(0, 12));
    setSpinning(false);
    await placeBet(player.telegramId, { amount: bet, game: "roulette", won: win > 0, winAmount: win }).catch(() => {});
    await refresh();
  }, [pick, player, bet, refresh]);

  // Xavfsizlik: g'ildirak biror sababdan to'xtamasa — natija majburiy yopiladi
  useEffect(() => {
    if (!spinning || !spinCmd) return;
    const t = window.setTimeout(() => { if (spinning) onSettled(spinCmd.num); }, 15000);
    return () => clearTimeout(t);
  }, [spinning, spinCmd, onSettled]);

  const onTick = useCallback(() => {
    const now = performance.now();
    if (now - tickRef.current > 70) { tickRef.current = now; sfx.click(); }
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.roulette) }}>
      <GameHeader icon="wheel" title=" RULETKA" subtitle="Yevropa ruletkasi · 0–36" />

      <div className="flex-1 px-4 pb-8 flex flex-col gap-4">
        {/* Wheel */}
        <TableFrame skin="green" title="ROULETTE" bulbs bulbsActive={spinning}>
        <div
          className="rounded-2xl p-4 flex flex-col items-center gap-4 relative overflow-hidden"
          style={{
            background: "radial-gradient(ellipse at 50% 20%, #16794a 0%, #0d5334 45%, #05261a 100%)",
            border: "1px solid rgba(212,175,55,0.45)",
            boxShadow: "inset 0 2px 0 rgba(255,255,255,0.1), inset 0 -22px 44px rgba(0,0,0,0.5)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 15%, rgba(251,191,36,0.14) 0%, transparent 62%)" }}
          />

          <RouletteWheel
            size={Math.round(264 * wheelScale)}
            spin={spinCmd}
            onSettled={onSettled}
            onTick={onTick}
          />

          {result !== null && !spinning && (
            <p className="font-black text-xl"style={{ color: prize > 0 ?"#39c46f":"#f87171" }}>
              {prize > 0
                ? prize === bet
                  ? `Pul qaytarildi: ${prize.toLocaleString()} UZS`
                  : ` +${prize.toLocaleString()} UZS`
                : u("youLose")}
            </p>
          )}

          {history.length > 0 && (
            <div className="flex gap-1.5 flex-wrap justify-center relative">
              {history.map((n, i) => (
                <span
                  key={i}
                  className="font-black text-white flex items-center justify-center"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 9,
                    fontSize: 11,
                    background: colorOf(n),
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
        </TableFrame>

        {/* Bet types */}
        <div className="rounded-2xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-xs font-black mb-3 tracking-widest" style={{ color: ts.textSub }}>
            TIKISH TURI
          </p>
          <div className="grid grid-cols-3 gap-2">
            {ORDER.map((k) =>{
              const b = BETS[k];
              const sel = pick === k;
              return (
                <button
                  key={k}
                  disabled={spinning}
                  onClick={() => setPick(k)}
                  className="py-3 rounded-2xl flex flex-col items-center gap-0.5 active:scale-95 transition-all"
                  style={{
                    background: sel ? `${b.color}22` : ts.input,
                    border: sel ? `1.5px solid ${b.color}88` : `1px solid ${ts.inputBorder}`,
                    boxShadow: sel ? `0 4px 18px ${b.color}44` : "0 2px 0 rgba(0,0,0,0.12)",
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: sel ? b.color : ts.textSub }}>
                    {b.label}
                  </span>
                  <span className="font-black text-base" style={{ color: sel ? b.color : ts.text }}>
                    x{b.mult}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bet amount */}
        <div className="rounded-2xl p-4" style={{ background: ts.card, border: `1px solid ${ts.cardBorder}` }}>
          <p className="text-xs font-bold mb-3 tracking-widest" style={{ color: ts.textSub }}>
             TIKISH MIQDORI
          </p>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {["MIN", "X2", "X/2", "MAX"].map((a) => (
              <button
                key={a}
                disabled={spinning}
                onClick={() => quick(a)}
                className="py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform"
                style={{ background: ts.btnSecondary, color: ts.btnSecondaryText, border: `1px solid ${ts.cardBorder}` }}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={betInput}
            disabled={spinning}
            onChange={(e) => setBetInput(e.target.value)}
            placeholder="min 2 000"
            className="w-full rounded-xl px-4 py-3 font-black text-lg outline-none"
            style={{ background: ts.input, border: `1px solid ${ts.inputBorder}`, color: ts.text }}
          />
          {pick && bet >= 2000 && (
            <p className="text-xs mt-2 font-bold"style={{ color:"#fbbf24" }}>
              Yutuq: {potential.toLocaleString()} UZS
            </p>
          )}
        </div>

        <button
          onClick={spin}
          disabled={!pick || spinning || bet < 2000 || (player?.balance ?? 0) < bet}
          className="w-full py-4 rounded-2xl font-black text-lg text-white active:scale-95 transition-all"
          style={{
            background: "linear-gradient(135deg,#b45309,#f59e0b)",
            boxShadow: "0 8px 0 #78350f, 0 10px 30px rgba(245,158,11,0.45)",
            opacity: !pick || spinning || bet < 2000 || (player?.balance ?? 0) < bet ? 0.5 : 1,
          }}
        >
          {spinning ? " Aylanmoqda...":" AYLANTIRISH"}
        </button>
      </div>
    </div>
  );
}
