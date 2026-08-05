import { useEffect, useRef, useState } from "react";
import Sym from "./Sym";
import { MOTION } from "@/lib/motion";

/** Haqiqiy slot barabani — vertikal lenta aylanadi va belgi ustida to'xtaydi */

interface Props {
  strip: string[];
  target: string;
  spinning: boolean;
  idx: number;
  cell?: number;
}

export default function SlotReel({ strip, target, spinning, idx, cell = 86 }: Props) {
  const [offset, setOffset] = useState(0);
  const loops = useRef(0);

  // Faqat aylanish boshlanganda BIR MARTA harakatlanadi va to'g'ridan-to'g'ri
  // yakuniy belgida to'xtaydi (ilgari ikki marta aylanardi).
  useEffect(() => {
    if (!spinning) return;
    loops.current += 4;
    const pos = Math.max(0, strip.indexOf(target));
    setOffset(loops.current * strip.length + pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning]);

  // uzun lenta: strip ko'p marta takrorlanadi
  const items = Array.from({ length: strip.length * 3 }, (_, i) => strip[i % strip.length]);
  const shift = (offset % (strip.length * 3)) * cell;

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
        border: "2px solid rgba(212,175,55,0.75)",
      }}
    >
      <div
        style={{
          transform: `translateY(${-shift}px)`,
          transition: `transform ${MOTION.spin + idx * MOTION.stagger}ms ${MOTION.easeSpin}`,
        }}
      >
        {items.map((s, i) => (
          <div
            key={i}
            style={{
              height: cell,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: cell * 0.5,
              filter: spinning ? "blur(1.5px)" : "none",
            }}
          >
            <Sym n={s} s={cell * 0.62} />
          </div>
        ))}
      </div>
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
