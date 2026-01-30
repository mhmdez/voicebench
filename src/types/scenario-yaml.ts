/**
 * Scenario YAML Types
 *
 * TypeScript interfaces for YAML-based scenario import/export.
 */

import type { ScenarioType, ScenarioDifficulty } from './scenario';

/** Single scenario definition in YAML format */
export interface ScenarioYamlEntry {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Type of scenario */
  type: ScenarioType;
  /** The prompt text to be spoken/processed */
  prompt: string;
  /** Expected outcome or response criteria */
  expected_outcome: string;
  /** URL to pre-recorded audio (optional) */
  prompt_audio_url?: string;
  /** Tags for categorization (optional) */
  tags?: string[];
  /** Language code, e.g., 'en', 'es', 'ar' (optional, defaults to 'en') */
  language?: string;
  /** Difficulty level (optional, defaults to 'medium') */
  difficulty?: ScenarioDifficulty;
}

/** Root structure for YAML file with multiple scenarios */
export interface ScenarioYamlDocument {
  /** Version of the schema (for future compatibility) */
  version?: string;
  /** Array of scenarios */
  scenarios: ScenarioYamlEntry[];
}

/** Validation error with line information */
export interface YamlValidationError {
  /** Path to the invalid field (e.g., 'scenarios[0].name') */
  path: string;
  /** Error message */
  message: string;
  /** Line number in the YAML file (if available) */
  line?: number;
  /** Column number (if available) */
  column?: number;
}

/** Result of YAML parsing and validation */
export interface ScenarioParseResult {
  /** Whether parsing and validation succeeded */
  success: boolean;
  /** Parsed scenarios (only if success is true) */
  scenarios?: ScenarioYamlEntry[];
  /** Validation errors (only if success is false) */
  errors?: YamlValidationError[];
}
