export const DEFAULT_DAILY_HOUR = 20;
export const DEFAULT_DAILY_TEXT = "{ism}, sizni o'yinlarimizda kutyapmiz! Bugungi dam olish vaqtingizni biz bilan o'tkazing. O'zingizga qulay paytda tashrif buyuring va me'yorni unutmang.||{ism}, xush kelibsiz! Sevimli o'yinlaringiz sizni kutmoqda. Kayfiyatingizga mos o'yinni tanlang — o'yin faqat ko'ngilochar mashg'ulot bo'lib qolsin.";

export function tashkentClock(now = new Date()) {
  const local = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return { date: local.toISOString().slice(0, 10), hour: local.getUTCHours() };
}
export function parseDailyHour(value: string | undefined | null): number | null {
  if (!value || !/^\d{1,2}$/.test(value.trim())) return null;
  const hour = Number(value);
  return hour >= 0 && hour <= 23 ? hour : null;
}
export function dailyDue(enabled: boolean, hour: number, last: string | null, now = new Date()) {
  const clock = tashkentClock(now);
  return enabled && clock.hour >= hour && last !== clock.date;
}
export function dailyVariant(text: string, date: string) {
  const variants = text.split("||").map(v => v.trim()).filter(Boolean);
  const day = Math.floor(Date.parse(date + "T00:00:00Z") / 86400000);
  return variants[day % variants.length] ?? DEFAULT_DAILY_TEXT.split("||")[0] ?? "";
}
export function personalizeDaily(text: string, name: string) {
  return text.replaceAll("{ism}", name);
}
export interface DailyRecipient { telegramId: string; firstName: string }
export async function deliverDaily(recipients: DailyRecipient[], ports: {
  claim: (id: string) => Promise<boolean>;
  send: (recipient: DailyRecipient) => Promise<boolean>;
  release: (id: string) => Promise<void>;
  pause: () => Promise<void>;
}) {
  let sent = 0, failed = 0, skipped = 0;
  for (const recipient of recipients) {
    if (!await ports.claim(recipient.telegramId)) { skipped++; continue; }
    try {
      if (await ports.send(recipient)) sent++;
      else { failed++; await ports.release(recipient.telegramId); }
    } catch (err) {
      await ports.release(recipient.telegramId);
      throw err;
    }
    await ports.pause();
  }
  return { sent, failed, skipped, total: recipients.length };
}
