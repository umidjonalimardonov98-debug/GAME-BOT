import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

/**
 * Foydalanuvchi telefon raqamlari.
 * MUHIM: bu jadval sxemada bo'lishi shart — aks holda `drizzle-kit push --force`
 * uni har deployda o'chirib yuboradi (raqamlar yo'qoladi).
 */
export const playerPhonesTable = pgTable("player_phones", {
  telegramId: text("telegram_id").primaryKey(),
  phone: text("phone").notNull(),
  firstName: text("first_name"),
  username: text("username"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** O'chirilgan chat xabarlari arxivi */
export const chatMessagesArchiveTable = pgTable("chat_messages_archive", {
  id: integer("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  name: text("name").notNull(),
  username: text("username"),
  text: text("text").notNull(),
  kind: text("kind"),
  media: text("media"),
  replyTo: text("reply_to"),
  admin: boolean("admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
  archivedAt: timestamp("archived_at").notNull().defaultNow(),
});
