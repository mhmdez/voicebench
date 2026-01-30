/**
 * Eval Run Schema
 *
 * Drizzle schema definition for evaluation runs.
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/** Eval run status enum values */
export const evalRunStatusValues = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;

/**
 * Eval Runs table - stores evaluation run metadata
 */
export const evalRuns = sqliteTable('eval_runs', {
  /** Unique identifier */
  id: text('id').primaryKey(),

  /** Display name for the run */
  name: text('name').notNull(),

  /** IDs of providers being evaluated (JSON array) */
  providerIds: text('provider_ids', { mode: 'json' }).$type<string[]>().notNull(),

  /** IDs of scenarios to run (JSON array) */
  scenarioIds: text('scenario_ids', { mode: 'json' }).$type<string[]>().notNull(),

  /** Current status */
  status: text('status', { enum: evalRunStatusValues }).notNull().default('pending'),

  /** Progress percentage (0-100) */
  progress: real('progress').notNull().default(0),

  /** When the run started */
  startedAt: integer('started_at', { mode: 'timestamp' }),

  /** When the run completed */
  completedAt: integer('completed_at', { mode: 'timestamp' }),

  /** Creation timestamp */
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Type inference helpers */
export type EvalRunRow = typeof evalRuns.$inferSelect;
export type NewEvalRunRow = typeof evalRuns.$inferInsert;
