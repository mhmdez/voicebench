/**
 * Eval Sessions Schema
 *
 * Tables for live evaluation sessions, turns, and human ratings.
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { providers } from './providers';
import { scenarios } from './scenarios';

/**
 * Eval sessions table - stores each evaluation session
 */
export const evalSessions = sqliteTable('eval_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: integer('provider_id').notNull().references(() => providers.id),
  promptId: text('prompt_id').references(() => scenarios.id),
  /** Freestyle prompt text (if not using a scenario) */
  freestylePrompt: text('freestyle_prompt'),
  startedAt: integer('started_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  notes: text('notes'),
  status: text('status', { enum: ['active', 'completed', 'aborted'] })
    .notNull()
    .default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * Eval turns table - stores each turn in a conversation
 */
export const evalTurns = sqliteTable('eval_turns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull().references(() => evalSessions.id, { onDelete: 'cascade' }),
  turnNumber: integer('turn_number').notNull(),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  audioUrl: text('audio_url'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  firstByteAt: integer('first_byte_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  ttfbMs: integer('ttfb_ms'),
  totalResponseMs: integer('total_response_ms'),
  wordCount: integer('word_count'),
  speechRateWpm: real('speech_rate_wpm'),
  audioDurationMs: integer('audio_duration_ms'),
});

/**
 * Eval turn ratings table - stores human ratings per turn
 */
export const evalTurnRatings = sqliteTable('eval_turn_ratings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  turnId: integer('turn_id').notNull().references(() => evalTurns.id, { onDelete: 'cascade' }),
  metric: text('metric', { enum: ['naturalness', 'prosody', 'accuracy', 'helpfulness', 'efficiency'] }).notNull(),
  /** 1 = good, -1 = bad, 0 = neutral */
  value: integer('value').notNull().default(0),
});

export type EvalSessionRow = typeof evalSessions.$inferSelect;
export type NewEvalSessionRow = typeof evalSessions.$inferInsert;
export type EvalTurnRow = typeof evalTurns.$inferSelect;
export type NewEvalTurnRow = typeof evalTurns.$inferInsert;
export type EvalTurnRatingRow = typeof evalTurnRatings.$inferSelect;
export type NewEvalTurnRatingRow = typeof evalTurnRatings.$inferInsert;
