import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

/** Ommaviy chat xabarlari — 10 soat saqlanadi, keyin avtomatik o'chadi */
export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  name: text("name").notNull(),
  username: text("username"),
  text: text("text").notNull(),
  kind: text("kind").notNull().default("text"),
  media: text("media"),
  replyTo: text("reply_to"),
  admin: boolean("admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
