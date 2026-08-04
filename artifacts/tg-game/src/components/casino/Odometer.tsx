import { useEffect, useRef, useState } from "react";

/**
 * 1XBET uslubidagi raqam sanagichi — balans/yutuq o'zgarganda
 * raqamlar tez aylanib yangi qiymatga chiqadi.
 */
export default function Odometer({
  value,
  duration = 700,
  className,
  style,
  prefix = "",
  suffix = "",
}: {
  value: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  prefix?: string;
  suffix?: string;
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
      <span className={up ? "odo-up" : undefined}>{shown.toLocaleString()}</span>
      {suffix}
    </span>
  );
}
