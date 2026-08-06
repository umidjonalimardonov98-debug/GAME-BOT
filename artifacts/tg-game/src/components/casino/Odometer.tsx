import { useEffect, useRef, useState } from "react";

/**
 * 1XBET uslubidagi raqam sanagichi — balans/yutuq o'zgarganda
 * raqamlar tez aylanib yangi qiymatga chiqadi.
 */
function fmt(n: number, compact: boolean) {
  if (!compact) return n.toLocaleString();
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (a >= 100_000) return Math.round(n / 1000) + "K";
  return n.toLocaleString();
}

export default function Odometer({
  value,
  duration = 700,
  className,
  style,
  prefix = "",
  suffix = "",
  compact = false,
}: {
  value: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  prefix?: string;
  suffix?: string;
  /** katta sonlarni qisqartirib ko'rsatadi: 1 234 567 -> 1.23M */
  compact?: boolean;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(a + (b - a) * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      from.current = b;
    };
  }, [value, duration]);

  const up = value > from.current;

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {prefix}
      <span className={up ? "odo-up" : undefined}>{fmt(shown, compact)}</span>
      {suffix}
    </span>
  );
}
