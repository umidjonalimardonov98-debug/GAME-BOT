import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Coins, Play, RotateCcw } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { placeBet } from "@/lib/api";

type BetType = "more" | "equal" | "less";
type GameState = "idle" | "rolling" | "result";

const ODDS: Record<BetType, { label: string; mult: number; desc: string; emoji: string }> = {
  less:  { label: "Ozroq 7",  mult: 2.3, desc: "x2.3", emoji: "⬇️" },
  equal: { label: "Teng 7",   mult: 5.8, desc: "x5.8", emoji: "🎯" },
  more:  { label: "Ko'proq 7",mult: 2.3, desc: "x2.3", emoji: "⬆️" },
};

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots: Record<number, [number,number][]> = {
    1: [[50,50]],
    2: [[28,28],[72,72]],
    3: [[28,28],[50,50],[72,72]],
    4: [[28,28],[72,28],[28,72],[72,72]],
    5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
    6: [[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],
  };
  const v = Math.max(1, Math.min(6, value));
  return (
    <div className={`relative w-24 h-24 bg-white rounded-2xl border-4 border-yellow-400 shadow-2xl ${rolling ? "animate-spin" : ""}`} style={{ animationDuration: "0.12s" }}>
      {dots[v].map(([x,y], i) => (
        <div key={i} className="absolute w-4 h-4 bg-gray-900 rounded-full" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)" }} />
      ))}
    </div>
  );
}

export default function Dice() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const [bet, setBet] = useState(2000);
  const [customBet, setCustomBet] = useState("");
  const [betType, setBetType] = useState<BetType | null>(null);
  const [dice, setDice] = useState<[number,number]>([1,1]);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [message, setMessage] = useState("");
  const [won, setWon] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeBet = customBet ? Number(customBet) : bet;

  const roll = useCallback(async () => {
    if (!betType || !player || player.balance < activeBet) return;
    setGameState("rolling");
    setMessage("");

    let frame = 0;
    const interval = setInterval(async () => {
      setDice([Math.ceil(Math.random()*6), Math.ceil(Math.random()*6)]);
      frame++;
      if (frame >= 16) {
        clearInterval(interval);
        const d1 = Math.ceil(Math.random()*6);
        const d2 = Math.ceil(Math.random()*6);
        const sum = d1 + d2;
        setDice([d1, d2]);
        const win = (betType==="more" && sum>7) || (betType==="equal" && sum===7) || (betType==="less" && sum<7);
        const prize = win ? Math.floor(activeBet * ODDS[betType].mult) : 0;
        setWon(win);
        setMessage(win ? `🎉 G'alaba! +${prize.toLocaleString()} UZS (${d1}+${d2}=${sum})` : `😔 Yutqazdingiz (${d1}+${d2}=${sum})`);
        setGameState("result");
        setSaving(true);
        await placeBet(player.telegramId, { amount: activeBet, game: "dice", won: win, winAmount: prize }).catch(() => {});
        await refresh();
        setSaving(false);
      }
    }, 75);
  }, [betType, activeBet, player, refresh]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0d0a00 0%, #1a1200 100%)" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-base">🎲 DICE</h1>
        <div className="flex items-center gap-1 bg-white/5 border border-yellow-400/20 px-3 py-1.5 rounded-xl">
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-bold">{(player?.balance ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Dice display */}
      <div className="flex justify-center gap-6 my-8">
        <div className="w-32 h-32 rounded-3xl flex items-center justify-center" style={{ background: "rgba(245,200,66,0.1)", border: "2px solid rgba(245,200,66,0.2)" }}>
          <DiceFace value={dice[0]} rolling={gameState==="rolling"} />
        </div>
        <div className="flex items-center">
          <span className="text-white/30 font-black text-3xl">+</span>
        </div>
        <div className="w-32 h-32 rounded-3xl flex items-center justify-center" style={{ background: "rgba(245,200,66,0.1)", border: "2px solid rgba(245,200,66,0.2)" }}>
          <DiceFace value={dice[1]} rolling={gameState==="rolling"} />
        </div>
      </div>

      {/* Result */}
      {message && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-xl text-center font-bold text-sm"
          style={{ background: won ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${won ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: won ? "#4ade80" : "#f87171" }}>
          {message}
        </div>
      )}

      <div className="px-4 flex-1">
        {/* Bet type */}
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Koeffitsiyentni tanlang</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(["less","equal","more"] as BetType[]).map((type) => {
            const o = ODDS[type];
            const sel = betType === type;
            return (
              <button key={type} onClick={() => setBetType(type)} disabled={gameState==="rolling"}
                className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all active:scale-95 ${sel ? "border-yellow-400 bg-yellow-400/10" : "border-white/10 bg-white/5"}`}>
                <span className="text-base mb-0.5">{o.emoji}</span>
                <span className={`text-xs font-semibold ${sel ? "text-yellow-300" : "text-white/60"}`}>{o.label}</span>
                <span className={`text-lg font-black ${sel ? "text-yellow-400" : "text-white"}`}>{o.desc}</span>
              </button>
            );
          })}
        </div>

        {/* Bet amount */}
        <p className="text-white/40 text-xs uppercase tracking-widest font-semibold mb-2">Tikish miqdori</p>
        <input
          type="number"
          placeholder="Miqdor kiriting (min 2 000)..."
          value={customBet}
          disabled={gameState==="rolling"}
          onChange={(e) => { setCustomBet(e.target.value); }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-yellow-400 font-black text-lg placeholder-white/20 focus:outline-none focus:border-yellow-400/50 mb-2"
        />
        <div className="grid grid-cols-4 gap-1.5 mb-2">
          {["MIN","X2","X/2","MAX"].map((a) => (
            <button key={a} disabled={gameState==="rolling"} onClick={() => {
              setCustomBet("");
              const bal = player?.balance ?? 0;
              if (a==="MIN") setBet(2000);
              else if (a==="MAX") setBet(Math.min(bal, 500000));
              else if (a==="X2") setBet(Math.min(activeBet*2, bal, 500000));
              else setBet(Math.max(Math.floor(activeBet/2), 2000));
            }} className="py-2 rounded-xl text-xs font-bold text-white/70 border border-white/10 bg-white/5 active:scale-95">{a}</button>
          ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 mb-2 flex justify-between items-center">
          <span className="text-yellow-400 font-black text-base">{activeBet.toLocaleString()} UZS</span>
          {betType && <span className="text-green-400 text-sm font-bold">→ {Math.floor(activeBet*ODDS[betType].mult).toLocaleString()} UZS</span>}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-3 gap-2 pb-6 mt-2">
          <button onClick={() => { setGameState("idle"); setMessage(""); }} disabled={gameState==="rolling"}
            className="py-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95">
            <RotateCcw className="w-5 h-5 text-blue-400" />
          </button>
          <button onClick={roll} disabled={gameState==="rolling" || !betType || !player || player.balance < activeBet || activeBet < 2000 || saving}
            className="col-span-2 py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 8px 24px rgba(34,197,94,0.3)" }}>
            <Play className="w-5 h-5" />
            {gameState==="rolling" ? "O'ynalmoqda..." : "O'YNASH"}
          </button>
        </div>
      </div>
    </div>
  );
}
