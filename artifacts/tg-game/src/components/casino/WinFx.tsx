import { useEffect, useMemo } from "react";
import { useU } from "@/lib/ui-i18n";
import { sfx } from "@/lib/sound";

/**
 * 1XBET uslubidagi yutuq/yutqazish overlay effekti:
 * — konfetti + tanga yomg'iri
 * — nur porlashi (shine)
 * — koeffitsiyent va yutuq summasi katta ko'rinishda
 */

interface Props {
  open: boolean;
  win: boolean;
  amount?: number;
  multiplier?: number;
  onClose?: () => void;
  /** yutuq balansdan 5x katta bo'lsa "KATTA YUTUQ" rejimi */
  big?: boolean;
}

const CONFETTI_COLORS = ["#ffcf4a", "#39c46f", "#2f8fff", "#ff5f57", "#f0abfc", "#22d3ee"];

export default function WinFx({ open, win, amount = 0, multiplier, onClose, big }: Props) {
  const u = useU();

  const confetti = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        dur: 1.4 + Math.random() * 1.2,
        size: 5 + Math.random() * 7,
        rot: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 === 0,
      })),
    [open],
  );

  const coins = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.7,
        dur: 1.2 + Math.random() * 0.9,
        size: 16 + Math.random() * 14,
      })),
    [open],
  );

  useEffect(() => {
    if (!open) return;
    if (win) sfx.win(!!big);
    else sfx.lose();
    const t = setTimeout(() => onClose?.(), win ? 3200 : 2200);
    return () => clearTimeout(t);
  }, [open, win, big, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-6"
      onClick={onClose}
      style={{ background: "rgba(3,8,16,0.72)", backdropFilter: "blur(3px)" }}
    >
      {/* Konfetti */}
      {win && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {confetti.map((c, i) => (
            <span
              key={i}
              className="fx-confetti"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.round ? c.size : c.size * 2,
                background: c.color,
                borderRadius: c.round ? "50%" : 2,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.dur}s`,
                transform: `rotate(${c.rot}deg)`,
              }}
            />
          ))}
          {coins.map((c, i) => (
            <img
              key={`c${i}`}
              src="/symbols/coin.png"
              alt=""
              className="fx-coin"
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.size,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.dur}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Markaziy panel */}
      <div
        className="relative rounded-3xl p-[2px] w-full max-w-[330px] pop-in"
        style={{
          background: win
            ? "linear-gradient(135deg,#ffe9a8,#c89b3c 45%,#ffe9a8)"
            : "linear-gradient(135deg,#5a1f1f,#a52a2a)",
          boxShadow: win ? "0 0 60px rgba(255,207,74,0.4)" : "0 0 40px rgba(165,42,42,0.35)",
        }}
      >
        <div
          className="rounded-[22px] px-6 py-7 text-center relative overflow-hidden"
          style={{
            background: win
              ? "linear-gradient(180deg,#0f2a17,#061109)"
              : "linear-gradient(180deg,#2a0f0f,#110606)",
          }}
        >
          <div className="fx-shine" />

          <p
            className="font-black tracking-[0.14em]"
            style={{
              fontSize: big ? 24 : 20,
              color: win ? "#ffcf4a" : "#ff8b8b",
              textShadow: win ? "0 0 22px rgba(255,207,74,0.6)" : "none",
            }}
          >
            {win ? (big ? u("bigWin") : u("youWin")) : u("youLose")}
          </p>

          {typeof multiplier === "number" && (
            <p
              className="mt-2 font-black glow-pulse"
              style={{ fontSize: 40, color: win ? "#39c46f" : "rgba(255,255,255,0.35)" }}
            >
              x{multiplier.toFixed(2)}
            </p>
          )}

          {win && amount > 0 && (
            <p className="mt-1 font-black" style={{ fontSize: 22, color: "#ffffff" }}>
              +{amount.toLocaleString()}
              <span style={{ fontSize: 12, opacity: 0.6 }}> UZS</span>
            </p>
          )}

          <p className="mt-4 text-[10px] tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.4)" }}>
            {u("tapToClose").toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
