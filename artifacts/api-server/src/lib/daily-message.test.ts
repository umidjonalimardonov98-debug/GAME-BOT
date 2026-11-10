import { describe, it, expect, vi } from "vitest";
import { dailyDue, tashkentClock, parseDailyHour, deliverDaily } from "./daily-message";
describe("Daily player reminders", () => {
  it("uses UTC+5 and catches up after the configured hour", () => {
    expect(tashkentClock(new Date("2026-11-10T19:30:00Z"))).toEqual({ date: "2026-11-11", hour: 0 });
    expect(dailyDue(true, 20, null, new Date("2026-11-10T14:59:00Z"))).toBe(false);
    expect(dailyDue(true, 20, null, new Date("2026-11-10T15:00:00Z"))).toBe(true);
    expect(dailyDue(true, 20, null, new Date("2026-11-10T16:00:00Z"))).toBe(true);
  });
  it("does not send when disabled or already completed today", () => {
    const now = new Date("2026-11-10T15:00:00Z");
    expect(dailyDue(false, 20, null, now)).toBe(false);
    expect(dailyDue(true, 20, "2026-11-10", now)).toBe(false);
    expect(dailyDue(true, 20, "2026-11-09", now)).toBe(true);
  });
  it("accepts only whole hours from 0 to 23", () => {
    expect(parseDailyHour("0")).toBe(0); expect(parseDailyHour("23")).toBe(23);
    for (const value of ["24", "-1", "1.5", "", "no"]) expect(parseDailyHour(value)).toBeNull();
  });
  it("sends to every recipient, skips persisted claims and releases failures", async () => {
    const send = vi.fn(async (r) => r.telegramId !== "3");
    const release = vi.fn(async () => {});
    const result = await deliverDaily(["1", "2", "3"].map(telegramId => ({ telegramId, firstName: "Test" })), {
      claim: async id => id !== "2", send, release, pause: async () => {},
    });
    expect(result).toEqual({ sent: 1, failed: 1, skipped: 1, total: 3 });
    expect(send.mock.calls.map(call => call[0].telegramId)).toEqual(["1", "3"]);
    expect(release).toHaveBeenCalledWith("3");
  });
});
