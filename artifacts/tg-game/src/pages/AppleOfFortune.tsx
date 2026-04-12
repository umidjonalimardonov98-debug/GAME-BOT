import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { placeBet } from "@/lib/api";

const COLS = 5;
const ROWS = 6;
const TOTAL = COLS * ROWS;
const MUSHROOMS_COUNT = 8;
const MULTIPLIERS = [1.2, 1.5, 1.9, 2.5, 3.2, 4.1, 5.5, 7.5];

type CellState = "mushroom" | "empty";
type GameState = "idle" | "playing" | "won" | "lost";

function generateGrid(): CellState[] {
  const grid: CellState[] = Array(TOTAL).fill("empty");
  const positions = new Set<number>();
  while (positions.size < MUSHROOMS_COUNT) positions.add(Math.floor(Math.random() * TOTAL));
  positions.forEach((i) => { grid[i] = "mushroom"; });
  return grid;
}

export default function AppleOfFortune() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();
  const [bet, setBet] = useState(1000);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [grid, setGrid] = useState<CellState[]>([]);
  const [revealed, setRevealed] = useState<boolean[]>(Array(TOTAL).fill(false));
  const [found, setFound] = useState(0);
  const [cashOutAmount, setCashOutAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const currentMult = found > 0 ? MULTIPLIERS[Math.min(found - 1, MULTIPLIERS.length - 1)] : 1;
  const potential = Math.floor(bet * currentMult);

  const start = useCallback(() => {
    if (!player || player.balance < bet) return;
    setGrid(generateGrid());
    setRevealed(Array(TOTAL).fill(false));
    setFound(0);
    setCashOutAmount(0);
    setGameState("playing");
  }, [player, bet]);

  const handleCashOut = useCallback(async (foundCount: number) => {
    if (!player) return;
    const prize = Math.floor(bet * (MULTIPLIERS[Math.min(foundCount - 1, MULTIPLIERS.length - 1)] ?? 1));
    setCashOutAmount(prize);
    setGameState("won");
    setSaving(true);
    await placeBet(player.telegramId, { amount: bet, game: "apple", won: true, winAmount: prize }).catch(() => {});
    await refresh();
    setSaving(false);
  }, [bet, player, refresh]);

  const revealCell = useCallback(async (idx: number) => {
    if (gameState !== "playing" || revealed[idx]) return;
    const newRevealed = [...revealed];
    newRevealed[idx] = true;
    setRevealed(newRevealed);

    if (grid[idx] === "mushroom") {
      const newFound = found + 1;
      setFound(newFound);
      if (newFound === MUSHROOMS_COUNT) {
        await handleCashOut(newFound);
      }
    } else {
      setGameState("lost");
      if (player) {
        setSaving(true);
        await placeBet(player.telegramId, { amount: bet, game: "apple", won: false, winAmount: 0 }).catch(() => {});
        await refresh();
        setSaving(false);
      }
    }
  }, [gameState, revealed, grid, found, bet, player, refresh, handleCashOut]);

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
        <h1 className="text-white font-black text-base">🍄 Apple of Fortune</h1>
        <div className="flex items-center gap-1 bg-white/5 border border-yellow-400/20 px-3 py-1.5 rounded-xl">
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-bold">{(player?.balance ?? 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="px-3 mb-3">
        {gameState === "idle" ? (
          <div className="rounded-2xl flex items-center justify-center py-16" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-center">
              <span className="text-6xl float-anim inline-block">🍄</span>
              <p className="text-white/40 text-sm mt-3">O'yinni boshlang!</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
            {Array(TOTAL).fill(0).map((_, i) => {
              const isRevealed = revealed[i];
              const isMushroom = grid[i] === "mushroom";
              const showHint = (gameState === "lost" || gameState === "won") && !isRevealed;
              return (
                <button key={i} onClick={() => revealCell(i)}
                  disabled={isRevealed || gameState !== "playing"}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all active:scale-90 border text-xl
                    ${isRevealed && isMushroom ? "border-green-500/50" : ""}
                    ${isRevealed && !isMushroom ? "border-gray-600/30" : ""}
                    ${!isRevealed && !showHint ? "border-emerald-600/30" : ""}
                    ${showHint ? "border-white/5" : ""}`}
                  style={{
                    background: isRevealed
                      ? isMushroom ? "rgba(34,197,94,0.2)" : "rgba(0,0,0,0.3)"
                      : showHint ? "rgba(0,0,0,0.2)" : "linear-gradient(135deg, #1a4d20, #0d2b11)"
                  }}>
                  {isRevealed
                    ? (isMushroom ? "🍄" : "💨")
                    : showHint
                    ? <span className="opacity-30 text-sm">{isMushroom ? "🍄" : "·"}</span>
                    : <span className="text-emerald-700 text-2xl">▪</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {gameState === "playing" && (
        <div className="mx-3 mb-3 rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div>
            <p className="text-white/50 text-xs">Topildi: <b className="text-white">{found}/{MUSHROOMS_COUNT}</b></p>
            <p className="text-xs text-green-400">x{currentMult.toFixed(1)} → <b>{potential.toLocaleString()} UZS</b></p>
          </div>
          {found > 0 && (
            <button onClick={doCashOut} disabled={saving}
              className="px-4 py-2 rounded-xl font-black text-sm text-black active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 16px rgba(34,197,94,0.4)" }}>
              💰 OLISH
            </button>
          )}
        </div>
      )}

      {(gameState === "won" || gameState === "lost") && (
        <div className="mx-3 mb-3 rounded-xl px-4 py-4 text-center"
          style={{
            background: gameState === "won" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            border: `1px solid ${gameState === "won" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`
          }}>
          <p className="text-2xl mb-1">{gameState === "won" ? "🎉" : "💥"}</p>
          <p className="text-white font-black text-lg">
            {gameState === "won" ? `+${cashOutAmount.toLocaleString()} UZS!` : "Yutqazdingiz!"}
          </p>
          <p className="text-white/50 text-xs mt-1">
            {gameState === "won" ? `${found} ta mushroom topildi` : "Hech narsasiz ketdingiz"}
          </p>
        </div>
      )}

      <div className="px-3 pb-6 mt-auto">
        {(gameState === "idle" || gameState === "won" || gameState === "lost") && (
          <>
            <div className="mb-3">
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {["MIN","X2","X/2","MAX"].map((a) => (
                  <button key={a} onClick={() => {
                    const bal = player?.balance ?? 0;
                    if (a==="MIN") setBet(500);
                    else if (a==="MAX") setBet(Math.min(bal, 100000));
                    else if (a==="X2") setBet(Math.min(bet*2, bal, 100000));
                    else setBet(Math.max(Math.floor(bet/2), 500));
                  }} className="py-2 rounded-xl text-xs font-bold text-white/70 border border-white/10 bg-white/5 active:scale-95">{a}</button>
                ))}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-yellow-400 font-black text-lg">{bet.toLocaleString()} UZS</span>
                <span className="text-white/30 text-xs">Tikish</span>
              </div>
              <input type="range" min={500} max={Math.min(player?.balance??10000, 100000)} step={500} value={bet}
                onChange={(e) => setBet(Number(e.target.value))} className="w-full mt-2 accent-green-400" />
            </div>
            <button onClick={gameState === "idle" ? start : reset}
              disabled={!player || player.balance < bet}
              className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 8px 24px rgba(34,197,94,0.3)" }}>
              {gameState === "idle" ? "🍄 O'YINNI BOSHLASH" : "🔄 QAYTA O'YNASH"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
