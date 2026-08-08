/**
 * Qo'shimcha ustun/jadvallarni xavfsiz yaratish (self-migration).
 * push-force ishlamasa ham bot yangi funksiyalar bilan ishlashi uchun.
 *
 * MUHIM: har bir yangi ustun/jadval shu yerga qo'shilishi kerak — aks holda
 * Railway'da migratsiya o'tmasa admin menyular "ishlamayapti" bo'lib qoladi.
 */
export async function ensureExtraSchema(
  db: { execute: (q: any) => Promise<unknown> },
  sql: any,
) {
  const failed: string[] = [];
  const run = async (label: string, q: any) => {
    try {
      await db.execute(q);
    } catch (err: any) {
      failed.push(`${label}: ${String(err?.message ?? err).slice(0, 160)}`);
    }
  };

  /* ── players ─────────────────────────────────────────────────────────── */
  await run("players.wager", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS wager_requirement integer NOT NULL DEFAULT 0`);
  await run("players.wagered", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS total_wagered integer NOT NULL DEFAULT 0`);
  await run("players.deposited", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS total_deposited integer NOT NULL DEFAULT 0`);
  await run("players.withdrawn", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS total_withdrawn integer NOT NULL DEFAULT 0`);
  await run("players.chanver", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS channel_verified boolean NOT NULL DEFAULT false`);
  await run("players.banned", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false`);
  await run("players.lastspin", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS last_spin_at timestamp`);
  await run("players.daily", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS last_daily_bonus timestamp`);
  await run("players.streak", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS daily_bonus_streak integer NOT NULL DEFAULT 0`);
  await run("players.refby", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS referred_by text`);
  await run("players.refcnt", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0`);
  await run("players.menumsg", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS last_menu_msg_id integer`);
  await run("players.photo", sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS photo_url text`);

  /* ── withdraw/deposit requests ───────────────────────────────────────── */
  await run("wd.card_holder", sql`ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS card_holder text NOT NULL DEFAULT '—'`);
  await run("wd.telegram_id", sql`ALTER TABLE withdraw_requests ADD COLUMN IF NOT EXISTS telegram_id text NOT NULL DEFAULT ''`);
  await run("dep.telegram_id", sql`ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS telegram_id text NOT NULL DEFAULT ''`);
  await run("dep.file_id", sql`ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS telegram_file_id text`);

  /* ── bot adminlari (rol tizimi) ──────────────────────────────────────── */
  await run("bot_admins", sql`
    CREATE TABLE IF NOT EXISTS bot_admins (
      id serial PRIMARY KEY,
      telegram_id text NOT NULL UNIQUE,
      role text NOT NULL DEFAULT 'support',
      added_by text,
      active boolean NOT NULL DEFAULT true,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await run("bot_admins.role", sql`ALTER TABLE bot_admins ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'support'`);
  await run("bot_admins.added_by", sql`ALTER TABLE bot_admins ADD COLUMN IF NOT EXISTS added_by text`);
  await run("bot_admins.active", sql`ALTER TABLE bot_admins ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true`);

  /* ── o'yin sozlamalari ──────────────────────────────────────────────── */
  await run("game_settings", sql`
    CREATE TABLE IF NOT EXISTS game_settings (
      id serial PRIMARY KEY,
      game text NOT NULL UNIQUE,
      enabled boolean NOT NULL DEFAULT true,
      win_chance integer NOT NULL DEFAULT 30,
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await run("gs.refund", sql`ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS refund_chance integer NOT NULL DEFAULT 6`);
  await run("gs.difficulty", sql`ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'o''rta'`);
  await run("gs.multiplier", sql`ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS multiplier integer NOT NULL DEFAULT 100`);
  await run("gs.max_win", sql`ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS max_win integer`);
  await run("gs.bg", sql`ALTER TABLE game_settings ADD COLUMN IF NOT EXISTS background_url text`);
  await run("gs.win_default", sql`ALTER TABLE game_settings ALTER COLUMN win_chance SET DEFAULT 30`);

  /* ── ilova sozlamalari (tema, live, referal narxi...) ────────────────── */
  await run("app_settings", sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);

  /* ── promokodlar ─────────────────────────────────────────────────────── */
  await run("promo.assigned", sql`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS assigned_to text`);
  await run("promo.created_by", sql`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS created_by text`);
  await run("promo.note", sql`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS note text`);
  await run("promo_uses", sql`
    CREATE TABLE IF NOT EXISTS promo_uses (
      id serial PRIMARY KEY,
      code_id integer NOT NULL,
      telegram_id text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);

  /* ── ommaviy chat ────────────────────────────────────────────────────── */
  await run("chat_messages", sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id serial PRIMARY KEY,
      telegram_id text NOT NULL,
      name text NOT NULL,
      username text,
      text text NOT NULL,
      admin boolean NOT NULL DEFAULT false,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await run("chat.idx", sql`CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (created_at)`);
  await run("chat.kind", sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text'`);
  await run("chat.media", sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS media text`);
  await run("chat.reply_to", sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to text`);

  /* ── tranzaksiyalar ──────────────────────────────────────────────────── */
  await run("tx.game", sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS game text`);

  return failed;
}
