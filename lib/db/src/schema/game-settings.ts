import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const gameSettingsTable = pgTable("game_settings", {
  id: serial("id").primaryKey(),
  game: text("game").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  winChance: integer("win_chance").notNull().default(40),
  /** Yutqazgan raundlarning necha foizida pul qaytariladi (x1) */
  refundChance: integer("refund_chance").notNull().default(6),
  /** "oson" | "o'rta" | "qiyin" | "juda qiyin" */
  difficulty: text("difficulty").notNull().default("o'rta"),
  /** Koeffitsiyent multiplikatori, bazis punktlarda: 100 = x1.00 */
  multiplier: integer("multiplier").notNull().default(100),
  /** Maksimal yutuq miqdori (so'mda), null = cheklanmagan */
  maxWin: integer("max_win"),
  backgroundUrl: text("background_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GameSetting = typeof gameSettingsTable.$inferSelect;
