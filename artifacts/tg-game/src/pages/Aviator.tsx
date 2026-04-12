import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { placeBet } from "@/lib/api";

type Phase = "waiting" | "flying" | "crashed" | "cashedout";

function randomCrash(): number {
  const r = Math.random();
  if (r < 0.05) return 1.0;
  if (r < 0.3) return 1.0 + Math.random() * 0.5;
  if (r < 0.6) return 1.5 + Math.random() * 1.5;
  if (r < 0.85) return 3 + Math.random() * 5;
  return 8 + Math.random() * 20;
}

export default function Aviator() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const [bet, setBet] = useState(1000);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashAt, setCrashAt] = useState(1.0);
  const [betPlaced, setBetPlaced] = useState(false);
  const [cashOutMult, setCashOutMult] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<number[]>([5.32, 1.24, 12.5, 2.01, 1.08, 8.9]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const multRef = useRef(1.0);

  const startRound = useCallback(() => {
    const crash = randomCrash();
    setCrashAt(crash);
    setMultiplier(1.0);
    multRef.current = 1.0;
    setPhase("flying");
    setCashOutMult(0);
    setWinAmount(0);

    intervalRef.current = setInterval(() => {
      multRef.current = multRef.current + 0.01 + multRef.current * 0.002;
      const cur = Math.round(multRef.current * 100) / 100;
      setMultiplier(cur);
      if (cur >= crash) {
        clearInterval(intervalRef.current);
        setMultiplier(crash);
        setPhase("crashed");
        setHistory((h) => [crash, ...h].slice(0, 10));
        if (betPlaced) {
          placeBet(player!.telegramId, { amount: bet, game: "aviator", won: false, winAmount: 0 }).then(() => refresh()).catch(() => {});
        }
      }
    }, 60);
  }, [betPlaced, bet, player, refresh]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const placeBetAction = () => {
    if (!player || player.balance < bet) return;
    setBetPlaced(true);
  };

  const cashOut = useCallback(async () => {
    if (phase !== "flying" || !betPlaced) return;
    clearInterval(intervalRef.current);
    const m = multRef.current;
    const prize = Math.floor(bet * m);
    setCashOutMult(m);
    setWinAmount(prize);
    setPhase("cashedout");
    setHistory((h) => [m, ...h].slice(0, 10));
    if (player) {
      setSaving(true);
      await placeBet(player.telegramId, { amount: bet, game: "aviator", won: true, winAmount: prize }).catch(() => {});
      await refresh();
      setSaving(false);
    }
  }, [phase, betPlaced, bet, player, refresh]);

  const reset = () => {
    clearInterval(intervalRef.current);
    setPhase("waiting");
    setBetPlaced(false);
    setMultiplier(1.0);
    multRef.current = 1.0;
    setCashOutMult(0);
    setWinAmount(0);
  };

  const multColor = multiplier < 2 ? "#f87171" : multiplier < 5 ? "#fbbf24" : "#34d399";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #06080f 0%, #0a0d18 100%)" }}>
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
            style={{ background: h >= 2 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: h >= 2 ? "#4ade80" : "#f87171", border: `1px solid ${h >= 2 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
            {h.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Main display */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative" style={{ height: 220, background: "linear-gradient(180deg, #0a0d18, #050710)", border: "1px solid rgba(99,102,241,0.2)" }}>
        {/* Stars */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-40"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }} />
        ))}

        {/* Multiplier */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {phase === "crashed" ? (
            <div className="text-center">
              <p className="text-red-400 text-sm font-bold mb-1">💥 QULAB TUSHDI!</p>
              <p className="font-black text-5xl" style={{ color: "#f87171" }}>{multiplier.toFixed(2)}x</p>
            </div>
          ) : phase === "cashedout" ? (
            <div className="text-center">
              <p className="text-green-400 text-sm font-bold mb-1">✅ OLIB OLDINGIZ!</p>
              <p className="font-black text-5xl" style={{ color: "#4ade80" }}>{cashOutMult.toFixed(2)}x</p>
              <p className="text-green-300 font-bold mt-1">+{winAmount.toLocaleString()} UZS</p>
            </div>
          ) : phase === "waiting" ? (
            <div className="text-center">
              <p className="text-5xl mb-2">✈️</p>
              <p className="text-white/40 text-sm">Tikish qo'ying va boshlang</p>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-5xl float-anim inline-block">✈️</span>
              <p className="font-black text-5xl mt-2 count-anim" style={{ color: multColor }}>{multiplier.toFixed(2)}x</p>
            </div>
          )}
        </div>

        {/* Trajectory line */}
        {phase === "flying" && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 220" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="100%" stopColor={multColor} />
              </linearGradient>
            </defs>
            <path d={`M 20 200 Q 100 180 ${Math.min(280, 20 + multiplier * 30)} ${Math.max(20, 200 - multiplier * 15)}`}
              fill="none" stroke="url(#lineGrad)" strokeWidth="2" opacity="0.6" />
          </svg>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-6 space-y-3">
        {phase === "waiting" || phase === "crashed" || phase === "cashedout" ? (
          <>
            <div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {["MIN","X2","X/2","MAX"].map((a) => (
                  <button key={a} onClick={() => {
                    if (a==="MIN") setBet(500);
                    else if (a==="MAX") setBet(Math.min(player?.balance??0,100000));
                    else if (a==="X2") setBet(Math.min(bet*2,player?.balance??0,100000));
                    else setBet(Math.max(Math.floor(bet/2),500));
                  }} className="py-2 rounded-xl text-xs font-bold text-white/70 border border-white/10 bg-white/5 active:scale-95">{a}</button>
                ))}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-yellow-400 font-black text-lg">{bet.toLocaleString()} UZS</span>
              </div>
              <input type="range" min={500} max={Math.min(player?.balance??10000,100000)} step={500} value={bet}
                onChange={(e) => setBet(Number(e.target.value))} className="w-full mt-2 accent-blue-400" />
            </div>

            {phase === "waiting" ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={placeBetAction} disabled={betPlaced || !player || player.balance < bet}
                  className="py-4 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: betPlaced ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
                  {betPlaced ? "✅ Tikish qo'yildi" : "🎯 Tikish Qo'yish"}
                </button>
                <button onClick={startRound}
                  className="py-4 rounded-2xl font-black text-sm active:scale-95 transition-all"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", boxShadow: "0 8px 24px rgba(124,58,237,0.3)" }}>
                  🚀 BOSHLASH
                </button>
              </div>
            ) : (
              <button onClick={reset}
                className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", boxShadow: "0 8px 24px rgba(37,99,235,0.3)" }}>
                🔄 QAYTA O'YNASH
              </button>
            )}
          </>
        ) : (
          /* Flying phase */
          <button onClick={cashOut} disabled={!betPlaced || saving}
            className="w-full py-5 rounded-2xl font-black text-xl active:scale-95 transition-all disabled:opacity-40 green-glow"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 8px 32px rgba(34,197,94,0.4)" }}>
            💰 CASH OUT — {Math.floor(bet * multiplier).toLocaleString()} UZS
          </button>
        )}
      </div>
    </div>
  );
}
