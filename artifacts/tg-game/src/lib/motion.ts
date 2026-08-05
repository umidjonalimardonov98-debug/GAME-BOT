/**
 * Yagona animatsiya tezligi — barcha o'yinlar bir xil ritmda ishlaydi.
 * Har bir o'yin shu qiymatlardan foydalanadi (qimirlash, ochilish, banner).
 */
export const MOTION = {
  /** tugma bosilishi, kichik holat almashuvi */
  press: 160,
  /** oddiy o'tish (rang, chegara, hover) */
  base: 220,
  /** karta/katak ochilishi, natija ko'rinishi */
  reveal: 320,
  /** katta aylanish: baraban, ruleta, g'ildirak */
  spin: 1600,
  /** ketma-ket elementlar orasidagi kechikish */
  stagger: 110,
  /** natija banneri paydo bo'lishi */
  banner: 300,
  /** raund tugagach natija ko'rsatilgunga qadar pauza */
  settle: 260,
  ease: "cubic-bezier(.2,.8,.25,1)",
  easeSpin: "cubic-bezier(0.16,0.76,0.06,1)",
} as const;

export const ms = (n: number) => `${n}ms`;
/** transition qatorini yagona ritmda yasash */
export const tr = (prop = "transform", d: number = MOTION.base, ease: string = MOTION.ease) =>
  `${prop} ${d}ms ${ease}`;
/** aylanish uchun transition (barcha o'yinlarda bir xil) */
export const trSpin = (prop = "transform", extra = 0) =>
  `${prop} ${MOTION.spin + extra}ms ${MOTION.easeSpin}`;
