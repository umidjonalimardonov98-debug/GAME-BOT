/**
 * Uy foydasi (house edge) sozlamalari.
 *
 * WIN_RATE — o'yinchining yutish ehtimoli (0..1). Barcha o'yinlar shu yerdan boshqariladi.
 */
export const WIN_RATE = 0.44;
export const LOSE_RATE = 1 - WIN_RATE;

/** true bo'lsa — bu raund yutqaziladigan qilib belgilanadi */
export function riggedLose(): boolean {
  return Math.random() >= WIN_RATE;
}

/** true bo'lsa — bu raund yutuqli */
export function riggedWin(): boolean {
  return Math.random() < WIN_RATE;
}

/** Massivdan shartga mos tasodifiy element (mos kelmasa — butun massivdan) */
export function randomWhere<T>(items: T[], pred: (x: T) => boolean): T {
  const pool = items.filter(pred);
  const src = pool.length ? pool : items;
  return src[Math.floor(Math.random() * src.length)];
}

export function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}
