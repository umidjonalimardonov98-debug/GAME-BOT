import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { playersTable } from "./players";

/** Sport tikishlari (OpticOdds ma'lumotlari asosida) */
export const sportsBetsTable = pgTable("sports_bets", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id),
  telegramId: text("telegram_id").notNull(),
  /** "single" yoki "parlay" (ekspress) */
  betType: text("bet_type").notNull().default("single"),
  stake: integer("stake").notNull(),
  /** umumiy koeffitsient × 100 (masalan 1.85 → 185) */
  totalOdds: integer("total_odds").notNull(),
  potentialWin: integer("potential_win").notNull(),
  /** pending | won | lost | refunded */
  status: text("status").notNull().default("pending"),
  payout: integer("payout").notNull().default(0),
  /** [{ fixtureId, fixtureLabel, league, startDate, market, selection, price, status }] */
  selections: jsonb("selections").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  settledAt: timestamp("settled_at"),
});

export type SportsBet = typeof sportsBetsTable.$inferSelect;

export type SportsSelection = {
  fixtureId: string;
  fixtureLabel: string;
  league: string;
  startDate: string;
  market: string;
  selection: string;
  price: number;
  status?: string;
};
