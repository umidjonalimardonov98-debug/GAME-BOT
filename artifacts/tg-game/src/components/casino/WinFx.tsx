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
    const t = setTimeout(() => onClose?.(), win ? 2200 : 1400);
    return () => clearTimeout(t);
  }, [open, win, big, onClose]);

  if (!open) return null;
  void confetti;

  return (
    <div className="fixed inset-x-0 z-[999] flex justify-center px-4 pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top) + 64px)" }}>
      <style>{`
        @keyframes wt-in{0%{transform:translateY(-30px) scale(.8);opacity:0}60%{transform:translateY(4px) scale(1.04);opacity:1}100%{transform:none}}
        @keyframes wt-shake{0%,100%{transform:none}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
        @keyframes wt-shine{0%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}
        @keyframes wt-coin{0%{transform:translate(0,0) scale(.4);opacity:1}100%{transform:translate(var(--x),var(--y)) scale(1) rotate(360deg);opacity:0}}
      `}</style>
      <div onClick={onClose} className="pointer-events-auto relative rounded-2xl p-[1.5px]"
        style={{
          animation: win ? "wt-in .45s cubic-bezier(.2,1.4,.4,1) both" : "wt-in .3s ease-out both, wt-shake .35s .3s ease",
          background: win ? "linear-gradient(135deg,#fff3c4,#d4af37 50%,#fff3c4)" : "linear-gradient(135deg,#ff8b8b,#7a1d1d)",
          boxShadow: win ? "0 10px 30px rgba(0,0,0,.5),0 0 26px rgba(255,207,74,.45)" : "0 10px 26px rgba(0,0,0,.5)",
        }}>
        <div className="relative overflow-hidden rounded-[15px] flex items-center gap-3 pl-2 pr-4 py-2"
          style={{ background: win ? "linear-gradient(180deg,#14361f,#07160c)" : "linear-gradient(180deg,#3a1212,#160606)", minWidth: 220 }}>
          {win && <span className="absolute inset-y-0 w-10" style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent)", animation: "wt-shine 1.2s .2s ease-out" }} />}
          <img src={win ? (big ? "/symbols/crown.png" : "/symbols/coin.png") : "/symbols/skull.png"} alt="" width={38} height={38}
            style={{ filter: win ? "drop-shadow(0 0 8px rgba(255,207,74,.8))" : "grayscale(.4)" }} />
          <div className="flex-1 leading-tight">
            <p className="font-black text-[11px] tracking-[0.15em]" style={{ color: win ? "#ffcf4a" : "#ff9b9b" }}>
              {win ? (big ? u("bigWin") : u("youWin")) : u("youLose")}
            </p>
            {win && amount > 0
              ? <p className="font-black text-lg" style={{ color: "#fff" }}>+{amount.toLocaleString()} <span className="text-[10px] opacity-60">UZS</span></p>
              : !win && <p className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,.55)" }}>Yana urinib ko'ring</p>}
          </div>
          {typeof multiplier === "number" && multiplier > 0 && (
            <span className="font-black text-sm px-2 py-1 rounded-lg" style={{ background: win ? "rgba(57,196,111,.2)" : "rgba(255,255,255,.08)", color: win ? "#4ade80" : "rgba(255,255,255,.5)" }}>
              x{multiplier.toFixed(2)}
            </span>
          )}
        </div>
        {win && coins.slice(0, 8).map((c, i) => (
          <img key={i} src="/symbols/coin.png" alt="" className="absolute left-1/2 top-1/2"
            style={{ width: 16, ["--x" as any]: `${Math.cos(i * 0.785) * 140}px`, ["--y" as any]: `${Math.sin(i * 0.785) * 60 + 30}px`,
              animation: `wt-coin ${c.dur}s ease-out ${i * .04}s both` }} />
        ))}
      </div>
    </div>
  );
}
