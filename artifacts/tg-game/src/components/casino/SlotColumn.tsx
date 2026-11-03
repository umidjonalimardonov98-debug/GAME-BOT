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
  /** baraban ramkasi rangi — har o'yinda o'zi */
  accent?: string;
}

const BLUR_ROWS = 14;

export default function SlotColumn({ target, spinning, idx, cell, strip, highlight, accent = "#d4af37" }: Props) {
  /** lenta harakatlanyapti — belgilar cho'zilib, xiralashadi */
  const [moving, setMoving] = useState(false);
  /** ustun to'xtagan lahza — chaqnash va silkinish */
  const [stopKey, setStopKey] = useState(0);
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

    const d = 900 + idx * 260;
    const t1 = setTimeout(() => {
      setDur(d);
      setY(-(BLUR_ROWS * cell));
      setMoving(true);
    }, 30);
    // oxirgi 25% da lenta sekinlashadi — cho'zilish olinadi
    const t2 = setTimeout(() => setMoving(false), 30 + d * 0.72);
    const t3 = setTimeout(() => {
      setStopKey((k) => k + 1);
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch { /* ignore */ }
    }, 30 + d);
    timers.current.push(t1, t2, t3);

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
        border: `1px solid ${accent}88`,
        boxShadow: "inset 0 8px 18px rgba(0,0,0,0.75), inset 0 -8px 18px rgba(0,0,0,0.7)",
      }}
    >
      <div
        style={{
          transform: `translateY(${y}px)`,
          // oxirida biroz o'tib ketib, orqaga "tiq" etib qaytadi — haqiqiy baraban
          transition: dur ? `transform ${dur}ms cubic-bezier(.2,.85,.3,1.08)` : "none",
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
              <Sym n={s} s={cell * 0.7} glow={!!hot}
                style={moving ? { transform: "scaleY(1.28)", opacity: 0.78, filter: "brightness(1.15)" } : { transition: "transform .18s ease-out" }} />
            </div>
          );
        })}
      </div>
      {stopKey > 0 && (
        <div key={stopKey} className="pointer-events-none absolute inset-0 slot-stop-flash"
          style={{ ["--acc" as any]: accent }} />
      )}
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
