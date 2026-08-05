import { useEffect, useRef, useState } from "react";
import Sym from "./Sym";

/**
 * Haqiqiy slot ustuni — 3 ta ko'rinadigan katak, lenta pastga aylanib
 * yakuniy 3 ta belgida to'xtaydi.
 */

interface Props {
  target: string[];        // 3 ta yakuniy belgi (yuqoridan pastga)
  spinning: boolean;
  idx: number;             // ustun raqami (kechikish uchun)
  cell: number;
  strip: string[];         // aralashtirish uchun belgilar
  highlight?: boolean[];   // qaysi kataklar yonadi
}

const BLUR_ROWS = 14;

export default function SlotColumn({ target, spinning, idx, cell, strip, highlight }: Props) {
  const [items, setItems] = useState<string[]>(target);
  const [y, setY] = useState(0);
  const [dur, setDur] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!spinning) return;

    const filler = Array.from(
      { length: BLUR_ROWS },
      () => strip[Math.floor(Math.random() * strip.length)]
    );
    const next = [...filler, ...target];
    setDur(0);
    setItems(next);
    setY(0);

    const t1 = setTimeout(() => {
      setDur(900 + idx * 260);
      setY(-(BLUR_ROWS * cell));
    }, 30);
    timers.current.push(t1);

    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, idx]);

  // aylanish tugagach faqat yakuniy 3 ta belgi qoladi
  useEffect(() => {
    if (spinning) return;
    setDur(0);
    setItems(target);
    setY(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinning, target.join("|")]);

  return (
    <div
      style={{
        width: cell,
        height: cell * 3,
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        background: "linear-gradient(180deg,#1a1207 0%,#0d0903 50%,#050301 100%)",
        border: "1px solid rgba(212,175,55,0.45)",
        boxShadow: "inset 0 8px 18px rgba(0,0,0,0.75), inset 0 -8px 18px rgba(0,0,0,0.7)",
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          transition: dur ? `transform ${dur}ms cubic-bezier(.16,.9,.24,1)` : "none",
        }}
      >
        {items.map((s, i) => {
          const finalIdx = i - (items.length - 3);
          const hot = !spinning && finalIdx >= 0 && highlight?.[finalIdx];
          return (
            <div
              key={i}
              style={{
                height: cell,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: "1px solid rgba(255,215,102,0.10)",
                background: hot ? "radial-gradient(circle,rgba(255,215,102,0.30),transparent 70%)" : "none",
              }}
            >
              <Sym n={s} s={cell * 0.7} glow={!!hot} />
            </div>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,rgba(0,0,0,0.55) 0%,rgba(255,255,255,0.06) 30%,rgba(255,255,255,0) 60%,rgba(0,0,0,0.6) 100%)",
        }}
      />
    </div>
  );
}
