/**
 * Eval Result Types
 *
 * TypeScript interfaces for evaluation results.
 */

/** Eval result entity */
export interface EvalResult {
  /** Unique identifier */
  id: string;
  /** Reference to the eval run */
  runId: string;
  /** Reference to the scenario */
  scenarioId: string;
  /** Reference to the provider */
  providerId: string;
  /** URL to the generated audio response */
  audioUrl: string | null;
  /** Transcription of the audio response */
  transcript: string | null;
  /** Time to first byte in milliseconds */
  ttfb: number | null;
  /** Total response time in milliseconds */
  totalResponseTime: number | null;
  /** Word Error Rate (0-1) */
  wer: number | null;
  /** Accuracy score (0-100) */
  accuracyScore: number | null;
  /** Helpfulness score (0-100) */
  helpfulnessScore: number | null;
  /** Naturalness score (0-100) */
  naturalnessScore: number | null;
  /** Efficiency score (0-100) */
  efficiencyScore: number | null;
  /** LLM judge reasoning explanation */
  judgeReasoning: string | null;
  /** Whether the task was completed successfully */
  taskCompleted: boolean | null;
  /** Creation timestamp */
  createdAt: Date;
}

/** Eval result creation input (without auto-generated fields) */
export type NewEvalResult = Omit<EvalResult, 'id' | 'createdAt'>;
