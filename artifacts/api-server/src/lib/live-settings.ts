import { eq, inArray } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";

/**
 * LIVE (PVP) sozlamalari — admin panelidan boshqariladi, app_settings jadvalida saqlanadi.
 * Qiymatlar 5 soniya kesh qilinadi: har SSE tick bazaga bormaydi.
 */

export const LIVE_KEYS = [
  "live_enabled",
  "live_timer_ms",
  "live_rules",
  "live_banner_title",
  "live_banner_sub",
] as const;

export type LiveKey = (typeof LIVE_KEYS)[number];

export type LiveSettings = {
  enabled: boolean;
  timerMs: number;
  rules: string;
  bannerTitle: string;
  bannerSub: string;
};

export const RULE_PRESETS: { id: string; label: string; text: string }[] = [
  {
    id: "classic",
    label: "Klassik",
    text: "Ikki o'yinchi teng pul tikadi. Har raundda harakat serverda hisoblanadi. G'olib bankning 92%ini oladi, durangda pul qaytariladi.",
  },
  {
    id: "fast",
    label: "Tezkor",
    text: "Tezkor rejim: raund vaqti qisqa. Vaqt tugasa harakat avtomatik yuboriladi. Ko'p ochko yiqqan o'yinchi bankni oladi.",
  },
  {
    id: "fair",
    label: "Halol o'yin",
    text: "Barcha tasodif serverda generatsiya qilinadi — hech kim natijani o'zgartira olmaydi. Taslim bo'lsangiz bank raqibga o'tadi.",
  },
];

const DEFAULTS: LiveSettings = {
  enabled: true,
  timerMs: 0, // 0 = har o'yinning o'z taymeri
  rules: RULE_PRESETS[0]!.text,
  bannerTitle: "ODAM vs ODAM",
  bannerSub: "Tezkor matchmaking · o'yin ichida chat · g'olib bankni oladi",
};

let cache: { at: number; value: LiveSettings } = { at: 0, value: DEFAULTS };
const TTL = 5_000;

export async function getLiveSettings(): Promise<LiveSettings> {
  if (Date.now() - cache.at < TTL) return cache.value;
  let value = DEFAULTS;
  try {
    const rows = await db
      .select()
      .from(appSettingsTable)
      .where(inArray(appSettingsTable.key, [...LIVE_KEYS]));
    const map = new Map(rows.map((r) => [r.key, r.value]));
    value = {
      enabled: (map.get("live_enabled") ?? "1") !== "0",
      timerMs: Math.max(0, Number(map.get("live_timer_ms") ?? 0) || 0),
      rules: map.get("live_rules") || DEFAULTS.rules,
      bannerTitle: map.get("live_banner_title") || DEFAULTS.bannerTitle,
      bannerSub: map.get("live_banner_sub") || DEFAULTS.bannerSub,
    };
  } catch {
    // jadval hali yaratilmagan bo'lishi mumkin — standart qiymatlar
  }
  cache = { at: Date.now(), value };
  return value;
}

/** Keshni bo'shatish — admin qiymat o'zgartirganda */
export function invalidateLiveSettings() {
  cache = { at: 0, value: cache.value };
}

export async function setLiveSetting(key: LiveKey, value: string) {
  await db
    .insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
  invalidateLiveSettings();
}

export async function getLiveSetting(key: LiveKey): Promise<string | null> {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  return row?.value ?? null;
}
