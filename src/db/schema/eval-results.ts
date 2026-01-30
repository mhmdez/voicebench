/**
 * Eval Result Schema
 *
 * Drizzle schema definition for individual evaluation results.
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { evalRuns } from './eval-runs';
import { scenarios } from './scenarios';

/**
 * Eval Results table - stores individual test results
 */
export const evalResults = sqliteTable('eval_results', {
  /** Unique identifier */
  id: text('id').primaryKey(),

  /** Reference to the eval run */
  runId: text('run_id')
    .notNull()
    .references(() => evalRuns.id),

  /** Reference to the scenario */
  scenarioId: text('scenario_id')
    .notNull()
    .references(() => scenarios.id),

  /** Reference to the provider (stored as string ID) */
  providerId: text('provider_id').notNull(),

  /** URL to the generated audio response */
  audioUrl: text('audio_url'),

  /** Transcription of the audio response */
  transcript: text('transcript'),

  /** Time to first byte in milliseconds */
  ttfb: real('ttfb'),

  /** Total response time in milliseconds */
  totalResponseTime: real('total_response_time'),

  /** Word Error Rate (0-1) */
  wer: real('wer'),

  /** Accuracy score (0-100) */
  accuracyScore: real('accuracy_score'),

  /** Helpfulness score (0-100) */
  helpfulnessScore: real('helpfulness_score'),

  /** Naturalness score (0-100) */
  naturalnessScore: real('naturalness_score'),

  /** Efficiency score (0-100) */
  efficiencyScore: real('efficiency_score'),

  /** LLM judge reasoning explanation */
  judgeReasoning: text('judge_reasoning'),

  /** Whether the task was completed successfully */
  taskCompleted: integer('task_completed', { mode: 'boolean' }),

  /** Creation timestamp */
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Type inference helpers */
export type EvalResultRow = typeof evalResults.$inferSelect;
export type NewEvalResultRow = typeof evalResults.$inferInsert;
