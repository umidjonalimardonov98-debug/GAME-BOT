import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { placeBet } from "@/lib/api";

type Phase = "waiting" | "countdown" | "flying" | "crashed" | "cashedout";

function randomCrash(): number {
  const r = Math.random();
  if (r < 0.10) return 1.0;
  if (r < 0.45) return 1.0 + Math.random() * 0.9;
  if (r < 0.70) return 1.9 + Math.random() * 1.5;
  if (r < 0.88) return 3.4 + Math.random() * 4;
  return 7.5 + Math.random() * 15;
}

export default function Aviator() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const [bet, setBet] = useState(2000);
  const [betInput, setBetInput] = useState("2000");
  const [phase, setPhase] = useState<Phase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashAt, setCrashAt] = useState(1.0);
  const [betPlaced, setBetPlaced] = useState(false);
  const [cashOutMult, setCashOutMult] = useState(0);
  const [winAmount, setWinAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<number[]>([5.32, 1.24, 12.5, 2.01, 1.08, 8.9]);
  const [countdown, setCountdown] = useState(3);

  // Auto features
  const [autoBet, setAutoBet] = useState(false);
  const [autoCashOut, setAutoCashOut] = useState(false);
  const [autoCashOutAt, setAutoCashOutAt] = useState(2.0);
  const [autoCashOutInput, setAutoCashOutInput] = useState("2.00");

  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const countdownRef = useRef<ReturnType<typeof setInterval>>();
  const multRef = useRef(1.0);
  const betPlacedRef = useRef(false);
  const autoCashOutRef = useRef(false);
  const autoCashOutAtRef = useRef(2.0);
  const autoRestarting = useRef(false);

  // Keep refs in sync
  useEffect(() => { betPlacedRef.current = betPlaced; }, [betPlaced]);
  useEffect(() => { autoCashOutRef.current = autoCashOut; }, [autoCashOut]);
  useEffect(() => { autoCashOutAtRef.current = autoCashOutAt; }, [autoCashOut, autoCashOutAt]);

  const doFlying = useCallback((crash: number, placed: boolean, currentBet: number, currentPlayer: typeof player) => {
    setPhase("flying");
    intervalRef.current = setInterval(async () => {
      multRef.current = multRef.current + 0.006 + multRef.current * 0.0008;
      const cur = Math.round(multRef.current * 100) / 100;
      setMultiplier(cur);

      // Auto cash out check
      if (placed && autoCashOutRef.current && cur >= autoCashOutAtRef.current) {
        clearInterval(intervalRef.current);
        const prize = Math.floor(currentBet * cur);
        setCashOutMult(cur);
        setWinAmount(prize);
        setPhase("cashedout");
        setHistory((h) => [cur, ...h].slice(0, 10));
        if (currentPlayer) {
          setSaving(true);
          await placeBet(currentPlayer.telegramId, { amount: currentBet, game: "aviator", won: true, winAmount: prize }).catch(() => {});
          await refresh();
          setSaving(false);
        }
        return;
      }

      if (cur >= crash) {
        clearInterval(intervalRef.current);
        setMultiplier(crash);
        setPhase("crashed");
        setHistory((h) => [crash, ...h].slice(0, 10));
        if (placed && currentPlayer) {
          placeBet(currentPlayer.telegramId, { amount: currentBet, game: "aviator", won: false, winAmount: 0 }).then(() => refresh()).catch(() => {});
        }
      }
    }, 80);
  }, [refresh]);

  const startRound = useCallback((placed?: boolean, currentBet?: number) => {
    clearInterval(intervalRef.current);
    clearInterval(countdownRef.current);
    autoRestarting.current = false;
    const crash = randomCrash();
    const useBet = currentBet ?? bet;
    const usePlaced = placed ?? betPlaced;
    setCrashAt(crash);
    setMultiplier(1.0);
    multRef.current = 1.0;
    setCashOutMult(0);
    setWinAmount(0);
    setCountdown(3);
    setPhase("countdown");

    let cnt = 3;
    countdownRef.current = setInterval(() => {
      cnt--;
      setCountdown(cnt);
      if (cnt <= 0) {
        clearInterval(countdownRef.current);
        doFlying(crash, usePlaced, useBet, player);
      }
    }, 1000);
  }, [bet, betPlaced, player, doFlying]);

  // Auto restart after round ends
  useEffect(() => {
    if ((phase === "crashed" || phase === "cashedout") && autoBet && !autoRestarting.current) {
      autoRestarting.current = true;
      const newBet = bet;
      setTimeout(() => {
        setBetPlaced(true);
        betPlacedRef.current = true;
        startRound(true, newBet);
      }, 2000);
    }
  }, [phase, autoBet, bet, startRound]);

  useEffect(() => () => { clearInterval(intervalRef.current); clearInterval(countdownRef.current); }, []);

  const placeBetAction = () => {
    if (!player || player.balance < bet || bet < 2000) return;
    setBetPlaced(true);
    betPlacedRef.current = true;
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
    clearInterval(countdownRef.current);
    autoRestarting.current = false;
    setPhase("waiting");
    setBetPlaced(false);
    betPlacedRef.current = false;
    setMultiplier(1.0);
    multRef.current = 1.0;
    setCashOutMult(0);
    setWinAmount(0);
    setAutoBet(false);
  };

  const multColor = multiplier < 2 ? "#f87171" : multiplier < 5 ? "#fbbf24" : "#34d399";

  const isIdle = phase === "waiting" || phase === "crashed" || phase === "cashedout";

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
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden relative" style={{ height: 200, background: "linear-gradient(180deg, #0a0d18, #050710)", border: "1px solid rgba(99,102,241,0.2)" }}>
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-40"
            style={{ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 7) % 100}%` }} />
        ))}

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {phase === "countdown" ? (
            <div className="text-center">
              <p className="text-white/40 text-sm mb-2">Tayyorlanmoqda...</p>
              <p className="font-black text-6xl text-white">{countdown}</p>
            </div>
          ) : phase === "crashed" ? (
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
              <p className="font-black text-5xl mt-2" style={{ color: multColor }}>{multiplier.toFixed(2)}x</p>
            </div>
          )}
        </div>

        {phase === "flying" && (
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="100%" stopColor={multColor} />
              </linearGradient>
            </defs>
            <path d={`M 20 180 Q 100 160 ${Math.min(280, 20 + multiplier * 28)} ${Math.max(20, 180 - multiplier * 14)}`}
              fill="none" stroke="url(#lineGrad)" strokeWidth="2" opacity="0.6" />
          </svg>
        )}
      </div>

      {/* Cash out button during flight */}
      {phase === "flying" && (
        <div className="mx-4 mb-3">
          <button onClick={cashOut} disabled={!betPlaced || saving}
            className="w-full py-5 rounded-2xl font-black text-xl active:scale-95 transition-all disabled:opacity-40"
            style={{ background: betPlaced ? "linear-gradient(135deg, #22c55e, #16a34a)" : "rgba(255,255,255,0.08)", boxShadow: betPlaced ? "0 8px 32px rgba(34,197,94,0.4)" : "none" }}>
            {betPlaced ? `💰 CASH OUT — ${Math.floor(bet * multiplier).toLocaleString()} UZS` : "⏳ Tikish yo'q"}
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="px-4 pb-4 space-y-2">
        {isIdle && (
          <>
            {/* Bet amount */}
            <div className="grid grid-cols-4 gap-1.5">
              {["MIN","X2","X/2","MAX"].map((a) => (
                <button key={a} onClick={() => {
                  const bal = player?.balance ?? 0;
                  let v = bet;
                  if (a==="MIN") v = 2000;
                  else if (a==="MAX") v = Math.min(bal, 500000);
                  else if (a==="X2") v = Math.min(bet*2, bal, 500000);
                  else v = Math.max(Math.floor(bet/2), 2000);
                  setBet(v);
                  setBetInput(String(v));
                }} className="py-2 rounded-xl text-xs font-bold text-white/70 border border-white/10 bg-white/5 active:scale-95">{a}</button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Tikish miqdori (min 2 000)"
              value={betInput}
              onChange={(e) => { setBetInput(e.target.value); setBet(Number(e.target.value) || 2000); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-yellow-400 font-black text-lg placeholder-white/20 focus:outline-none focus:border-yellow-400/50"
            />

            {/* Auto cash out */}
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setAutoCashOut(v => !v)}
                className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 ${autoCashOut ? "bg-green-500" : "bg-white/20"}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-all ${autoCashOut ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-white/60 text-sm flex-1">Avto olish (x)</span>
              <input
                type="number"
                step="0.1"
                min="1.1"
                value={autoCashOutInput}
                onChange={(e) => { setAutoCashOutInput(e.target.value); setAutoCashOutAt(Number(e.target.value) || 2); }}
                disabled={!autoCashOut}
                className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-yellow-400 font-bold text-sm text-center focus:outline-none disabled:opacity-40"
              />
            </div>

            {/* Auto bet */}
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={() => setAutoBet(v => !v)}
                className={`w-10 h-5 rounded-full transition-all flex items-center px-0.5 ${autoBet ? "bg-blue-500" : "bg-white/20"}`}>
                <div className={`w-4 h-4 rounded-full bg-white transition-all ${autoBet ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className="text-white/60 text-sm flex-1">Avto tikish (har raund)</span>
              {autoBet && <span className="text-blue-400 text-xs font-bold">YOQILGAN</span>}
            </div>

            {/* Action buttons */}
            {phase === "waiting" ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={placeBetAction} disabled={betPlaced || !player || player.balance < bet || bet < 2000}
                  className="py-4 rounded-2xl font-black text-sm active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: betPlaced ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
                  {betPlaced ? "✅ Tikish qo'yildi" : "🎯 Tikish Qo'yish"}
                </button>
                <button onClick={() => startRound()}
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
        )}

        {/* During countdown show bet button */}
        {phase === "countdown" && !betPlaced && (
          <button onClick={placeBetAction} disabled={!player || player.balance < bet || bet < 2000}
            className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)" }}>
            🎯 Tikish Qo'yish — {bet.toLocaleString()} UZS
          </button>
        )}
        {phase === "countdown" && betPlaced && (
          <div className="w-full py-4 rounded-2xl text-center font-black text-base text-green-400"
            style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
            ✅ Tikish qo'yildi — {bet.toLocaleString()} UZS
          </div>
        )}
      </div>
    </div>
  );
}
