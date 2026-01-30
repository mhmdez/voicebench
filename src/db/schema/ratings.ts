/**
 * Rating Schema
 *
 * Drizzle schema definition for Elo ratings per provider per category.
 */

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { providers } from './providers';

/** Default Elo rating for new entries */
export const DEFAULT_ELO = 1500;

export const ratings = sqliteTable(
  'ratings',
  {
    /** Unique identifier */
    id: integer('id').primaryKey({ autoIncrement: true }),

    /** Foreign key to provider */
    providerId: integer('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),

    /** Rating category */
    category: text('category', {
      enum: ['general', 'customer-support', 'information-retrieval', 'creative', 'multilingual'],
    }).notNull(),

    /** Current Elo rating */
    elo: integer('elo').notNull().default(DEFAULT_ELO),

    /** Total matches played */
    matchCount: integer('match_count').notNull().default(0),

    /** Number of wins */
    winCount: integer('win_count').notNull().default(0),

    /** Number of ties */
    tieCount: integer('tie_count').notNull().default(0),

    /** Last update timestamp */
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    /** Index on providerId for efficient lookups */
    index('ratings_provider_id_idx').on(table.providerId),
    /** Composite index for category lookups per provider */
    index('ratings_provider_category_idx').on(table.providerId, table.category),
  ]
);

/** Type inference helpers */
export type RatingRow = typeof ratings.$inferSelect;
export type NewRatingRow = typeof ratings.$inferInsert;
