import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Bot adminlari va ularning rollari.
 * role: "owner" | "finance" | "support"
 */
export const adminsTable = pgTable("bot_admins", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  role: text("role").notNull().default("support"),
  addedBy: text("added_by"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type BotAdmin = typeof adminsTable.$inferSelect;
