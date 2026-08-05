import { getGameConfig } from "@/lib/game-config";

/**
 * Uy foydasi (house edge) sozlamalari.
 *
 * WIN_RATE — o'yinchining yutish ehtimoli (0..1), standart (fallback) qiymat.
 * Har bir o'yin uchun haqiqiy qiymat admin panelidan (/game/config) olinadi;
 * agar konfiguratsiya hali yuklanmagan yoki o'yin sozlanmagan bo'lsa, shu
 * standart qiymatlar ishlatiladi.
 */
export const WIN_RATE = 0.25;
/** Yutqazgan raundlarning bir qismida pul qaytariladi (x1 koeffitsiyent) */
export const REFUND_RATE = 0.06;
export const LOSE_RATE = 1 - WIN_RATE;

/** Berilgan o'yin kaliti bo'yicha yutish ehtimoli (0..1). Kalit berilmasa — standart. */
export function winRateFor(gameKey?: string): number {
  if (!gameKey) return WIN_RATE;
  const cfg = getGameConfig(gameKey);
  return Math.min(1, Math.max(0, cfg.winChance / 100));
}

/** Berilgan o'yin kaliti bo'yicha pul qaytarish ehtimoli (0..1). Kalit berilmasa — standart. */
export function refundRateFor(gameKey?: string): number {
  if (!gameKey) return REFUND_RATE;
  const cfg = getGameConfig(gameKey);
  return Math.min(1, Math.max(0, cfg.refundChance / 100));
}

/** Berilgan o'yin kaliti bo'yicha koeffitsiyent multiplikatori (1 = x1.00). Kalit berilmasa — 1. */
export function multiplierFor(gameKey?: string): number {
  if (!gameKey) return 1;
  const cfg = getGameConfig(gameKey);
  return cfg.multiplier / 100;
}

/** true bo'lsa — bu raund yutqaziladigan qilib belgilanadi */
export function riggedLose(gameKey?: string): boolean {
  return Math.random() >= winRateFor(gameKey);
}

/** true bo'lsa — bu raund yutuqli */
export function riggedWin(gameKey?: string): boolean {
  return Math.random() < winRateFor(gameKey);
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

export type Outcome = "win" | "refund" | "lose";

/**
 * Bitta raund natijasi (gameKey berilsa — admin sozlagan foizlar bo'yicha):
 *  - "win"    → o'yin koeffitsiyenti bo'yicha yutuq
 *  - "refund" → x1, tikilgan pul qaytariladi
 *  - "lose"   → yutqazish
 */
export function rollOutcome(gameKey?: string): Outcome {
  const winRate = winRateFor(gameKey);
  const refundRate = refundRateFor(gameKey);
  const r = Math.random();
  if (r < winRate) return "win";
  if (r < winRate + refundRate) return "refund";
  return "lose";
}
