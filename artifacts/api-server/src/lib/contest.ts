import { eq, inArray } from "drizzle-orm";
import { db, appSettingsTable } from "@workspace/db";

/**
 * REFERAL KONKURSI.
 *
 * Muhim qoida: konkurs boshlangan sanadan (contest_start_at) OLDIN taklif
 * qilingan do'stlar hisobga olinmaydi. Ya'ni har bir yangi konkurs — nol'dan.
 * Barcha sozlamalar app_settings jadvalida saqlanadi (qo'shimcha migratsiya kerak emas).
 */

export const CONTEST_KEYS = [
  "contest_active",
  "contest_title",
  "contest_desc",
  "contest_start_at",
  "contest_end_at",
  "contest_prize_1",
  "contest_prize_2",
  "contest_prize_3",
  "contest_paid_at",
] as const;

export type ContestSettings = {
  active: boolean;
  title: string;
  desc: string;
  startAt: string | null; // ISO
  endAt: string | null; // ISO
  prizes: [number, number, number];
  paidAt: string | null;
};

export const DEFAULT_CONTEST: ContestSettings = {
  active: false,
  title: "REFERAL KONKURSI",
  desc:
    "Do'stlaringizni havolangiz orqali taklif qiling! Konkurs boshlangandan keyin qo'shilgan do'stlar hisoblanadi. " +
    "Konkurs tugagach TOP 3 g'olib pul sovrinini oladi.",
  startAt: null,
  endAt: null,
  prizes: [500000, 300000, 150000],
  paidAt: null,
};

export async function getContest(): Promise<ContestSettings> {
  try {
    const rows = await db
      .select()
      .from(appSettingsTable)
      .where(inArray(appSettingsTable.key, [...CONTEST_KEYS]));
    const map = new Map(rows.map((r) => [r.key, r.value] as const));
    const num = (k: string, d: number) => {
      const n = Number(map.get(k));
      return Number.isFinite(n) && n >= 0 ? Math.round(n) : d;
    };
    const endRaw = map.get("contest_end_at") || null;
    const endTs = endRaw ? new Date(endRaw).getTime() : NaN;
    let active = map.get("contest_active") === "1";
    // Tugash vaqti kelgan bo'lsa — konkurs avtomatik yakunlanadi
    if (active && Number.isFinite(endTs) && endTs <= Date.now()) {
      active = false;
      void setContestValue("contest_active", "0").catch(() => {});
    }
    return {
      active,
      title: (map.get("contest_title") || DEFAULT_CONTEST.title).slice(0, 120),
      desc: (map.get("contest_desc") || DEFAULT_CONTEST.desc).slice(0, 900),
      startAt: map.get("contest_start_at") || null,
      endAt: map.get("contest_end_at") || null,
      prizes: [
        num("contest_prize_1", DEFAULT_CONTEST.prizes[0]),
        num("contest_prize_2", DEFAULT_CONTEST.prizes[1]),
        num("contest_prize_3", DEFAULT_CONTEST.prizes[2]),
      ],
      paidAt: map.get("contest_paid_at") || null,
    };
  } catch {
    return DEFAULT_CONTEST;
  }
}

export async function setContestValue(key: (typeof CONTEST_KEYS)[number], value: string): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettingsTable.key, set: { value, updatedAt: new Date() } });
}

export async function clearContestValue(key: (typeof CONTEST_KEYS)[number]): Promise<void> {
  try {
    await db.delete(appSettingsTable).where(eq(appSettingsTable.key, key));
  } catch {
    /* ignore */
  }
}

export type ContestRow = {
  telegramId: string;
  username: string | null;
  name: string;
  photoUrl: string | null;
  count: number;
};

function rowsOf(res: any): any[] {
  if (Array.isArray(res)) return res;
  return res?.rows ?? [];
}

/**
 * Konkurs davomida (start_at dan keyin) qo'shilgan referallar bo'yicha reyting.
 * Faqat bloklanmagan yangi o'yinchilar hisoblanadi.
 */
export async function getContestTop(sql: any, limit = 10): Promise<ContestRow[]> {
  const c = await getContest();
  const start = c.startAt ? new Date(c.startAt) : null;
  if (!start || Number.isNaN(start.getTime())) return [];
  const end = c.endAt ? new Date(c.endAt) : null;
  const endOk = end && !Number.isNaN(end.getTime()) ? end : new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000);

  const res = await db.execute(sql`
    SELECT p.telegram_id, p.username, p.first_name, p.last_name, p.photo_url, c.cnt
    FROM (
      SELECT referred_by AS tg, count(*)::int AS cnt
      FROM players
      WHERE referred_by IS NOT NULL
        AND banned = false
        AND created_at >= ${start.toISOString()}
        AND created_at <= ${endOk.toISOString()}
      GROUP BY referred_by
    ) c
    JOIN players p ON p.telegram_id = c.tg
    ORDER BY c.cnt DESC, p.telegram_id ASC
    LIMIT ${limit}
  `);

  return rowsOf(res).map((r: any) => ({
    telegramId: String(r.telegram_id),
    username: r.username ?? null,
    name:
      [r.first_name, r.last_name].filter(Boolean).join(" ").trim() ||
      (r.username ? `@${r.username}` : "Foydalanuvchi"),
    photoUrl: r.photo_url ?? null,
    count: Number(r.cnt ?? 0),
  }));
}

/** Bitta o'yinchining konkursdagi natijasi va o'rni */
export async function getContestPlayerStat(
  sql: any,
  telegramId: string,
): Promise<{ count: number; rank: number | null }> {
  const c = await getContest();
  const start = c.startAt ? new Date(c.startAt) : null;
  if (!start || Number.isNaN(start.getTime())) return { count: 0, rank: null };
  const end = c.endAt ? new Date(c.endAt) : null;
  const endOk = end && !Number.isNaN(end.getTime()) ? end : new Date(Date.now() + 10 * 365 * 24 * 3600 * 1000);

  const res = await db.execute(sql`
    WITH agg AS (
      SELECT referred_by AS tg, count(*)::int AS cnt
      FROM players
      WHERE referred_by IS NOT NULL
        AND banned = false
        AND created_at >= ${start.toISOString()}
        AND created_at <= ${endOk.toISOString()}
      GROUP BY referred_by
    )
    SELECT cnt, (SELECT count(*)::int + 1 FROM agg a2 WHERE a2.cnt > a1.cnt) AS rnk
    FROM agg a1 WHERE a1.tg = ${telegramId}
  `);
  const row = rowsOf(res)[0];
  if (!row) return { count: 0, rank: null };
  return { count: Number(row.cnt ?? 0), rank: Number(row.rnk ?? 0) || null };
}

/** Bir o'yinchi konkurs davomida chaqirgan do'stlar ro'yxati (admin uchun) */
export async function getContestInvitees(sql: any, telegramId: string, limit = 50) {
  const c = await getContest();
  const start = c.startAt ? new Date(c.startAt) : null;
  if (!start || Number.isNaN(start.getTime())) return [];
  const res = await db.execute(sql`
    SELECT telegram_id, username, first_name, last_name, created_at
    FROM players
    WHERE referred_by = ${telegramId}
      AND banned = false
      AND created_at >= ${start.toISOString()}
    ORDER BY created_at ASC
    LIMIT ${limit}
  `);
  return rowsOf(res).map((r: any) => ({
    telegramId: String(r.telegram_id),
    username: r.username ?? null,
    name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || "Foydalanuvchi",
    joinedAt: r.created_at ? new Date(r.created_at).toISOString() : null,
  }));
}
