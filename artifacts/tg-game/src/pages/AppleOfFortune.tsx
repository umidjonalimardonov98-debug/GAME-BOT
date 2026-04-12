import { useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
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
  const [shakeRow, setShakeRow] = useState<number | null>(null);

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
      setShakeRow(row);
      setTimeout(() => {
        setRevealed(newRev.map((r, ri) => ri <= row ? Array(COLS).fill(true) : r));
        setGameState("lost");
        setShakeRow(null);
      }, 500);
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
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #022c1a 0%, #052e16 50%, #041a0f 100%)" }}>

      {/* Glowing orbs */}
      <div className="fixed pointer-events-none" style={{ top: -50, left: -50, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, #16a34a44 0%, transparent 70%)", filter: "blur(50px)" }} />
      <div className="fixed pointer-events-none" style={{ bottom: 80, right: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #15803d33 0%, transparent 70%)", filter: "blur(40px)" }} />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <button onClick={() => nav("/")} className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="font-black text-base tracking-wider text-white">🍎 APPLE OF FORTUNE</h1>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)" }}>
            <span className="text-green-400 text-sm font-black">{(player?.balance ?? 0).toLocaleString()} UZS</span>
          </div>
        </div>

        {/* Progress bar */}
        {gameState === "playing" && (
          <div className="px-4 mb-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
                {activeRow}/{ROWS} qator
              </span>
              <span className="text-xs font-black text-green-400">{MULTIPLIERS[Math.min(activeRow, 9)]}x</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-1.5 rounded-full transition-all"
                style={{ width: `${(activeRow / ROWS) * 100}%`, background: "linear-gradient(90deg, #16a34a, #4ade80)" }} />
            </div>
          </div>
        )}

        {/* Game grid */}
        <div className="px-3 flex-1 flex flex-col">
          {gameState === "idle" ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-28 h-28 rounded-full flex items-center justify-center mb-4 float-anim"
                style={{ background: "radial-gradient(circle, #16a34a33, #052e1688)", border: "2px solid #22c55e44", boxShadow: "0 0 40px #22c55e33" }}>
                <span style={{ fontSize: 56 }}>🍎</span>
              </div>
              <p className="text-white font-black text-xl mb-1">Apple of Fortune</p>
              <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Har qatorda 2 ta olma, 1 ta bomba</p>
              <p className="font-black text-lg" style={{ color: "#4ade80" }}>1x → 2x → ... → 10x</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 mb-3 mt-1">
              {rows.map((rowIdx) => {
                const isActive = rowIdx === activeRow && gameState === "playing";
                const isPast = rowIdx < activeRow;
                const isBomb = gameState === "lost" && rowIdx === activeRow;
                const mult = MULTIPLIERS[rowIdx];
                const isShaking = shakeRow === rowIdx;

                return (
                  <div key={rowIdx} className={`flex items-center gap-2 ${isShaking ? "shake-anim" : ""}`}>
                    {/* Multiplier label */}
                    <div className="w-10 text-right shrink-0">
                      <span className="text-xs font-black"
                        style={{ color: isPast && rowIdx < activeRow - 1 ? "rgba(74,222,128,0.3)" : rowIdx === activeRow - 1 ? "#4ade80" : isActive ? "#fbbf24" : "rgba(255,255,255,0.2)" }}>
                        {mult}x
                      </span>
                    </div>

                    {/* Cells */}
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {Array.from({ length: COLS }, (_, c) => {
                        const isRev = revealed[rowIdx]?.[c];
                        const cell = grid[rowIdx]?.[c];

                        let bg = "rgba(255,255,255,0.03)";
                        let border = "1px solid rgba(255,255,255,0.07)";
                        let shadow = "none";
                        let content: ReactNode = null;
                        let extraClass = "";

                        if (isActive) {
                          bg = "linear-gradient(135deg, rgba(21,128,61,0.35), rgba(5,46,22,0.5))";
                          border = "1px solid rgba(34,197,94,0.5)";
                          shadow = "0 0 14px rgba(34,197,94,0.2)";
                          content = (
                            <div className="w-4 h-4 rounded-full pulse-ring"
                              style={{ background: "radial-gradient(circle, #4ade80, #16a34a)" }} />
                          );
                        }

                        if (isRev && cell === "apple") {
                          bg = "linear-gradient(135deg, #16a34a, #15803d)";
                          border = "1px solid #4ade8066";
                          shadow = "0 0 20px rgba(74,222,128,0.4)";
                          extraClass = "pop-in";
                          content = <span style={{ fontSize: 24 }}>🍎</span>;
                        }

                        if (isRev && cell === "bomb") {
                          bg = "linear-gradient(135deg, #991b1b, #7f1d1d)";
                          border = "1px solid #ef444466";
                          shadow = "0 0 20px rgba(239,68,68,0.6)";
                          extraClass = "shake-anim";
                          content = <span style={{ fontSize: 24 }}>💣</span>;
                        }

                        // Past rows apple (not clicked) — show dimly
                        if (!isRev && isPast && cell === "apple") {
                          content = <span style={{ fontSize: 18, opacity: 0.2 }}>🍎</span>;
                        }

                        return (
                          <button key={c} onClick={() => pickCell(rowIdx, c)} disabled={!isActive}
                            className={`flex items-center justify-center rounded-2xl transition-all ${isActive ? "active:scale-90" : ""} ${extraClass}`}
                            style={{ aspectRatio: "2/1", background: bg, border, boxShadow: shadow }}>
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

          {/* Cash out */}
          {gameState === "playing" && activeRow > 0 && (
            <button onClick={doCashOut} disabled={saving}
              className="w-full py-3.5 rounded-2xl font-black text-base mb-2 active:scale-95 transition-transform glow-green"
              style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", color: "white" }}>
              💰 OLISH — {potential.toLocaleString()} UZS ({currentMult}x)
            </button>
          )}

          {/* Result */}
          {(gameState === "won" || gameState === "lost") && (
            <div className="rounded-3xl px-5 py-5 text-center mb-3 slide-up"
              style={{
                background: gameState === "won"
                  ? "linear-gradient(135deg, rgba(22,163,74,0.25), rgba(21,128,61,0.15))"
                  : "linear-gradient(135deg, rgba(153,27,27,0.25), rgba(127,29,29,0.15))",
                border: `1px solid ${gameState === "won" ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"}`,
                boxShadow: gameState === "won" ? "0 0 40px rgba(74,222,128,0.15)" : "0 0 40px rgba(239,68,68,0.15)"
              }}>
              <div className="text-4xl mb-2">{gameState === "won" ? "🎉" : "💥"}</div>
              <p className="font-black text-2xl" style={{ color: gameState === "won" ? "#4ade80" : "#f87171" }}>
                {gameState === "won" ? `+${cashOutAmount.toLocaleString()} UZS` : "Bomba chiqdi!"}
              </p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                {gameState === "won" ? `${activeRow} qator — ${MULTIPLIERS[activeRow - 1]}x` : "Yutqazdingiz!"}
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
                      style={a === "MAX"
                        ? { background: "rgba(22,163,74,0.25)", border: "1px solid rgba(74,222,128,0.55)", color: "#4ade80" }
                        : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                      {a}
                    </button>
                  ))}
                </div>
                <input type="number" placeholder="Miqdor (min 2 000)" value={customBet}
                  onChange={(e) => setCustomBet(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3.5 font-black text-lg focus:outline-none mb-2"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(34,197,94,0.25)", color: "#4ade80" }} />
                <button onClick={gameState === "idle" ? start : reset}
                  disabled={gameState === "idle" && (!player || player.balance < activeBet || activeBet < 2000)}
                  className="w-full py-4 rounded-2xl font-black text-base active:scale-95 transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #16a34a, #15803d)", boxShadow: "0 8px 28px rgba(22,163,74,0.5)", color: "white" }}>
                  {gameState === "idle" ? "🍎 O'YINNI BOSHLASH" : "🔄 QAYTA O'YNASH"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
