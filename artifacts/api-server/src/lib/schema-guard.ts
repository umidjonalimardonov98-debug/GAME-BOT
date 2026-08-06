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

  // Sport tikishlari (OpticOdds)
  await run(sql`
    CREATE TABLE IF NOT EXISTS sports_bets (
      id serial PRIMARY KEY,
      player_id integer NOT NULL REFERENCES players(id),
      telegram_id text NOT NULL,
      bet_type text NOT NULL DEFAULT 'single',
      stake integer NOT NULL,
      total_odds integer NOT NULL,
      potential_win integer NOT NULL,
      status text NOT NULL DEFAULT 'pending',
      payout integer NOT NULL DEFAULT 0,
      selections jsonb NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      settled_at timestamp
    )
  `);
  await run(sql`CREATE INDEX IF NOT EXISTS sports_bets_tg_idx ON sports_bets (telegram_id)`);
  await run(sql`CREATE INDEX IF NOT EXISTS sports_bets_status_idx ON sports_bets (status)`);

  // O'yin sozlamalari: yangi standart yutish foizi 30%
  await run(sql`ALTER TABLE game_settings ALTER COLUMN win_chance SET DEFAULT 30`);
}
