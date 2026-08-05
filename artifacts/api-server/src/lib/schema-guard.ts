/**
 * Qo'shimcha ustun/jadvallarni xavfsiz yaratish (self-migration).
 * push-force ishlamasa ham bot yangi funksiyalar bilan ishlashi uchun.
 */
export async function ensureExtraSchema(
  db: { execute: (q: any) => Promise<unknown> },
  sql: any,
) {
  const run = async (q: any) => {
    try {
      await db.execute(q);
    } catch {
      // e'tiborsiz qoldiramiz
    }
  };

  // Promokodlar: shaxsiy (referal sovrini) uchun ustunlar
  await run(sql`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS assigned_to text`);
  await run(sql`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS created_by text`);
  await run(sql`ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS note text`);

  // Ommaviy chat: xabarlar DB'da saqlanadi (server qayta ishga tushsa ham yo'qolmaydi)
  await run(sql`
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
  await run(sql`CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (created_at)`);

  // O'yin sozlamalari: yangi standart yutish foizi 30%
  await run(sql`ALTER TABLE game_settings ALTER COLUMN win_chance SET DEFAULT 30`);
}
