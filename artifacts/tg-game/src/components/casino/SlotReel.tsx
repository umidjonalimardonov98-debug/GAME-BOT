import { useEffect, useRef, useState } from "react";
import Sym from "./Sym";
import { MOTION } from "@/lib/motion";

/**
 * Haqiqiy slot barabani — har aylanishda lenta doim PASTGA to'liq aylanadi
 * (ilgari ba'zan 1-2 katak orqaga siljirdi), belgilar tezlikda cho'ziladi,
 * oxirida "tiq" etib to'xtaydi va chaqnaydi.
 */

interface Props {
  strip: string[];
  target: string;
  spinning: boolean;
  idx: number;
  cell?: number;
  accent?: string;
}

const ROWS = 18;

export default function SlotReel({ strip, target, spinning, idx, cell = 86, accent = "#d4af37" }: Props) {
  const [items, setItems] = useState<string[]>([target]);
  const [y, setY] = useState(0);
  const [dur, setDur] = useState(0);
  const [moving, setMoving] = useState(false);
  const [stopKey, setStopKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!spinning) return;
    const filler = Array.from({ length: ROWS }, () => strip[Math.floor(Math.random() * strip.length)]);
    setDur(0);
    setItems([...filler, target]);
    setY(0);
    const d = MOTION.spin + idx * MOTION.stagger;
    timers.current.push(
      setTimeout(() => { setDur(d); setY(-(ROWS * cell)); setMoving(true); }, 30),
      setTimeout(() => setMoving(false), 30 + d * 0.7),
      setTimeout(() => {
        setStopKey((k) => k + 1);
        try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch { /* ignore */ }
      }, 30 + d),
    );
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  // to'xtagach — faqat yakuniy belgi qoladi
  useEffect(() => {
    if (spinning) return;
    const t = setTimeout(() => { setDur(0); setItems([target]); setY(0); }, 0);
    return () => clearTimeout(t);
  }, [spinning, target]);

  return (
    <div
      style={{
        width: cell,
        height: cell,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(180deg,#fffdf5 0%,#efe6cf 50%,#d9cba6 100%)",
        boxShadow:
          "inset 0 10px 16px rgba(0,0,0,0.35), inset 0 -10px 16px rgba(0,0,0,0.3), 0 4px 0 rgba(0,0,0,0.35)",
        border: `2px solid ${accent}`,
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          transition: dur ? `transform ${dur}ms cubic-bezier(.2,.85,.3,1.08)` : "none",
          willChange: "transform",
        }}
      >
        {items.map((s, i) => (
          <div key={i} style={{ height: cell, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sym n={s} s={cell * 0.62}
              style={moving ? { transform: "scaleY(1.3)", opacity: 0.75 } : { transition: "transform .18s ease-out" }} />
          </div>
        ))}
      </div>
      {stopKey > 0 && (
        <div key={stopKey} className="pointer-events-none absolute inset-0 slot-stop-flash" style={{ ["--acc" as any]: accent }} />
      )}
      {/* shisha yaltirashi */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,rgba(255,255,255,0.55) 0%,rgba(255,255,255,0) 38%,rgba(0,0,0,0.18) 100%)",
        }}
      />
    </div>
  );
}
