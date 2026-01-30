/**
 * Scenario Schema
 *
 * Drizzle schema definition for evaluation scenarios.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/** Scenario type enum values */
export const scenarioTypeValues = ['task-completion', 'information-retrieval', 'conversation-flow'] as const;

/** Scenario difficulty enum values */
export const scenarioDifficultyValues = ['easy', 'medium', 'hard'] as const;

/**
 * Scenarios table - stores evaluation test cases
 */
export const scenarios = sqliteTable('scenarios', {
  /** Unique identifier */
  id: text('id').primaryKey(),

  /** Display name */
  name: text('name').notNull(),

  /** Scenario type */
  type: text('type', { enum: scenarioTypeValues }).notNull(),

  /** The prompt text to be spoken/processed */
  prompt: text('prompt').notNull(),

  /** URL to pre-recorded audio of the prompt */
  promptAudioUrl: text('prompt_audio_url'),

  /** Expected outcome or response criteria */
  expectedOutcome: text('expected_outcome').notNull(),

  /** Tags for categorization (JSON array) */
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),

  /** Language code (e.g., 'en', 'es', 'ar') */
  language: text('language').notNull().default('en'),

  /** Difficulty level */
  difficulty: text('difficulty', { enum: scenarioDifficultyValues }).notNull().default('medium'),

  /** Creation timestamp */
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

/** Type inference helpers */
export type ScenarioRow = typeof scenarios.$inferSelect;
export type NewScenarioRow = typeof scenarios.$inferInsert;
