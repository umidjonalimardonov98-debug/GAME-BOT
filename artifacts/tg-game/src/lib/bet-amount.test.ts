import { describe, expect, it } from "vitest";
import { digitsOnly, effectiveBet, formatAmount, MAX_BET, normalizeBetInput } from "./bet-amount";

describe("effectiveBet", () => {
  it("20 so'm tikib bo'lmaydi (minimal 2000)", () => {
    expect(effectiveBet("20", 100_000).playable).toBe(false);
  });
  it("1 000 000 kiritilsa 500 000 dan oshmaydi", () => {
    expect(effectiveBet("1000000", 2_000_000).amount).toBe(MAX_BET);
    expect(effectiveBet("1000000", 2_000_000).playable).toBe(false);
  });
  it("balans yetmasa o'ynab bo'lmaydi", () => {
    expect(effectiveBet("2000", 1000).playable).toBe(false);
  });
  it("2000 balans yetarli bo'lsa o'ynaladi va aynan 2000 olinadi", () => {
    expect(effectiveBet("2000", 50_000)).toEqual({ amount: 2000, playable: true });
  });
  it("maydondan chiqqanda qiymat to'g'rilanadi", () => {
    expect(normalizeBetInput("20", 100_000)).toBe("2000");
    expect(normalizeBetInput("900000", 100_000)).toBe("100000");
  });
});

describe("formatAmount", () => {
  it("2000 to'liq ko'rinadi", () => {
    expect(formatAmount(2000)).toBe("2 000");
    expect(formatAmount(1_250_000)).toBe("1 250 000");
  });
  it("faqat raqamlar qoladi", () => {
    expect(digitsOnly("2 000 UZS")).toBe("2000");
  });
});
