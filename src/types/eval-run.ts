/**
 * Eval Run Types
 *
 * TypeScript interfaces for evaluation runs.
 */

/** Eval run status enum */
export type EvalRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** Eval run entity */
export interface EvalRun {
  /** Unique identifier */
  id: string;
  /** Display name for the run */
  name: string;
  /** IDs of providers being evaluated (JSON array) */
  providerIds: string[];
  /** IDs of scenarios to run (JSON array) */
  scenarioIds: string[];
  /** Current status */
  status: EvalRunStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** When the run started */
  startedAt: Date | null;
  /** When the run completed */
  completedAt: Date | null;
  /** Creation timestamp */
  createdAt: Date;
}

/** Eval run creation input (without auto-generated fields) */
export type NewEvalRun = Omit<EvalRun, 'id' | 'createdAt' | 'startedAt' | 'completedAt' | 'progress'>;
