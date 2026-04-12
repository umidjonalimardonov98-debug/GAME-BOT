import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { placeBet } from "@/lib/api";

type BetType = "more" | "equal" | "less";
type GameState = "idle" | "rolling" | "result";

const ODDS: Record<BetType, { label: string; mult: number; emoji: string; color: string; glow: string }> = {
  less:  { label: "7 dan Kam",  mult: 2.3, emoji: "⬇️", color: "#60a5fa", glow: "rgba(96,165,250,0.4)" },
  equal: { label: "Teng 7",     mult: 5.8, emoji: "🎯", color: "#fbbf24", glow: "rgba(251,191,36,0.4)" },
  more:  { label: "7 dan Ko'p", mult: 2.3, emoji: "⬆️", color: "#34d399", glow: "rgba(52,211,153,0.4)" },
};

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 24], [70, 24], [30, 50], [70, 50], [30, 76], [70, 76]],
  };
  const v = Math.max(1, Math.min(6, value));
  return (
    <div className={`relative rounded-2xl ${rolling ? "animate-spin" : ""}`}
      style={{ width: 88, height: 88, background: "linear-gradient(145deg, #ffffff, #e8e8e8)", boxShadow: "4px 4px 12px rgba(0,0,0,0.4), -2px -2px 6px rgba(255,255,255,0.1)", animationDuration: "0.1s" }}>
      {dots[v].map(([x, y], i) => (
        <div key={i} className="absolute rounded-full"
          style={{ width: 14, height: 14, left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", background: "#1a1a2e" }} />
      ))}
    </div>
  );
}

export default function Dice() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const [betInput, setBetInput] = useState("2000");
  const [betType, setBetType] = useState<BetType | null>(null);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [won, setWon] = useState(false);
  const [prize, setPrize] = useState(0);
  const [saving, setSaving] = useState(false);

  const activeBet = Math.max(Number(betInput) || 2000, 0);
  const potential = betType ? Math.floor(activeBet * ODDS[betType].mult) : 0;

  function setQuickBet(action: string) {
    const bal = player?.balance ?? 0;
    let v = activeBet;
    if (action === "MIN") v = 2000;
    else if (action === "MAX") v = Math.min(bal, 500000);
    else if (action === "X2") v = Math.min(activeBet * 2, bal, 500000);
    else if (action === "X/2") v = Math.max(Math.floor(activeBet / 2), 2000);
    setBetInput(String(v));
  }

  const roll = useCallback(async () => {
    if (!betType || !player || player.balance < activeBet || activeBet < 2000) return;
    setGameState("rolling");

    let frame = 0;
    const interval = setInterval(async () => {
      setDice([Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)]);
      frame++;
      if (frame >= 18) {
        clearInterval(interval);
        const d1 = Math.ceil(Math.random() * 6);
        const d2 = Math.ceil(Math.random() * 6);
        const sum = d1 + d2;
        setDice([d1, d2]);
        const win = (betType === "more" && sum > 7) || (betType === "equal" && sum === 7) || (betType === "less" && sum < 7);
        const winPrize = win ? Math.floor(activeBet * ODDS[betType].mult) : 0;
        setWon(win);
        setPrize(winPrize);
        setGameState("result");
        setSaving(true);
        await placeBet(player.telegramId, { amount: activeBet, game: "dice", won: win, winAmount: winPrize }).catch(() => {});
        await refresh();
        setSaving(false);
      }
    }, 70);
  }, [betType, activeBet, player, refresh]);

  const sum = dice[0] + dice[1];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #050816 0%, #0a0a20 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-base tracking-wider">🎲 DICE</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}>
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-black">{(player?.balance ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Dice display */}
      <div className="mx-4 mb-4 rounded-2xl py-8 flex flex-col items-center relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(59,130,246,0.1))", border: "1px solid rgba(124,58,237,0.25)" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, rgba(124,58,237,0.1) 0%, transparent 70%)" }} />
        <div className="relative flex items-center gap-6">
          <div className="p-3 rounded-2xl" style={{ background: "rgba(0,0,0,0.3)" }}>
            <DiceFace value={dice[0]} rolling={gameState === "rolling"} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/20 font-black text-2xl">+</span>
            {gameState !== "idle" && (
              <div className="px-3 py-1 rounded-lg" style={{ background: "rgba(255,255,255,0.07)" }}>
                <span className="text-white font-black text-xl">{sum}</span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-2xl" style={{ background: "rgba(0,0,0,0.3)" }}>
            <DiceFace value={dice[1]} rolling={gameState === "rolling"} />
          </div>
        </div>

        {/* Result */}
        {gameState === "result" && (
          <div className="mt-4 text-center">
            <p className="text-2xl mb-1">{won ? "🎉" : "💔"}</p>
            <p className="font-black text-xl" style={{ color: won ? "#34d399" : "#f87171" }}>
              {won ? `+${prize.toLocaleString()} UZS` : "Yutqazdingiz!"}
            </p>
            {won && <p className="text-xs mt-0.5" style={{ color: "rgba(52,211,153,0.6)" }}>Yutdingiz!</p>}
          </div>
        )}
        {gameState === "rolling" && (
          <p className="mt-3 text-sm font-semibold animate-pulse" style={{ color: "rgba(255,255,255,0.4)" }}>Aylanmoqda...</p>
        )}
      </div>

      {/* Bet type selector */}
      <div className="px-4 mb-3">
        <p className="text-xs font-bold mb-2 tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>TAXMIN TANLANG</p>
        <div className="grid grid-cols-3 gap-2">
          {(["less", "equal", "more"] as BetType[]).map((type) => {
            const o = ODDS[type];
            const sel = betType === type;
            return (
              <button key={type} onClick={() => setBetType(type)} disabled={gameState === "rolling"}
                className="flex flex-col items-center py-3 rounded-2xl transition-all active:scale-95"
                style={{
                  background: sel ? `${o.glow.replace("0.4", "0.15")}` : "rgba(255,255,255,0.03)",
                  border: sel ? `1px solid ${o.color}60` : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: sel ? `0 0 20px ${o.glow}` : "none",
                }}>
                <span className="text-xl mb-1">{o.emoji}</span>
                <span className="text-xs font-semibold mb-0.5" style={{ color: sel ? o.color : "rgba(255,255,255,0.4)" }}>{o.label}</span>
                <span className="font-black text-lg" style={{ color: sel ? o.color : "white" }}>x{o.mult}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pb-6 flex-1">
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {["MIN", "X2", "X/2", "MAX"].map((a) => (
            <button key={a} disabled={gameState === "rolling"} onClick={() => setQuickBet(a)}
              className="py-2 rounded-xl text-xs font-bold active:scale-95"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              {a}
            </button>
          ))}
        </div>
        <div className="relative mb-4">
          <input
            type="number"
            placeholder="Tikish miqdori (min 2 000)"
            value={betInput}
            disabled={gameState === "rolling"}
            onChange={(e) => setBetInput(e.target.value)}
            className="w-full rounded-xl px-4 py-3 font-black text-lg focus:outline-none pr-32"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fbbf24" }}
          />
          {betType && activeBet >= 2000 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: "#34d399" }}>
              → {potential.toLocaleString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => { setGameState("idle"); setPrize(0); }} disabled={gameState === "rolling"}
            className="py-4 rounded-2xl flex items-center justify-center active:scale-95"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span className="text-xl">🔄</span>
          </button>
          <button onClick={roll}
            disabled={gameState === "rolling" || !betType || !player || player.balance < activeBet || activeBet < 2000 || saving}
            className="col-span-3 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", boxShadow: "0 8px 24px rgba(124,58,237,0.4)" }}>
            {gameState === "rolling" ? "🎲 Aylanmoqda..." : "🎲 TASHLASH"}
          </button>
        </div>
      </div>
    </div>
  );
}
