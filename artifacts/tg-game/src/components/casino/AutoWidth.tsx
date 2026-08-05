import { useEffect, useRef, useState, type ReactNode } from "react";

/** Kengligini o'lchab beruvchi o'rovchi — canvas o'yinlar uchun */
export default function AutoWidth({ children, min = 240 }: { children: (w: number) => ReactNode; min?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(min);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(min, el.clientWidth)));
    ro.observe(el);
    setW(Math.max(min, el.clientWidth));
    return () => ro.disconnect();
  }, [min]);
  return <div ref={ref} style={{ width: "100%" }}>{children(w)}</div>;
}
