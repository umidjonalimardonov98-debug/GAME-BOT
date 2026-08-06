import { useEffect, useState } from "react";

/**
 * Ekran profili — rasm o'lchami va animatsiya tezligini qurilmaga moslash.
 * Kichik/sekin qurilmada rasm kichikroq, animatsiya sekinroq (yoki o'chiq).
 */

export type ScreenProfile = {
  /** "xs" | "sm" | "md" | "lg" */
  tier: "xs" | "sm" | "md" | "lg";
  /** rasm uchun optimal piksel kengligi (dpr hisobga olingan) */
  imgPx: number;
  /** animatsiya tezlik koeffitsiyenti (1 = normal, >1 = sekinroq) */
  fxScale: number;
  /** foydalanuvchi animatsiyani kamaytirishni so'ragan yoki qurilma sust */
  reduced: boolean;
  /** grid ustunlari soni */
  cols: number;
  width: number;
};

function measure(): ScreenProfile {
  if (typeof window === "undefined") {
    return { tier: "sm", imgPx: 480, fxScale: 1, reduced: false, cols: 2, width: 390 };
  }
  const w = window.innerWidth || 390;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const reducedPref = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const slow = !!conn?.saveData || /2g/.test(conn?.effectiveType ?? "") || mem <= 2;

  const tier: ScreenProfile["tier"] = w < 360 ? "xs" : w < 480 ? "sm" : w < 900 ? "md" : "lg";
  const base = tier === "xs" ? 300 : tier === "sm" ? 360 : tier === "md" ? 480 : 640;
  const imgPx = Math.round(Math.min(base * (slow ? 1 : dpr), 1080));

  return {
    tier,
    imgPx,
    // kichik yoki sust qurilmada animatsiya sekinroq — kadr yo'qotmaydi
    fxScale: slow ? 1.8 : tier === "xs" ? 1.35 : tier === "lg" ? 0.9 : 1,
    reduced: reducedPref || slow,
    cols: tier === "xs" ? 2 : tier === "sm" ? 2 : tier === "md" ? 3 : 4,
    width: w,
  };
}

export function useScreenProfile(): ScreenProfile {
  const [p, setP] = useState<ScreenProfile>(measure);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = () => {
      clearTimeout(t);
      t = setTimeout(() => setP(measure()), 150);
    };
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);
  return p;
}

/** Rasm/animatsiya konteyneriga beriladigan style — CSS o'zgaruvchilari orqali */
export function fxStyle(p: ScreenProfile): React.CSSProperties {
  return {
    // lfx-* va fx-* animatsiyalari shu o'zgaruvchini o'qiydi
    ["--lfx-scale" as string]: String(p.fxScale),
    ...(p.reduced ? { animationPlayState: "paused" as const } : null),
  };
}

/** <img> uchun mos atributlar — kerakli o'lchamdan kattasini yuklamaydi */
export function imgProps(p: ScreenProfile, eager = false) {
  return {
    loading: (eager ? "eager" : "lazy") as "eager" | "lazy",
    decoding: "async" as const,
    width: p.imgPx,
    height: p.imgPx,
    sizes: `${Math.round(p.imgPx / (typeof window === "undefined" ? 1 : Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5))))}px`,
  };
}
