/** Tikish miqdori qoidalari — barcha o'yinlar uchun yagona. */
export const MIN_BET = 2000;
export const MAX_BET = 500000;

/** Kiritilgan matndan faqat raqamlarni oladi ("2 000" → "2000") */
export function digitsOnly(v: string): string {
  return String(v ?? "").replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
}

/** Haqiqiy tikish: [MIN_BET, min(MAX_BET, balans)] oralig'ida; playable — o'ynash mumkinmi */
export function effectiveBet(input: string | number, balance: number) {
  const raw = Number(typeof input === "string" ? digitsOnly(input) : input);
  const available = Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0;
  const finite = Number.isFinite(raw) && raw > 0;
  const ceiling = Math.max(MIN_BET, Math.min(MAX_BET, available));
  const amount = Math.floor(Math.min(Math.max(finite ? raw : MIN_BET, MIN_BET), ceiling));
  return {
    amount,
    playable: finite && raw >= MIN_BET && raw <= MAX_BET && raw <= available,
  };
}

/** Maydon tashlab ketilganda ko'rsatiladigan to'g'ri qiymat */
export function normalizeBetInput(input: string, balance: number): string {
  return String(effectiveBet(input, balance).amount);
}

/** 2000 → "2 000" (to'liq, qisqartirilmagan) */
export function formatAmount(n: number): string {
  return Math.floor(Math.max(0, n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
