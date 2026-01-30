import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { prompts, categoryValues } from "./prompts";

/**
 * Match status enum values
 */
export const matchStatusValues = ["pending", "completed", "expired"] as const;

/**
 * Matches table - stores head-to-head comparisons between TTS providers
 */
export const matches = sqliteTable("matches", {
  id: text("id").primaryKey(),
  promptId: text("prompt_id")
    .notNull()
    .references(() => prompts.id),
  category: text("category", { enum: categoryValues }).notNull(),
  providerAId: text("provider_a_id").notNull(),
  providerBId: text("provider_b_id").notNull(),
  responseAUrl: text("response_a_url"),
  responseBUrl: text("response_b_url"),
  responseALatency: real("response_a_latency"),
  responseBLatency: real("response_b_latency"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  votedAt: integer("voted_at", { mode: "timestamp" }),
  status: text("status", { enum: matchStatusValues })
    .notNull()
    .default("pending"),
});
