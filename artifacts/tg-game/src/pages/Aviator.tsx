import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { placeBet } from "@/lib/api";

type Phase = "idle" | "countdown" | "flying" | "done";

function randomCrash(): number {
  const r = Math.random();
  if (r < 0.20) return 1.00;
  if (r < 0.60) return parseFloat((1.0 + Math.random() * 0.6).toFixed(2));
  if (r < 0.78) return parseFloat((1.6 + Math.random() * 1.0).toFixed(2));
  if (r < 0.90) return parseFloat((2.6 + Math.random() * 2.5).toFixed(2));
  if (r < 0.97) return parseFloat((5.0 + Math.random() * 5.0).toFixed(2));
  return parseFloat((10.0 + Math.random() * 10).toFixed(2));
}

export default function Aviator() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();

  const [phase, setPhase] = useState<Phase>("idle");
  const [multiplier, setMultiplier] = useState(1.00);
  const [countdown, setCountdown] = useState(3);
  const [betAmt, setBetAmt] = useState(2000);
  const [betInput, setBetInput] = useState("2000");
  const [result, setResult] = useState<{ won: boolean; mult: number; amount: number } | null>(null);
  const [history, setHistory] = useState<{ val: number; won: boolean }[]>([
    { val: 5.32, won: true }, { val: 1.24, won: false }, { val: 12.5, won: true },
    { val: 2.01, won: true }, { val: 1.08, won: false }, { val: 8.9, won: true },
  ]);
  const [autoBet, setAutoBet] = useState(false);
  const [autoCashOut, setAutoCashOut] = useState(false);
  const [autoCashOutAt, setAutoCashOutAt] = useState("2.00");

  const multRef = useRef(1.00);
  const crashRef = useRef(1.00);
  const flyingRef = useRef(false);
  const betRef = useRef(2000);
  const playerRef = useRef(player);
  const autoBetRef = useRef(false);
  const autoCashOutRef = useRef(false);
  const autoCashOutAtRef = useRef(2.00);
  const loopRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const autoRef = useRef<ReturnType<typeof setTimeout>>();
  const savingRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");

  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { betRef.current = betAmt; }, [betAmt]);
  useEffect(() => { autoBetRef.current = autoBet; }, [autoBet]);
  useEffect(() => { autoCashOutRef.current = autoCashOut; }, [autoCashOut]);
  useEffect(() => { autoCashOutAtRef.current = parseFloat(autoCashOutAt) || 2.0; }, [autoCashOutAt]);
  useEffect(() => () => {
    clearInterval(loopRef.current);
    clearInterval(countdownRef.current);
    clearTimeout(autoRef.current);
  }, []);

  function setPhaseSync(p: Phase) { phaseRef.current = p; setPhase(p); }

  async function doCashOut() {
    if (phaseRef.current !== "flying" || savingRef.current) return;
    clearInterval(loopRef.current);
    flyingRef.current = false;
    const m = multRef.current;
    const prize = Math.floor(betRef.current * m);
    setResult({ won: true, mult: m, amount: prize });
    setHistory(h => [{ val: m, won: true }, ...h].slice(0, 10));
    setPhaseSync("done");
    if (playerRef.current && !savingRef.current) {
      savingRef.current = true;
      await placeBet(playerRef.current.telegramId, { amount: betRef.current, game: "aviator", won: true, winAmount: prize }).catch(() => {});
      await refresh();
      savingRef.current = false;
    }
    if (autoBetRef.current) autoRef.current = setTimeout(startRound, 2500);
  }

  function startFlying() {
    const crash = crashRef.current;
    multRef.current = 1.00;
    flyingRef.current = true;
    setPhaseSync("flying");
    setMultiplier(1.00);
    loopRef.current = setInterval(async () => {
      if (!flyingRef.current) return;
      multRef.current = parseFloat((multRef.current + 0.006 + multRef.current * 0.0008).toFixed(2));
      const cur = multRef.current;
      setMultiplier(cur);
      if (autoCashOutRef.current && cur >= autoCashOutAtRef.current && !savingRef.current) { await doCashOut(); return; }
      if (cur >= crash) {
        clearInterval(loopRef.current);
        flyingRef.current = false;
        setMultiplier(crash);
        setResult({ won: false, mult: crash, amount: 0 });
        setHistory(h => [{ val: crash, won: false }, ...h].slice(0, 10));
        setPhaseSync("done");
        if (playerRef.current) placeBet(playerRef.current.telegramId, { amount: betRef.current, game: "aviator", won: false, winAmount: 0 }).then(() => refresh()).catch(() => {});
        if (autoBetRef.current) autoRef.current = setTimeout(startRound, 2500);
      }
    }, 80);
  }

  function startRound() {
    clearInterval(loopRef.current); clearInterval(countdownRef.current); clearTimeout(autoRef.current);
    flyingRef.current = false; savingRef.current = false;
    crashRef.current = randomCrash(); multRef.current = 1.00;
    setMultiplier(1.00); setResult(null); setCountdown(3); setPhaseSync("countdown");
    let cnt = 3;
    countdownRef.current = setInterval(() => {
      cnt--; setCountdown(cnt);
      if (cnt <= 0) { clearInterval(countdownRef.current); startFlying(); }
    }, 1000);
  }

  function handleReset() {
    clearInterval(loopRef.current); clearInterval(countdownRef.current); clearTimeout(autoRef.current);
    flyingRef.current = false; savingRef.current = false; autoBetRef.current = false;
    setAutoBet(false); setPhaseSync("idle"); setMultiplier(1.00); setResult(null);
  }

  const multColor = multiplier >= 10 ? "#a78bfa" : multiplier >= 5 ? "#34d399" : multiplier >= 2 ? "#fbbf24" : "#f87171";
  const isWon = result?.won === true;
  const isCrashed = result?.won === false;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #050816 0%, #0a0a20 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-base tracking-wider">✈️ AVIATOR</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}>
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-black">{(player?.balance ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {/* History chips */}
      <div className="px-4 mb-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {history.map((h, i) => (
          <span key={i} className="shrink-0 text-xs font-black px-2.5 py-1 rounded-lg"
            style={{
              background: h.won ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
              color: h.won ? "#34d399" : "#f87171",
              border: `1px solid ${h.won ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`
            }}>
            {h.val.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Sky display */}
      <div className="mx-4 mb-3 rounded-2xl overflow-hidden relative flex items-center justify-center"
        style={{ height: 200, background: "linear-gradient(160deg, #0d0f2e, #050816)", border: "1px solid rgba(129,140,248,0.2)" }}>
        {[...Array(25)].map((_, i) => (
          <div key={i} className="absolute rounded-full"
            style={{ width: Math.random() * 2 + 1, height: Math.random() * 2 + 1, background: "white", left: `${(i * 43 + 7) % 100}%`, top: `${(i * 31 + 13) % 80}%`, opacity: 0.2 + (i % 4) * 0.1 }} />
        ))}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 80%, rgba(129,140,248,0.08) 0%, transparent 60%)" }} />

        {/* Curve during flight */}
        {phase === "flying" && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="100%" stopColor={multColor} stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path d={`M 0 190 Q ${150} ${190 - multiplier * 15} ${Math.min(290, multiplier * 28)} ${Math.max(10, 190 - multiplier * 16)}`}
              fill="none" stroke="url(#curveGrad)" strokeWidth="2.5" />
          </svg>
        )}

        <div className="relative z-10 text-center">
          {phase === "idle" && (
            <>
              <div className="text-5xl mb-2">✈️</div>
              <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>Tikish kiriting va boshlang</p>
            </>
          )}
          {phase === "countdown" && (
            <>
              <p className="text-sm font-semibold mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Tayyorlanmoqda...</p>
              <p className="font-black" style={{ fontSize: 72, color: "white", lineHeight: 1 }}>{countdown}</p>
            </>
          )}
          {phase === "flying" && (
            <>
              <div className="text-5xl mb-1 float-anim">✈️</div>
              <p className="font-black" style={{ fontSize: 52, color: multColor, lineHeight: 1, textShadow: `0 0 30px ${multColor}` }}>
                {multiplier.toFixed(2)}x
              </p>
            </>
          )}
          {phase === "done" && isWon && (
            <>
              <div className="text-4xl mb-2">🎉</div>
              <p className="font-black text-2xl mb-1" style={{ color: "#34d399" }}>{result!.mult.toFixed(2)}x</p>
              <p className="font-bold text-lg" style={{ color: "#34d399" }}>+{result!.amount.toLocaleString()} UZS</p>
            </>
          )}
          {phase === "done" && isCrashed && (
            <>
              <div className="text-4xl mb-2">💥</div>
              <p className="font-black text-2xl" style={{ color: "#f87171" }}>{result!.mult.toFixed(2)}x</p>
              <p className="text-sm font-semibold mt-1" style={{ color: "rgba(248,113,113,0.6)" }}>Qulab tushdi!</p>
            </>
          )}
        </div>
      </div>

      {/* Cash out button */}
      {phase === "flying" && (
        <div className="mx-4 mb-3">
          <button onClick={doCashOut}
            className="w-full py-5 rounded-2xl font-black text-xl active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 8px 32px rgba(16,185,129,0.5)" }}>
            💰 OLISH — {Math.floor(betAmt * multiplier).toLocaleString()} UZS
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="px-4 pb-6 space-y-2.5">
        {(phase === "idle" || phase === "done") && (
          <>
            <div className="grid grid-cols-4 gap-1.5">
              {(["MIN", "X2", "X/2", "MAX"] as const).map((a) => (
                <button key={a} onClick={() => {
                  const bal = player?.balance ?? 0;
                  let v = betAmt;
                  if (a === "MIN") v = 2000;
                  else if (a === "MAX") v = Math.min(bal, 500000);
                  else if (a === "X2") v = Math.min(betAmt * 2, bal, 500000);
                  else v = Math.max(Math.floor(betAmt / 2), 2000);
                  setBetAmt(v); setBetInput(String(v)); betRef.current = v;
                }} className="py-2 rounded-xl text-xs font-bold active:scale-95"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                  {a}
                </button>
              ))}
            </div>
            <input type="number" placeholder="Tikish miqdori (min 2 000)" value={betInput}
              onChange={(e) => { setBetInput(e.target.value); const v = Number(e.target.value) || 2000; setBetAmt(v); betRef.current = v; }}
              className="w-full rounded-xl px-4 py-3 font-black text-lg focus:outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fbbf24" }} />

            {/* Auto cash out */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setAutoCashOut(v => !v)}
                className="w-10 h-5 rounded-full transition-all flex items-center px-0.5 shrink-0"
                style={{ background: autoCashOut ? "#10b981" : "rgba(255,255,255,0.15)" }}>
                <div className="w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: autoCashOut ? "translateX(20px)" : "translateX(0)" }} />
              </button>
              <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.5)" }}>Avto olish</span>
              <input type="number" step="0.1" min="1.1" value={autoCashOutAt}
                onChange={(e) => setAutoCashOutAt(e.target.value)} disabled={!autoCashOut}
                className="w-20 rounded-lg px-2 py-1 text-sm text-center font-bold focus:outline-none disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "#fbbf24" }} />
            </div>

            {/* Auto bet */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => { const nv = !autoBet; setAutoBet(nv); autoBetRef.current = nv; }}
                className="w-10 h-5 rounded-full transition-all flex items-center px-0.5 shrink-0"
                style={{ background: autoBet ? "#3b82f6" : "rgba(255,255,255,0.15)" }}>
                <div className="w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: autoBet ? "translateX(20px)" : "translateX(0)" }} />
              </button>
              <span className="text-sm flex-1" style={{ color: "rgba(255,255,255,0.5)" }}>Avto tikish</span>
              {autoBet && <span className="text-xs font-black" style={{ color: "#60a5fa" }}>YOQILGAN</span>}
            </div>

            {phase === "idle" ? (
              <button onClick={() => { if (!player || player.balance < betAmt || betAmt < 2000) return; startRound(); }}
                disabled={!player || player.balance < betAmt || betAmt < 2000}
                className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 8px 24px rgba(124,58,237,0.4)" }}>
                🚀 BOSHLASH — {betAmt.toLocaleString()} UZS
              </button>
            ) : (
              <button onClick={handleReset}
                className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.2))", border: "1px solid rgba(59,130,246,0.4)", color: "#93c5fd" }}>
                🔄 QAYTA O'YNASH
              </button>
            )}
          </>
        )}
        {phase === "countdown" && (
          <div className="w-full py-4 rounded-2xl text-center font-bold"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
            ✈️ Tikish: {betAmt.toLocaleString()} UZS • Tayyor bo'ling!
          </div>
        )}
      </div>
    </div>
  );
}
