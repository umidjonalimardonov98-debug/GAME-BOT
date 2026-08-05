/**
 * Haqiqiy kazino animatsiyalari uchun fizika/rAF yordamchilari.
 * Barcha o'yinlar shu moduldan foydalanadi — "surat surish" emas, haqiqiy harakat.
 */
import { useEffect, useRef } from "react";

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutElastic = (t: number) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};
export const easeOutBack = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** rAF halqasi — dt (sekund) bilan. cb ref orqali, qayta ishga tushmaydi. */
export function useRaf(cb: (dt: number, time: number) => void, active = true) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!active) return;
    let id = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ref.current(dt, now / 1000);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);
}

/** Canvas'ni retina uchun tayyorlaydi va 2d kontekst qaytaradi */
export function fitCanvas(cv: HTMLCanvasElement, w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; color: string; spin?: number; rot?: number;
}

export function spawnBurst(x: number, y: number, n: number, colors: string[], power = 260): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(power * 0.25, power);
    const max = rand(0.45, 1.15);
    out.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - power * 0.35,
      life: max, max, size: rand(2, 5.5),
      color: colors[Math.floor(Math.random() * colors.length)],
      spin: rand(-8, 8), rot: rand(0, 6.28),
    });
  }
  return out;
}

export function stepParticles(ps: Particle[], dt: number, gravity = 900) {
  for (const p of ps) {
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.99;
    if (p.rot !== undefined && p.spin !== undefined) p.rot += p.spin * dt;
    p.life -= dt;
  }
  return ps.filter((p) => p.life > 0);
}

export function drawParticles(ctx: CanvasRenderingContext2D, ps: Particle[]) {
  for (const p of ps) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Rasm yuklovchi kesh — canvas'da PNG belgilar uchun */
const imgCache = new Map<string, HTMLImageElement>();
export function loadImg(src: string): HTMLImageElement {
  let im = imgCache.get(src);
  if (!im) {
    im = new Image();
    im.src = src;
    imgCache.set(src, im);
  }
  return im;
}
