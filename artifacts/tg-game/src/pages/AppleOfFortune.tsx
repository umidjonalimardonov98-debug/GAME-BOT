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
  const potential = Math.floor(activeBet * (currentMult ?? 1));

  const start = () => {
    if (!player || player.balance < activeBet || activeBet < 2000) return;
    setGrid(generateGrid());
    setRevealed(Array.from({ length: ROWS }, () => Array(COLS).fill(false)));
    setActiveRow(0); setCashOutAmount(0); setGameState("playing");
  };

  const pickCell = async (row: number, col: number) => {
    if (gameState !== "playing" || row !== activeRow || revealed[row]?.[col]) return;
    const newRev = revealed.map(r => [...r]);
    newRev[row][col] = true;
    setRevealed(newRev);

    if (grid[row][col] === "bomb") {
      setRevealed(newRev.map((r, ri) => ri <= row ? Array(COLS).fill(true) : r));
      setGameState("lost");
      setSaving(true);
      if (player) { await placeBet(player.telegramId, { amount: activeBet, game: "apple", won: false, winAmount: 0 }).catch(() => {}); await refresh(); }
      setSaving(false);
      return;
    }

    const newActive = row + 1;
    setActiveRow(newActive);
    if (newActive === ROWS) {
      const prize = Math.floor(activeBet * MULTIPLIERS[ROWS - 1]);
      setCashOutAmount(prize); setGameState("won");
      setSaving(true);
      if (player) { await placeBet(player.telegramId, { amount: activeBet, game: "apple", won: true, winAmount: prize }).catch(() => {}); await refresh(); }
      setSaving(false);
    }
  };

  const doCashOut = async () => {
    if (activeRow === 0 || gameState !== "playing") return;
    const prize = Math.floor(activeBet * MULTIPLIERS[activeRow - 1]);
    setCashOutAmount(prize);
    setRevealed(grid.map((_, ri) => ri < activeRow ? Array(COLS).fill(true) : Array(COLS).fill(false)));
    setGameState("won");
    setSaving(true);
    if (player) { await placeBet(player.telegramId, { amount: activeBet, game: "apple", won: true, winAmount: prize }).catch(() => {}); await refresh(); }
    setSaving(false);
  };

  const reset = () => { setGameState("idle"); setGrid([]); setRevealed([]); setActiveRow(0); };

  const rows = Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg, #050816 0%, #0a0a20 100%)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <h1 className="text-white font-black text-base tracking-wider">🍎 APPLE OF FORTUNE</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}>
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-yellow-400 text-sm font-black">{(player?.balance ?? 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="px-3 flex-1 flex flex-col">
        {/* Grid */}
        {gameState === "idle" ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 rounded-2xl w-full"
              style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <div className="text-6xl mb-3">🍎</div>
              <p className="font-bold text-base text-white mb-1">Apple of Fortune</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Har qatorda 2 olma, 1 bomba</p>
              <p className="text-sm font-black mt-1" style={{ color: "#10b981" }}>1x → 2x → ... → 10x</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 mb-3">
            {rows.map((rowIdx) => {
              const isActive = rowIdx === activeRow && gameState === "playing";
              const isPast = rowIdx < activeRow;
              const mult = MULTIPLIERS[rowIdx];
              const isJustPassed = rowIdx === activeRow - 1;

              return (
                <div key={rowIdx} className="flex items-center gap-2">
                  <div className="w-9 text-right shrink-0">
                    <span className="text-xs font-black" style={{
                      color: isJustPassed ? "#10b981" : isPast ? "rgba(16,185,129,0.3)" : isActive ? "#fbbf24" : "rgba(255,255,255,0.2)"
                    }}>
                      {mult}x
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-3 gap-1.5">
                    {Array.from({ length: COLS }, (_, c) => {
                      const isRev = revealed[rowIdx]?.[c];
                      const cell = grid[rowIdx]?.[c];
                      const isApple = cell === "apple";
                      const isBomb = cell === "bomb";

                      let bg = "rgba(255,255,255,0.03)";
                      let border = "1px solid rgba(255,255,255,0.06)";
                      let content: ReactNode = null;

                      if (isActive) {
                        bg = "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))";
                        border = "1px solid rgba(16,185,129,0.4)";
                        content = <div className="w-3 h-3 rounded-full" style={{ background: "rgba(16,185,129,0.6)" }} />;
                      }
                      if (isRev && isApple) {
                        bg = "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))";
                        border = "1px solid rgba(16,185,129,0.5)";
                        content = <span className="text-base">🍎</span>;
                      }
                      if (isRev && isBomb) {
                        bg = "linear-gradient(135deg, rgba(239,68,68,0.2), rgba(220,38,38,0.1))";
                        border = "1px solid rgba(239,68,68,0.5)";
                        content = <span className="text-base">💣</span>;
                      }
                      if (!isRev && isPast && isApple) {
                        content = <span className="text-base opacity-25">🍎</span>;
                      }

                      return (
                        <button key={c} onClick={() => pickCell(rowIdx, c)} disabled={!isActive}
                          className="flex items-center justify-center rounded-xl transition-all active:scale-90"
                          style={{ aspectRatio: "2/1", background: bg, border, boxShadow: isActive ? "0 0 12px rgba(16,185,129,0.15)" : "none" }}>
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

        {/* Cash out button */}
        {gameState === "playing" && activeRow > 0 && (
          <button onClick={doCashOut} disabled={saving}
            className="w-full py-3 rounded-xl font-black text-sm mb-2 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 20px rgba(16,185,129,0.4)", color: "white" }}>
            💰 OLISH — {potential.toLocaleString()} UZS ({currentMult}x)
          </button>
        )}

        {gameState === "playing" && (
          <div className="text-center py-1 mb-2">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Keyingi: <b style={{ color: "#fbbf24" }}>{MULTIPLIERS[activeRow]}x</b>
            </span>
          </div>
        )}

        {/* Result */}
        {(gameState === "won" || gameState === "lost") && (
          <div className="rounded-2xl px-4 py-4 text-center mb-3"
            style={{
              background: gameState === "won" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              border: `1px solid ${gameState === "won" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"}`,
              boxShadow: gameState === "won" ? "0 0 30px rgba(16,185,129,0.1)" : "0 0 30px rgba(239,68,68,0.1)"
            }}>
            <p className="text-3xl mb-1">{gameState === "won" ? "🎉" : "💥"}</p>
            <p className="text-white font-black text-xl">
              {gameState === "won" ? `+${cashOutAmount.toLocaleString()} UZS` : "Yutqazdingiz!"}
            </p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {gameState === "won" ? `${activeRow} qator — ${MULTIPLIERS[activeRow - 1]}x` : "Bomba chiqdi!"}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="mt-auto pb-4">
          {(gameState === "idle" || gameState === "won" || gameState === "lost") && (
            <>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {["MIN","X2","X/2","MAX"].map((a) => (
                  <button key={a} onClick={() => {
                    const bal = player?.balance ?? 0;
                    let v = activeBet;
                    if (a === "MIN") v = 2000;
                    else if (a === "MAX") v = Math.min(bal, 500000);
                    else if (a === "X2") v = Math.min(activeBet * 2, bal, 500000);
                    else v = Math.max(Math.floor(activeBet / 2), 2000);
                    setCustomBet(String(v)); setBet(v);
                  }} className="py-2 rounded-xl text-xs font-bold active:scale-95"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                    {a}
                  </button>
                ))}
              </div>
              <input type="number" placeholder="Miqdor (min 2 000)" value={customBet}
                onChange={(e) => setCustomBet(e.target.value)}
                className="w-full rounded-xl px-4 py-3 font-black text-lg focus:outline-none mb-2"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fbbf24" }} />
              <button onClick={gameState === "idle" ? start : reset}
                disabled={!player || player.balance < activeBet || activeBet < 2000}
                className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 8px 24px rgba(16,185,129,0.4)", color: "white" }}>
                {gameState === "idle" ? "🍎 O'YINNI BOSHLASH" : "🔄 QAYTA O'YNASH"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
