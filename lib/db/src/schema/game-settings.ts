import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const gameSettingsTable = pgTable("game_settings", {
  id: serial("id").primaryKey(),
  game: text("game").notNull().unique(),
  enabled: boolean("enabled").notNull().default(true),
  winChance: integer("win_chance").notNull().default(31),
  backgroundUrl: text("background_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type GameSetting = typeof gameSettingsTable.$inferSelect;