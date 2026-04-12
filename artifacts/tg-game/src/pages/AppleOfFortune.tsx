import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Coins } from "lucide-react";
import { usePlayer } from "@/lib/player-context";
import { placeBet } from "@/lib/api";

const ROWS = 10;
const COLS = 3;
const MULTIPLIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Cell = "apple" | "bomb";
type GameState = "idle" | "playing" | "won" | "lost";

function generateGrid(): Cell[][] {
  return Array.from({ length: ROWS }, () => {
    const bombIdx = Math.floor(Math.random() * COLS);
    return Array.from({ length: COLS }, (_, c) => (c === bombIdx ? "bomb" : "apple")) as Cell[];
  });
}

export default function AppleOfFortune() {
  const [, nav] = useLocation();
  const { player, refresh } = usePlayer();

  const [bet, setBet] = useState(2000);
  const [customBet, setCustomBet] = useState("");
  const [gameState, setGameState] = useState<GameState>("idle");
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [revealed, setRevealed] = useState<boolean[][]>([]);
  const [activeRow, setActiveRow] = useState(0);
  const [cashOutAmount, setCashOutAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const activeBet = customBet ? Math.max(2000, Number(customBet)) : bet;
  const currentMult = activeRow > 0 ? MULTIPLIERS[activeRow - 1] : null;
  const nextMult = MULTIPLIERS[activeRow];
  const potential = Math.floor(activeBet * (currentMult ?? 1));

  const start = () => {
    if (!player || player.balance < activeBet || activeBet < 2000) return;
    const g = generateGrid();
    setGrid(g);
    setRevealed(Array.from({ length: ROWS }, () => Array(COLS).fill(false)));
    setActiveRow(0);
    setCashOutAmount(0);
    setGameState("playing");
  };

  const pickCell = async (row: number, col: number) => {
    if (gameState !== "playing" || row !== activeRow || revealed[row][col]) return;

    const newRevealed = revealed.map((r) => [...r]);
    newRevealed[row][col] = true;
    setRevealed(newRevealed);

    if (grid[row][col] === "bomb") {
      const allRevealed = newRevealed.map((r, ri) =>
        ri <= row ? Array(COLS).fill(true) : r
      );
      setRevealed(allRevealed);
      setGameState("lost");
      setSaving(true);
      if (player) {
        await placeBet(player.telegramId, { amount: activeBet, game: "apple", won: false, winAmount: 0 }).catch(() => {});
        await refresh();
      }
      setSaving(false);
      return;
    }

    const newActive = row + 1;
    setActiveRow(newActive);

    if (newActive === ROWS) {
      const prize = Math.floor(activeBet * MULTIPLIERS[ROWS - 1]);
      setCashOutAmount(prize);
      setGameState("won");
      setSaving(true);
      if (player) {
        await placeBet(player.telegramId, { amount: activeBet, game: "apple", won: true, winAmount: prize }).catch(() => {});
        await refresh();
      }
      setSaving(false);
    }
  };

  const doCashOut = async () => {
    if (activeRow === 0 || gameState !== "playing") return;
    const prize = Math.floor(activeBet * MULTIPLIERS[activeRow - 1]);
    setCashOutAmount(prize);
    const allRevealed = grid.map((row, ri) =>
      ri < activeRow ? Array(COLS).fill(true) : Array(COLS).fill(false)
    );
    setRevealed(allRevealed);
    setGameState("won");
    setSaving(true);
    if (player) {
      await placeBet(player.telegramId, { amount: activeBet, game: "apple", won: true, winAmount: prize }).catch(() => {});
      await refresh();
    }
    setSaving(false);
  };

  const reset = () => {
    setGameState("idle");
    setGrid([]);
    setRevealed([]);
    setActiveRow(0);
  };

  const rows = Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i);

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

      <div className="px-3 flex-1 flex flex-col">
        {gameState === "idle" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <span className="text-6xl inline-block mb-3">🍎</span>
              <p className="text-white/40 text-sm">O'yinni boshlang!</p>
              <p className="text-white/30 text-xs mt-1">Har bir qatorda 1 bomba, 2 olma</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 mb-3">
            {rows.map((rowIdx) => {
              const isActive = rowIdx === activeRow && gameState === "playing";
              const isPast = rowIdx < activeRow;
              const mult = MULTIPLIERS[rowIdx];

              return (
                <div key={rowIdx} className="flex items-center gap-2">
                  <div className="w-10 text-right shrink-0">
                    <span className={`text-xs font-black ${rowIdx === activeRow - 1 ? "text-green-400" : rowIdx < activeRow ? "text-green-400/40" : "text-white/30"}`}>
                      {mult}x
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    {Array.from({ length: COLS }, (_, c) => {
                      const isRev = revealed[rowIdx]?.[c];
                      const cell = grid[rowIdx]?.[c];
                      const isApple = cell === "apple";
                      const isBomb = cell === "bomb";

                      let bg = "rgba(255,255,255,0.04)";
                      let border = "1px solid rgba(255,255,255,0.08)";
                      let content: ReactNode = <span className="text-white/20">▪</span>;

                      if (isActive) {
                        bg = "linear-gradient(135deg, #1a4d20, #0d2b11)";
                        border = "1px solid rgba(34,197,94,0.4)";
                        content = <span className="text-emerald-600 text-lg">●</span>;
                      }

                      if (isRev && isApple) {
                        bg = "rgba(34,197,94,0.2)";
                        border = "1px solid rgba(34,197,94,0.5)";
                        content = <span>🍎</span>;
                      }
                      if (isRev && isBomb) {
                        bg = "rgba(239,68,68,0.2)";
                        border = "1px solid rgba(239,68,68,0.5)";
                        content = <span>💣</span>;
                      }
                      if (!isRev && isPast && isApple) {
                        bg = "rgba(34,197,94,0.08)";
                        content = <span className="opacity-40">🍎</span>;
                      }

                      return (
                        <button
                          key={c}
                          onClick={() => pickCell(rowIdx, c)}
                          disabled={!isActive}
                          className="aspect-[2/1] rounded-xl flex items-center justify-center transition-all active:scale-90 text-base"
                          style={{ background: bg, border }}
                        >
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {gameState === "playing" && activeRow > 0 && (
          <button onClick={doCashOut} disabled={saving}
            className="w-full py-3 rounded-xl font-black text-sm text-black mb-2 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 4px 16px rgba(34,197,94,0.4)" }}>
            💰 OLISH — {potential.toLocaleString()} UZS ({currentMult}x)
          </button>
        )}

        {gameState === "playing" && activeRow === 0 && (
          <div className="text-center py-2 mb-2">
            <span className="text-white/40 text-xs">Keyingi: <b className="text-green-400">{nextMult}x</b></span>
          </div>
        )}

        {gameState === "playing" && activeRow > 0 && activeRow < ROWS && (
          <div className="text-center py-1 mb-2">
            <span className="text-white/30 text-xs">Keyingi qator: <b className="text-white/60">{MULTIPLIERS[activeRow]}x</b></span>
          </div>
        )}

        {(gameState === "won" || gameState === "lost") && (
          <div className="rounded-xl px-4 py-4 text-center mb-3"
            style={{
              background: gameState === "won" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${gameState === "won" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`
            }}>
            <p className="text-2xl mb-1">{gameState === "won" ? "🎉" : "💥"}</p>
            <p className="text-white font-black text-lg">
              {gameState === "won" ? `+${cashOutAmount.toLocaleString()} UZS!` : "Yutqazdingiz!"}
            </p>
            <p className="text-white/50 text-xs mt-1">
              {gameState === "won" ? `${activeRow} qator — ${MULTIPLIERS[activeRow - 1]}x` : "Bomba chiqdi!"}
            </p>
          </div>
        )}

        <div className="mt-auto pb-4">
          {(gameState === "idle" || gameState === "won" || gameState === "lost") && (
            <>
              <div className="mb-2">
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {["MIN","X2","X/2","MAX"].map((a) => (
                    <button key={a} onClick={() => {
                      const bal = player?.balance ?? 0;
                      let v = activeBet;
                      if (a === "MIN") v = 2000;
                      else if (a === "MAX") v = Math.min(bal, 500000);
                      else if (a === "X2") v = Math.min(activeBet * 2, bal, 500000);
                      else v = Math.max(Math.floor(activeBet / 2), 2000);
                      setCustomBet(String(v));
                      setBet(v);
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
    </div>
  );
}
