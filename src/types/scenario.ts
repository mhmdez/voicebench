/**
 * Scenario Types
 *
 * TypeScript interfaces for evaluation scenarios.
 */

/** Scenario type enum */
export type ScenarioType = 'task-completion' | 'information-retrieval' | 'conversation-flow';

/** Scenario difficulty levels */
export type ScenarioDifficulty = 'easy' | 'medium' | 'hard';

/** Scenario entity */
export interface Scenario {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Type of scenario */
  type: ScenarioType;
  /** The prompt text to be spoken/processed */
  prompt: string;
  /** URL to pre-recorded audio of the prompt (optional) */
  promptAudioUrl: string | null;
  /** Expected outcome or response criteria */
  expectedOutcome: string;
  /** Tags for categorization (JSON array) */
  tags: string[];
  /** Language code (e.g., 'en', 'es', 'ar') */
  language: string;
  /** Difficulty level */
  difficulty: ScenarioDifficulty;
  /** Creation timestamp */
  createdAt: Date;
}

/** Scenario creation input (without auto-generated fields) */
export type NewScenario = Omit<Scenario, 'id' | 'createdAt'>;
