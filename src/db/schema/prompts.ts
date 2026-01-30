import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Category enum values for prompts
 */
export const categoryValues = [
  "general",
  "customer-support",
  "information-retrieval",
  "creative",
  "multilingual",
] as const;

/**
 * Prompts table - stores benchmark prompts for the arena
 */
export const prompts = sqliteTable("prompts", {
  id: text("id").primaryKey(),
  category: text("category", { enum: categoryValues }).notNull(),
  text: text("text").notNull(),
  audioUrl: text("audio_url"),
  language: text("language").notNull().default("en"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
