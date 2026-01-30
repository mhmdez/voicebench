import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { matches } from "./matches";

/**
 * Winner enum values - which side won the comparison
 */
export const winnerValues = ["A", "B", "tie", "skip"] as const;

/**
 * Votes table - stores user votes on matches
 */
export const votes = sqliteTable("votes", {
  id: text("id").primaryKey(),
  matchId: text("match_id")
    .notNull()
    .references(() => matches.id),
  winner: text("winner", { enum: winnerValues }).notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
