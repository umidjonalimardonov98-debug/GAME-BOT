import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Global bosish effekti — barcha o'yinlar va tugmalar uchun:
 * barmoq tekkan joyda oltin to'lqin + uchqunlar, Telegram tebranishi (haptic).
 */
export function TapFx() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest("button, [role='button'], a, input[type='range']") as HTMLElement | null;
      if (!el || (el as HTMLButtonElement).disabled) return;
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light"); } catch { /* ignore */ }
      const x = e.clientX, y = e.clientY;
      const ring = document.createElement("span");
      ring.className = "tapfx-ring";
      ring.style.left = `${x}px`; ring.style.top = `${y}px`;
      document.body.appendChild(ring);
      for (let i = 0; i < 6; i++) {
        const s = document.createElement("span");
        const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
        const d = 18 + Math.random() * 16;
        s.className = "tapfx-spark";
        s.style.left = `${x}px`; s.style.top = `${y}px`;
        s.style.setProperty("--tx", `${Math.cos(a) * d}px`);
        s.style.setProperty("--ty", `${Math.sin(a) * d}px`);
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 520);
      }
      setTimeout(() => ring.remove(), 560);
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}

/** Sahifa almashganda silliq kirish animatsiyasi */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  useEffect(() => { document.getElementById("root")?.scrollTo({top:0,left:0,behavior:"instant"}); }, [loc]);
  return <div key={loc} className="page-enter">{children}</div>;
}
