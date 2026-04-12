import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { placeBet } from "@/lib/api";

type Phase = "idle" | "countdown" | "flying" | "done";

function randomCrash(): number {
  const r = Math.random();
  if (r < 0.10) return 1.00;
  if (r < 0.45) return parseFloat((1.0 + Math.random() * 0.9).toFixed(2));
  if (r < 0.70) return parseFloat((1.9 + Math.random() * 1.5).toFixed(2));
  if (r < 0.88) return parseFloat((3.4 + Math.random() * 4.0).toFixed(2));
  return parseFloat((7.5 + Math.random() * 15).toFixed(2));
}

export default function Aviator() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();

  // Display states
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

  // Auto features
  const [autoBet, setAutoBet] = useState(false);
  const [autoCashOut, setAutoCashOut] = useState(false);
  const [autoCashOutAt, setAutoCashOutAt] = useState("2.00");

  // Refs for game loop (no stale closures)
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

  // Keep refs in sync
  useEffect(() => { playerRef.current = player; }, [player]);
  useEffect(() => { betRef.current = betAmt; }, [betAmt]);
  useEffect(() => { autoBetRef.current = autoBet; }, [autoBet]);
  useEffect(() => { autoCashOutRef.current = autoCashOut; }, [autoCashOut]);
  useEffect(() => {
    const v = parseFloat(autoCashOutAt) || 2.0;
    autoCashOutAtRef.current = v;
  }, [autoCashOutAt]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(loopRef.current);
    clearInterval(countdownRef.current);
    clearTimeout(autoRef.current);
  }, []);

  function setPhaseSync(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

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
      await placeBet(playerRef.current.telegramId, {
        amount: betRef.current, game: "aviator", won: true, winAmount: prize
      }).catch(() => {});
      await refresh();
      savingRef.current = false;
    }

    if (autoBetRef.current) {
      autoRef.current = setTimeout(startRound, 2500);
    }
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

      // Auto cash out
      if (autoCashOutRef.current && cur >= autoCashOutAtRef.current && !savingRef.current) {
        await doCashOut();
        return;
      }

      // Crashed
      if (cur >= crash) {
        clearInterval(loopRef.current);
        flyingRef.current = false;
        setMultiplier(crash);
        setResult({ won: false, mult: crash, amount: 0 });
        setHistory(h => [{ val: crash, won: false }, ...h].slice(0, 10));
        setPhaseSync("done");

        if (playerRef.current) {
          placeBet(playerRef.current.telegramId, {
            amount: betRef.current, game: "aviator", won: false, winAmount: 0
          }).then(() => refresh()).catch(() => {});
        }

        if (autoBetRef.current) {
          autoRef.current = setTimeout(startRound, 2500);
        }
      }
    }, 80);
  }

  function startRound() {
    clearInterval(loopRef.current);
    clearInterval(countdownRef.current);
    clearTimeout(autoRef.current);
    flyingRef.current = false;
    savingRef.current = false;

    crashRef.current = randomCrash();
    multRef.current = 1.00;
    setMultiplier(1.00);
    setResult(null);
    setCountdown(3);
    setPhaseSync("countdown");

    let cnt = 3;
    countdownRef.current = setInterval(() => {
      cnt--;
      setCountdown(cnt);
      if (cnt <= 0) {
        clearInterval(countdownRef.current);
        startFlying();
      }
    }, 1000);
  }

  function handleStart() {
    if (!player || player.balance < betAmt || betAmt < 2000) return;
    startRound();
  }

  function handleReset() {
    clearInterval(loopRef.current);
    clearInterval(countdownRef.current);
    clearTimeout(autoRef.current);
    flyingRef.current = false;
    savingRef.current = false;
    autoBetRef.current = false;
    setAutoBet(false);
    setPhaseSync("idle");
    setMultiplier(1.00);
    setResult(null);
  }

  const multColor = multiplier < 2 ? "#f87171" : multiplier < 5 ? "#fbbf24" : "#34d399";
  const isWon = result?.won === true;
  const isCrashed = result?.won === false;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #06080f 0%, #0a0d18 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-base">✈️ AVIATOR</h1>
        <div className="flex items-center gap-1 bg-white/5 border border-yellow-400/20 px-3 py-1.5 rounded-xl">
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-bold">{(player?.balance ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {/* History */}
      <div className="px-4 mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {history.map((h, i) => (
          <span key={i} className="shrink-0 text-xs font-bold px-2 py-1 rounded-lg"
            style={{
              background: h.won ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              color: h.won ? "#4ade80" : "#f87171",
              border: `1px solid ${h.won ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`
            }}>
            {h.val.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Sky */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative" style={{ height: 200, background: "linear-gradient(180deg, #0a0d18, #050710)", border: "1px solid rgba(99,102,241,0.2)" }}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-40"
            style={{ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 7) % 100}%` }} />
        ))}

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {phase === "idle" && (
            <div className="text-center">
              <p className="text-5xl mb-2">✈️</p>
              <p className="text-white/40 text-sm">Tikish kiriting va boshlang</p>
            </div>
          )}
          {phase === "countdown" && (
            <div className="text-center">
              <p className="text-white/50 text-sm mb-2">Uchishga tayyorlanmoqda...</p>
              <p className="font-black text-7xl text-white">{countdown}</p>
            </div>
          )}
          {phase === "flying" && (
            <div className="text-center">
              <span className="text-5xl float-anim inline-block">✈️</span>
              <p className="font-black text-5xl mt-2" style={{ color: multColor }}>{multiplier.toFixed(2)}x</p>
            </div>
          )}
          {phase === "done" && isWon && (
            <div className="text-center">
              <p className="text-green-400 text-sm font-bold mb-1">✅ OLIB OLDINGIZ!</p>
              <p className="font-black text-5xl" style={{ color: "#4ade80" }}>{result.mult.toFixed(2)}x</p>
              <p className="text-green-300 font-bold mt-1">+{result.amount.toLocaleString()} UZS</p>
            </div>
          )}
          {phase === "done" && isCrashed && (
            <div className="text-center">
              <p className="text-red-400 text-sm font-bold mb-1">💥 QULAB TUSHDI!</p>
              <p className="font-black text-5xl" style={{ color: "#f87171" }}>{result.mult.toFixed(2)}x</p>
            </div>
          )}
        </div>

        {phase === "flying" && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="100%" stopColor={multColor} />
              </linearGradient>
            </defs>
            <path d={`M 20 180 Q 100 ${180 - multiplier * 10} ${Math.min(280, 20 + multiplier * 26)} ${Math.max(20, 180 - multiplier * 14)}`}
              fill="none" stroke="url(#lg)" strokeWidth="2" opacity="0.7" />
          </svg>
        )}
      </div>

      {/* CASH OUT button — only during flight */}
      {phase === "flying" && (
        <div className="mx-4 mb-3">
          <button onClick={doCashOut}
            className="w-full py-5 rounded-2xl font-black text-xl active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 8px 32px rgba(34,197,94,0.4)" }}>
            💰 CASH OUT — {Math.floor(betAmt * multiplier).toLocaleString()} UZS
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="px-4 pb-6 space-y-2">
        {/* Bet controls — only idle or done */}
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
                }} className="py-2 rounded-xl text-xs font-bold text-white/70 border border-white/10 bg-white/5 active:scale-95">{a}</button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Tikish miqdori (min 2 000)"
              value={betInput}
              onChange={(e) => {
                setBetInput(e.target.value);
                const v = Number(e.target.value) || 2000;
                setBetAmt(v); betRef.current = v;
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-yellow-400 font-black text-lg placeholder-white/20 focus:outline-none focus:border-yellow-400/50"
            />

            {/* Auto cash out */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setAutoCashOut(v => !v)}
                className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 shrink-0 ${autoCashOut ? "bg-green-500" : "bg-white/20"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${autoCashOut ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-white/60 text-sm flex-1">Avto olish (x)</span>
              <input
                type="number" step="0.1" min="1.1"
                value={autoCashOutAt}
                onChange={(e) => setAutoCashOutAt(e.target.value)}
                disabled={!autoCashOut}
                className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-yellow-400 font-bold text-sm text-center focus:outline-none disabled:opacity-40"
              />
            </div>

            {/* Auto bet */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => { const nv = !autoBet; setAutoBet(nv); autoBetRef.current = nv; }}
                className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 shrink-0 ${autoBet ? "bg-blue-500" : "bg-white/20"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${autoBet ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-white/60 text-sm flex-1">Avto tikish</span>
              {autoBet && <span className="text-blue-400 text-xs font-bold">YOQILGAN</span>}
            </div>

            {phase === "idle" ? (
              <button onClick={handleStart}
                disabled={!player || player.balance < betAmt || betAmt < 2000}
                className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", boxShadow: "0 8px 24px rgba(124,58,237,0.3)" }}>
                🚀 BOSHLASH — {betAmt.toLocaleString()} UZS
              </button>
            ) : (
              <button onClick={handleReset}
                className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
                🔄 QAYTA O'YNASH
              </button>
            )}
          </>
        )}

        {phase === "countdown" && (
          <div className="w-full py-4 rounded-2xl text-center font-bold text-yellow-400"
            style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.3)" }}>
            ✈️ Tikish: {betAmt.toLocaleString()} UZS • Tayyor bo'ling!
          </div>
        )}
      </div>
    </div>
  );
}
