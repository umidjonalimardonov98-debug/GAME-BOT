import { sql, eq } from "drizzle-orm";
import { db, adminsTable } from "@workspace/db";
import { logger } from "./logger";

export type AdminRole = "owner" | "finance" | "support";

/** Har bir bo'lim uchun ruxsat kalitlari */
export type Perm =
  | "finance"      // depozit / yechim tasdiqlash, balans qo'shish
  | "stats"        // statistika, foydalanuvchilar ro'yxati
  | "support"      // yordam savollariga javob berish
  | "broadcast"    // xabar yuborish
  | "moderation"   // ban / unban
  | "promo"        // promokodlar
  | "admins";      // yangi admin qo'shish

export const ROLE_PERMS: Record<AdminRole, Perm[]> = {
  owner:   ["finance", "stats", "support", "broadcast", "moderation", "promo", "admins"],
  finance: ["finance", "stats"],
  support: ["support", "stats"],
};

export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "👑 Egasi (to'liq huquq)",
  finance: "💰 Moliya (pul tasdiqlash)",
  support: "🎧 Yordam (savollarga javob)",
};

export function isRole(v: string): v is AdminRole {
  return v === "owner" || v === "finance" || v === "support";
}

/** ENV orqali belgilangan bosh adminlar — ular doim "owner" */
export const ROOT_ADMIN_IDS = new Set(
  [process.env.ADMIN_TELEGRAM_ID, process.env.ADMIN_ID, "8787603995"]
    .map((v) => Number(v || 0))
    .filter((v) => Number.isFinite(v) && v > 0),
);

let cache = new Map<string, AdminRole>();
let cacheAt = 0;
const TTL = 15_000;
let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bot_admins (
        id serial PRIMARY KEY,
        telegram_id text NOT NULL UNIQUE,
        role text NOT NULL DEFAULT 'support',
        added_by text,
        active boolean NOT NULL DEFAULT true,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    tableReady = true;
  } catch (err) {
    logger.error({ err }, "bot_admins jadvalini yaratib bo'lmadi");
  }
}

async function load(force = false) {
  if (!force && Date.now() - cacheAt < TTL) return cache;
  await ensureTable();
  try {
    const rows = await db.select().from(adminsTable);
    const next = new Map<string, AdminRole>();
    for (const r of rows) {
      if (!r.active) continue;
      next.set(String(r.telegramId), isRole(r.role) ? r.role : "support");
    }
    cache = next;
    cacheAt = Date.now();
  } catch (err) {
    logger.error({ err }, "adminlarni o'qishda xato");
  }
  return cache;
}

/** Foydalanuvchi roli (admin bo'lmasa null) */
export async function getRole(id?: number | string | null): Promise<AdminRole | null> {
  if (!id) return null;
  const num = Number(id);
  if (Number.isFinite(num) && ROOT_ADMIN_IDS.has(num)) return "owner";
  const map = await load();
  return map.get(String(id)) ?? null;
}

export async function isAdmin(id?: number | string | null): Promise<boolean> {
  return (await getRole(id)) !== null;
}

export async function can(id: number | string | null | undefined, perm: Perm): Promise<boolean> {
  const role = await getRole(id);
  if (!role) return false;
  return ROLE_PERMS[role].includes(perm);
}

export async function addAdmin(telegramId: string, role: AdminRole, addedBy: string) {
  await ensureTable();
  await db
    .insert(adminsTable)
    .values({ telegramId, role, addedBy, active: true })
    .onConflictDoUpdate({
      target: adminsTable.telegramId,
      set: { role, active: true, addedBy },
    });
  await load(true);
}

export async function removeAdmin(telegramId: string) {
  await ensureTable();
  await db.delete(adminsTable).where(eq(adminsTable.telegramId, telegramId));
  await load(true);
}

export async function listAdmins() {
  await ensureTable();
  try {
    return await db.select().from(adminsTable);
  } catch {
    return [];
  }
}

/** callback_data -> kerakli ruxsat. null = ruxsat talab qilinmaydi (oddiy foydalanuvchi) */
export function permForCallback(data: string): Perm | null {
  if (data.startsWith("dep_ok_") || data.startsWith("dep_no_")) return "finance";
  if (data.startsWith("wd_ok_") || data.startsWith("wd_no_")) return "finance";
  if (data.startsWith("reply_help_")) return "support";
  if (!data.startsWith("admin_") && data !== "broadcast_menu") return null;

  switch (data) {
    case "admin_panel":
      return "stats";
    case "admin_broadcast":
    case "admin_send_user":
    case "broadcast_menu":
      return "broadcast";
    case "admin_addbal":
    case "admin_pending":
    case "admin_withdrawals":
    case "admin_all_withdrawals":
    case "admin_approved_deposits":
    case "admin_approved_withdrawals":
      return "finance";
    case "admin_stat":
    case "admin_users":
      return "stats";
    case "admin_ban":
      return "moderation";
    case "admin_promo":
    case "admin_promo_create":
      return "promo";
    default:
      return "stats";
  }
}

/* ── Sinxron yordamchilar (keshdan o'qiydi) ───────────────────────────── */

/** Keshni fonda yangilab turadi (bot ishga tushganda chaqiriladi) */
export function startAdminCacheRefresh(intervalMs = 15_000) {
  void load(true);
  const timer = setInterval(() => void load(true), intervalMs);
  if (typeof timer.unref === "function") timer.unref();
}

export function getRoleSync(id?: number | string | null): AdminRole | null {
  if (!id) return null;
  const num = Number(id);
  if (Number.isFinite(num) && ROOT_ADMIN_IDS.has(num)) return "owner";
  return cache.get(String(id)) ?? null;
}

export function isAdminSync(id?: number | string | null): boolean {
  return getRoleSync(id) !== null;
}

export function canSync(id: number | string | null | undefined, perm: Perm): boolean {
  const role = getRoleSync(id);
  return !!role && ROLE_PERMS[role].includes(perm);
}
