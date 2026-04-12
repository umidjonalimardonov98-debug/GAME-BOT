import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { placeBet } from "@/lib/api";

const COLS = 6;
const ROWS = 6;
const TOTAL = COLS * ROWS;
const APPLES_COUNT = 18;
const MULTIPLIERS = [
  1.0, 1.5, 2.0, 2.5, 3.0, 3.5,
  4.0, 4.5, 5.0, 5.5, 6.0, 6.5,
  7.0, 7.5, 8.0, 8.5, 9.0, 9.5,
];

type CellState = "apple" | "empty";
type GameState = "idle" | "playing" | "won" | "lost";

function generateGrid(): CellState[] {
  const grid: CellState[] = Array(TOTAL).fill("empty");
  const positions = new Set<number>();
  while (positions.size < APPLES_COUNT) positions.add(Math.floor(Math.random() * TOTAL));
  positions.forEach((i) => { grid[i] = "apple"; });
  return grid;
}

export default function AppleOfFortune() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const [bet, setBet] = useState(2000);
  const [customBet, setCustomBet] = useState("");
  const [gameState, setGameState] = useState<GameState>("idle");
  const [grid, setGrid] = useState<CellState[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(Array(TOTAL).fill(false));
  const [found, setFound] = useState(0);
  const [cashOutAmount, setCashOutAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const activeBet = customBet ? Number(customBet) : bet;
  const currentMult = found > 0 ? MULTIPLIERS[Math.min(found - 1, MULTIPLIERS.length - 1)] : 1;
  const potential = Math.floor(activeBet * currentMult);

  const start = useCallback(() => {
    if (!player || player.balance < activeBet || activeBet < 2000) return;
    setGrid(generateGrid());
    setRevealed(Array(TOTAL).fill(false));
    setFound(0);
    setCashOutAmount(0);
    setGameState("playing");
  }, [player, activeBet]);

  const handleCashOut = useCallback(async (foundCount: number) => {
    if (!player) return;
    const prize = Math.floor(activeBet * (MULTIPLIERS[Math.min(foundCount - 1, MULTIPLIERS.length - 1)] ?? 1));
    setCashOutAmount(prize);
    setGameState("won");
    setSaving(true);
    await placeBet(player.telegramId, { amount: activeBet, game: "apple", won: true, winAmount: prize }).catch(() => {});
    await refresh();
    setSaving(false);
  }, [activeBet, player, refresh]);

  const revealCell = useCallback(async (idx: number) => {
    if (gameState !== "playing" || revealed[idx]) return;
    const newRevealed = [...revealed];
    newRevealed[idx] = true;
    setRevealed(newRevealed);

    if (grid[idx] === "apple") {
      const newFound = found + 1;
      setFound(newFound);
      if (newFound === APPLES_COUNT) {
        await handleCashOut(newFound);
      }
    } else {
      setGameState("lost");
      if (player) {
        setSaving(true);
        await placeBet(player.telegramId, { amount: activeBet, game: "apple", won: false, winAmount: 0 }).catch(() => {});
        await refresh();
        setSaving(false);
      }
    }
  }, [gameState, revealed, grid, found, activeBet, player, refresh, handleCashOut]);

  const doCashOut = useCallback(async () => {
    if (found === 0 || gameState !== "playing") return;
    await handleCashOut(found);
  }, [found, gameState, handleCashOut]);

  const reset = () => {
    setGameState("idle");
    setGrid([]);
    setRevealed(Array(TOTAL).fill(false));
    setFound(0);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #060e08 0%, #0a150c 100%)" }}>
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-base">🍎 Apple of Fortune</h1>
        <div className="flex items-center gap-1 bg-white/5 border border-yellow-400/20 px-3 py-1.5 rounded-xl">
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-bold">{(player?.balance ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="px-2 mb-3">
        {gameState === "idle" ? (
          <div className="rounded-2xl flex items-center justify-center py-10" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-center">
              <span className="text-6xl float-anim inline-block">🍎</span>
              <p className="text-white/40 text-sm mt-3">O'yinni boshlang!</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
            {Array(TOTAL).fill(0).map((_, i) => {
              const isRevealed = revealed[i];
              const isApple = grid[i] === "apple";
              const showHint = (gameState === "lost" || gameState === "won") && !isRevealed;
              return (
                <button key={i} onClick={() => revealCell(i)}
                  disabled={isRevealed || gameState !== "playing"}
                  className="aspect-square rounded-xl flex items-center justify-center transition-all active:scale-90 border text-base"
                  style={{
                    border: isRevealed && isApple
                      ? "1px solid rgba(34,197,94,0.5)"
                      : isRevealed && !isApple
                      ? "1px solid rgba(239,68,68,0.3)"
                      : "1px solid rgba(34,197,94,0.2)",
                    background: isRevealed
                      ? isApple ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.1)"
                      : showHint ? "rgba(0,0,0,0.2)"
                      : "linear-gradient(135deg, #1a4d20, #0d2b11)"
                  }}>
                  {isRevealed
                    ? (isApple ? "🍎" : "🍏")
                    : showHint
                    ? <span className="opacity-30 text-xs">{isApple ? "🍎" : "🍏"}</span>
                    : <span className="text-emerald-700 text-xl">▪</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Multiplier progress bar */}
      {gameState === "playing" && (
        <div className="mx-2 mb-2 px-3 py-2 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-white/50 text-xs">Topildi: <b className="text-white">{found}/{APPLES_COUNT}</b></span>
            <span className="text-green-400 text-xs font-bold">x{currentMult.toFixed(1)} → {potential.toLocaleString()} UZS</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-1.5 rounded-full transition-all" style={{ width: `${(found / APPLES_COUNT) * 100}%`, background: "linear-gradient(90deg, #22c55e, #86efac)" }} />
          </div>
        </div>
      )}

      {/* Status bar + cashout */}
      {gameState === "playing" && found > 0 && (
        <div className="mx-2 mb-2">
          <button onClick={doCashOut} disabled={saving}
            className="w-full py-3 rounded-xl font-black text-sm text-black active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 16px rgba(34,197,94,0.4)" }}>
            💰 OLISH — {potential.toLocaleString()} UZS
          </button>
        </div>
      )}

      {/* Result */}
      {(gameState === "won" || gameState === "lost") && (
        <div className="mx-2 mb-2 rounded-xl px-4 py-4 text-center"
          style={{
            background: gameState === "won" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${gameState === "won" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`
          }}>
          <p className="text-2xl mb-1">{gameState === "won" ? "🎉" : "💥"}</p>
          <p className="text-white font-black text-lg">
            {gameState === "won" ? `+${cashOutAmount.toLocaleString()} UZS!` : "Yutqazdingiz!"}
          </p>
          <p className="text-white/50 text-xs mt-1">
            {gameState === "won" ? `${found} ta olma topildi` : "Tishlangan olma chiqdi!"}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="px-2 pb-4 mt-auto">
        {(gameState === "idle" || gameState === "won" || gameState === "lost") && (
          <>
            <div className="mb-2">
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {["MIN","X2","X/2","MAX"].map((a) => (
                  <button key={a} onClick={() => {
                    setCustomBet("");
                    const bal = player?.balance ?? 0;
                    if (a==="MIN") setBet(2000);
                    else if (a==="MAX") setBet(Math.min(bal, 500000));
                    else if (a==="X2") setBet(Math.min(activeBet*2, bal, 500000));
                    else setBet(Math.max(Math.floor(activeBet/2), 2000));
                  }} className="py-2 rounded-xl text-xs font-bold text-white/70 border border-white/10 bg-white/5 active:scale-95">{a}</button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Miqdor kiriting (min 2 000)"
                value={customBet}
                onChange={(e) => setCustomBet(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-yellow-400 font-black text-lg placeholder-white/20 focus:outline-none focus:border-yellow-400/50"
              />
            </div>
            <button onClick={gameState === "idle" ? start : reset}
              disabled={!player || player.balance < activeBet || activeBet < 2000}
              className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 8px 24px rgba(34,197,94,0.3)" }}>
              {gameState === "idle" ? "🍎 O'YINNI BOSHLASH" : "🔄 QAYTA O'YNASH"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
