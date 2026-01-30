/**
 * Scenario Schema
 *
 * Zod validation schemas for scenario YAML parsing.
 */

import { z } from 'zod';

/** Valid scenario types */
export const scenarioTypeSchema = z.enum([
  'task-completion',
  'information-retrieval',
  'conversation-flow',
]);

/** Valid difficulty levels */
export const scenarioDifficultySchema = z.enum(['easy', 'medium', 'hard']);

/** Schema for a single scenario entry */
export const scenarioYamlEntrySchema = z.object({
  id: z
    .string()
    .min(1, 'id is required')
    .regex(/^[a-z0-9-]+$/, 'id must be lowercase alphanumeric with hyphens only'),
  name: z.string().min(1, 'name is required').max(255, 'name must be 255 characters or less'),
  type: scenarioTypeSchema,
  prompt: z.string().min(1, 'prompt is required'),
  expected_outcome: z.string().min(1, 'expected_outcome is required'),
  prompt_audio_url: z.string().url('prompt_audio_url must be a valid URL').optional(),
  tags: z.array(z.string()).optional().default([]),
  language: z
    .string()
    .min(2, 'language must be at least 2 characters')
    .max(10, 'language must be 10 characters or less')
    .optional()
    .default('en'),
  difficulty: scenarioDifficultySchema.optional().default('medium'),
});

/** Schema for a YAML document with multiple scenarios */
export const scenarioYamlDocumentSchema = z.object({
  version: z.string().optional(),
  scenarios: z
    .array(scenarioYamlEntrySchema)
    .min(1, 'At least one scenario is required'),
});

/** Schema for a single scenario (for single-scenario imports) */
export const singleScenarioSchema = scenarioYamlEntrySchema;

/** Inferred types from schemas */
export type ScenarioYamlEntryParsed = z.infer<typeof scenarioYamlEntrySchema>;
export type ScenarioYamlDocumentParsed = z.infer<typeof scenarioYamlDocumentSchema>;
