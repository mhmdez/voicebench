/**
 * Provider Schema
 *
 * Drizzle schema definition for voice/AI providers.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const providers = sqliteTable('providers', {
  /** Unique identifier */
  id: integer('id').primaryKey({ autoIncrement: true }),

  /** Display name */
  name: text('name').notNull(),

  /** Provider type: 'openai' | 'gemini' | 'elevenlabs' | 'custom' */
  type: text('type', { enum: ['openai', 'gemini', 'elevenlabs', 'custom'] }).notNull(),

  /** Provider configuration (stored as JSON) */
  config: text('config', { mode: 'json' }).notNull().default('{}'),

  /** Whether the provider is active */
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

  /** Creation timestamp */
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),

  /** Last update timestamp */
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/** Type inference helpers */
export type ProviderRow = typeof providers.$inferSelect;
export type NewProviderRow = typeof providers.$inferInsert;
