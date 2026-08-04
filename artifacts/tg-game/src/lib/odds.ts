/**
 * Uy foydasi (house edge) sozlamalari.
 *
 * LOSE_RATE — o'yinchining yutqazish ehtimoli (0..1).
 * Barcha o'yinlar shu bitta joydan boshqariladi.
 */
export const LOSE_RATE = 0.69;

/** true bo'lsa — bu raund yutqaziladigan qilib belgilanadi */
export function riggedLose(): boolean {
  return Math.random() < LOSE_RATE;
}

/** Massivdan shartga mos tasodifiy element (mos kelmasa — butun massivdan) */
export function randomWhere<T>(items: T[], pred: (x: T) => boolean): T {
  const pool = items.filter(pred);
  const src = pool.length ? pool : items;
  return src[Math.floor(Math.random() * src.length)];
}
