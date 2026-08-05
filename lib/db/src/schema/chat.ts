import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

/** Ommaviy chat xabarlari — 1 soat saqlanadi, keyin avtomatik o'chadi */
export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  name: text("name").notNull(),
  username: text("username"),
  text: text("text").notNull(),
  admin: boolean("admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
