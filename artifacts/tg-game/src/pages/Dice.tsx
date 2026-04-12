import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useBalance } from "@/lib/balance";
import { haptic, hapticNotify } from "@/lib/telegram";
import { ArrowLeft, Coins, RotateCcw, Play } from "lucide-react";

type BetType = "more" | "equal" | "less";
type GameState = "idle" | "rolling" | "result";

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const MIN_BET = 500;
const MAX_BET = 100000;

function DiceFace({ value, rolling }: { value: number; rolling: boolean }) {
  const dots: { [key: number]: number[][] } = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
  };

  return (
    <div
      className={`relative w-28 h-28 bg-white rounded-2xl shadow-2xl border-4 border-yellow-400 ${
        rolling ? "animate-spin" : ""
      }`}
      style={{ animationDuration: "0.15s" }}
    >
      {(dots[value] || dots[1]).map(([x, y], i) => (
        <div
          key={i}
          className="absolute w-5 h-5 bg-gray-900 rounded-full"
          style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
        />
      ))}
    </div>
  );
}

export default function Dice() {
  const [, navigate] = useLocation();
  const { balance, deductBalance, addBalance } = useBalance();
  const [bet, setBet] = useState(MIN_BET);
  const [betType, setBetType] = useState<BetType | null>(null);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [message, setMessage] = useState("");
  const [won, setWon] = useState(false);

  const ODDS: Record<BetType, { label: string; multiplier: number; desc: string }> = {
    more: { label: "Ko'proq 7", multiplier: 2.3, desc: "x2.3" },
    equal: { label: "Teng 7", multiplier: 5.8, desc: "x5.8" },
    less: { label: "Ozroq 7", multiplier: 2.3, desc: "x2.3" },
  };

  const roll = useCallback(async () => {
    if (!betType) {
      setMessage("Avval tikish turini tanlang!");
      return;
    }
    if (!deductBalance(bet)) {
      setMessage("Balans yetarli emas!");
      hapticNotify("error");
      return;
    }

    setGameState("rolling");
    setMessage("");
    haptic("medium");

    let frame = 0;
    const interval = setInterval(() => {
      setDice([
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
      ]);
      frame++;
      if (frame >= 15) {
        clearInterval(interval);
        const d1 = Math.ceil(Math.random() * 6);
        const d2 = Math.ceil(Math.random() * 6);
        const sum = d1 + d2;
        setDice([d1, d2]);

        let win = false;
        if (betType === "more" && sum > 7) win = true;
        if (betType === "equal" && sum === 7) win = true;
        if (betType === "less" && sum < 7) win = true;

        if (win) {
          const prize = Math.floor(bet * ODDS[betType].multiplier);
          addBalance(prize);
          setMessage(`🎉 G'alaba! +${prize.toLocaleString()} UZS (Jami: ${sum})`);
          hapticNotify("success");
          setWon(true);
        } else {
          setMessage(`😔 Yutqazdingiz. (Jami: ${sum})`);
          hapticNotify("error");
          setWon(false);
        }
        setGameState("result");
      }
    }, 80);
  }, [betType, bet, deductBalance, addBalance]);

  const reset = () => {
    setGameState("idle");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col">
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <button onClick={() => navigate("/")} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-800 border border-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black">🎲 DICE</h1>
        <div className="flex items-center gap-1 bg-gray-800 border border-yellow-500/40 px-3 py-2 rounded-xl">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-400 font-bold text-sm">{balance.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-6">
        <div className="flex gap-6 my-8 items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-32 rounded-3xl bg-yellow-600/20 border-2 border-yellow-500/40 flex items-center justify-center shadow-2xl shadow-yellow-900/40">
              <DiceFace value={dice[0]} rolling={gameState === "rolling"} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-32 rounded-3xl bg-yellow-600/20 border-2 border-yellow-500/40 flex items-center justify-center shadow-2xl shadow-yellow-900/40">
              <DiceFace value={dice[1]} rolling={gameState === "rolling"} />
            </div>
          </div>
        </div>

        {message && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-center font-bold text-sm ${
            won ? "bg-green-900/60 border border-green-500 text-green-400" : "bg-red-900/60 border border-red-500 text-red-400"
          }`}>
            {message}
          </div>
        )}

        <div className="w-full mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Koeffitsiyentni tanlang</p>
          <div className="grid grid-cols-3 gap-2">
            {(["less", "equal", "more"] as BetType[]).map((type) => {
              const info = ODDS[type];
              return (
                <button
                  key={type}
                  onClick={() => { setBetType(type); haptic("light"); }}
                  disabled={gameState === "rolling"}
                  className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                    betType === type
                      ? "border-yellow-400 bg-yellow-500/20 text-yellow-300"
                      : "border-gray-700 bg-gray-800/60 text-gray-300"
                  }`}
                >
                  <span className="text-xs font-semibold mb-1">{info.label}</span>
                  <span className="text-lg font-black">{info.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Tikish miqdori</p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {["MIN", "X2", "X/2", "MAX"].map((action) => (
              <button
                key={action}
                disabled={gameState === "rolling"}
                onClick={() => {
                  haptic("light");
                  if (action === "MIN") setBet(MIN_BET);
                  else if (action === "MAX") setBet(Math.min(balance, MAX_BET));
                  else if (action === "X2") setBet(Math.min(bet * 2, balance, MAX_BET));
                  else setBet(Math.max(Math.floor(bet / 2), MIN_BET));
                }}
                className="py-2 rounded-xl bg-gray-800 border border-gray-600 text-sm font-bold text-gray-200 active:scale-95 transition-transform"
              >
                {action}
              </button>
            ))}
          </div>
          <div className="bg-gray-800 border border-gray-600 rounded-xl px-4 py-3">
            <p className="text-yellow-400 font-black text-lg">{bet.toLocaleString()} UZS</p>
          </div>
          <input
            type="range"
            min={MIN_BET}
            max={Math.min(balance, MAX_BET)}
            step={500}
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            disabled={gameState === "rolling"}
            className="w-full mt-2 accent-yellow-400"
          />
        </div>

        <div className="w-full grid grid-cols-3 gap-3 mt-2">
          <button
            onClick={() => { reset(); haptic("light"); }}
            disabled={gameState === "rolling"}
            className="py-4 rounded-2xl bg-gray-800 border border-gray-600 flex items-center justify-center"
          >
            <RotateCcw className="w-5 h-5 text-blue-400" />
          </button>
          <button
            onClick={roll}
            disabled={gameState === "rolling"}
            className="col-span-2 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 font-black text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-green-900/40 disabled:opacity-60"
          >
            <Play className="w-5 h-5" />
            O'YNASH
          </button>
        </div>
      </div>
    </div>
  );
}
