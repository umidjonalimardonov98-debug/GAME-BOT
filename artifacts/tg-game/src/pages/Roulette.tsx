import { useState, useCallback, useEffect } from "react";
import { usePlayer } from "@/lib/player-context";
import { useTheme, pageBg, GAME_BG } from "@/lib/theme-context";
import { placeBet } from "@/lib/api";
import { riggedLose, randomWhere } from "@/lib/odds";
import GameHeader from "@/components/GameHeader";
import TableFrame from "@/components/casino/TableFrame";
import Sym from "@/components/casino/Sym";
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
  const isLight = theme === "light";

  const [betInput, setBetInput] = useState("2000");
  const [pick, setPick] = useState<BetKey | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [angle, setAngle] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [prize, setPrize] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

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

  const spin = useCallback(() =>{
    if (!pick || !player || spinning || bet < 2000 || player.balance < bet) return;
    setSpinning(true);
    setResult(null);
    setPrize(0);

    // Uy foydasi: 69% hollarda yutqaziladigan son tanlanadi
    const mustLose = riggedLose();
    const num = randomWhere(WHEEL, (n) => (mustLose ? !BETS[pick].test(n) : BETS[pick].test(n)));
    const idx = WHEEL.indexOf(num);
    const per = 360 / WHEEL.length;
    // Oldingi aylanish burchagini hisobga olib, tanlangan segment markazini
    // har safar yuqoridagi ko'rsatkich ostiga aniq olib kelamiz.
    const desired = (360 - (idx + 0.5) * per) % 360;
    setAngle((current) =>{
      const normalized = ((current % 360) + 360) % 360;
      const correction = (desired - normalized + 360) % 360;
      return current + 360 * 6 + correction;
    });

    setTimeout(async () =>{
      const won = BETS[pick].test(num);
      const win = won ? Math.floor(bet * BETS[pick].mult) : 0;
      setResult(num);
      setPrize(win);
      setHistory((h) => [num, ...h].slice(0, 12));
      setSpinning(false);
      await placeBet(player.telegramId, {
        amount: bet,
        game: "roulette",
        won,
        winAmount: win,
      }).catch(() =>{});
      await refresh();
    }, 4200);
  }, [pick, player, spinning, bet, refresh]);

  const conic = `conic-gradient(${WHEEL.map((n, i) =>{
    const from = (i * 100) / WHEEL.length;
    const to = ((i + 1) * 100) / WHEEL.length;
    return `${colorOf(n)} ${from}% ${to}%`;
  }).join(",")})`;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg(theme, GAME_BG.roulette) }}>
      <GameHeader title=" RULETKA" subtitle="Yevropa ruletkasi · 0–36" />

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

          <div style={{ width: 264 * wheelScale, height: 264 * wheelScale, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="relative shrink-0"style={{ width: 264, height: 264, transform: `scale(${wheelScale})`, transformOrigin:"center" }}>
            {/* yog'och tashqi ramka */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 25%, #7c3a1d 0%, #4a1f0c 60%, #2a1006 100%)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.65), inset 0 2px 6px rgba(255,255,255,0.18)",
              }}
            />
            {/* oltin halqa */}
            <div
              className="absolute rounded-full"
              style={{
                inset: 12,
                background: "linear-gradient(135deg,#8a6b16,#d4af37 45%,#f7e59b 55%,#8a6b16)",
                boxShadow: "inset 0 0 14px rgba(0,0,0,0.5)",
              }}
            />
            {/* pointer */}
            <div
              className="absolute left-1/2 -top-2 z-30"
              style={{
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "11px solid transparent",
                borderRight: "11px solid transparent",
                borderTop: "20px solid #f7e59b",
                filter: "drop-shadow(0 3px 7px rgba(0,0,0,0.7))",
              }}
            />
            {/* aylanuvchi disk + raqamlar */}
            <div
              style={{
                position: "absolute",
                inset: 18,
                borderRadius: "50%",
                background: conic,
                transform: `rotate(${angle}deg)`,
                transition: "transform 4.1s cubic-bezier(0.14,0.78,0.04,1)",
                boxShadow:
                  "inset 0 0 0 3px rgba(212,175,55,0.85), inset 0 0 34px rgba(0,0,0,0.75), 0 6px 18px rgba(0,0,0,0.5)",
              }}
            >
              {WHEEL.map((n, i) =>{
                const deg = (i + 0.5) * (360 / WHEEL.length);
                return (
                  <span
                    key={`${n}-${i}`}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 0,
                      transformOrigin: "0 114px",
                      transform: `rotate(${deg}deg) translateX(-50%)`,
                      fontSize: 10,
                      lineHeight: "12px",
                      fontWeight: 900,
                      color: "#fff",
                      textShadow: "0 1px 2px rgba(0,0,0,0.95)",
                      paddingTop: 4,
                      pointerEvents: "none",
                    }}
                  >
                    {n}
                  </span>
                );
              })}
              {/* frets — ajratgichlar */}
              {WHEEL.map((_, i) =>{
                const deg = i * (360 / WHEEL.length);
                return (
                  <span
                    key={`f-${i}`}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 0,
                      width: 1.5,
                      height: 58,
                      marginLeft: -0.75,
                      background: "linear-gradient(180deg,rgba(247,229,155,0.9),rgba(212,175,55,0.1))",
                      transformOrigin: "50% 114px",
                      transform: `rotate(${deg}deg)`,
                      pointerEvents: "none",
                    }}
                  />
                );
              })}
            </div>

            {/* to'p — teskari yo'nalishda yuguradi */}
            <div
              className="absolute inset-0 z-20 pointer-events-none"
              style={{
                animation: spinning ? "ballRun 4.1s cubic-bezier(0.18,0.7,0.08,1) forwards":"none",
                transform: spinning ? undefined : "rotate(0deg)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "50%",
                  top: spinning ? 22 : 40,
                  marginLeft: -6,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 32% 28%,#ffffff,#d7d7d7 55%,#8b8b8b)",
                  boxShadow: "0 3px 7px rgba(0,0,0,0.7)",
                  transition: "top 0.6s ease-out",
                }}
              />
            </div>

            {/* hub — konus */}
            <div
              className="absolute inset-0 m-auto flex items-center justify-center z-10"
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "radial-gradient(circle at 38% 30%, #fff7d6 0%, #d4af37 45%, #7a5c12 100%)",
                border: "3px solid #4b3607",
                boxShadow: "0 10px 24px rgba(0,0,0,0.6), inset 0 2px 6px rgba(255,255,255,0.5)",
              }}
            >
              <span
                className="font-black text-3xl"
                style={{
                  color: result !== null ? (colorOf(result) === "#1f2937"?"#111827": colorOf(result)) :"#4b3607",
                  textShadow: "0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                {spinning ? "…" : result !== null ? result : <Sym n="wheel" s={46} />}
              </span>
            </div>
          </div>
          </div>


          {result !== null && !spinning && (
            <p className="font-black text-xl"style={{ color: prize > 0 ?"#39c46f":"#f87171" }}>
              {prize > 0 ? ` +${prize.toLocaleString()} UZS` : u("youLose")}
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
