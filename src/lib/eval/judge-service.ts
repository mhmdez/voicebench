/**
 * Judge Service
 *
 * LLM-as-judge integration for scoring voice AI responses.
 * Uses GPT-4o by default with structured JSON output.
 */

import OpenAI from 'openai';
import type { ScenarioType } from '@/types/scenario';
import { JUDGE_SYSTEM_PROMPT, buildEvaluationPrompt, JUDGE_RESPONSE_SCHEMA } from './judge-prompts';

/**
 * Judge configuration options
 */
export interface JudgeConfig {
  /** OpenAI API key (defaults to OPENAI_API_KEY env var) */
  apiKey?: string;
  /** Model to use for evaluation (default: gpt-4o) */
  model?: string;
  /** Request timeout in milliseconds (default: 60000) */
  timeoutMs?: number;
  /** Temperature for generation (default: 0 for consistency) */
  temperature?: number;
  /** Maximum retries on failure (default: 3) */
  maxRetries?: number;
}

/**
 * Input for evaluating a response
 */
export interface JudgeInput {
  /** The type of scenario being evaluated */
  scenarioType: ScenarioType;
  /** Name of the scenario */
  scenarioName: string;
  /** The original user prompt/request */
  userPrompt: string;
  /** The expected outcome or criteria */
  expectedOutcome: string;
  /** The AI's actual response (transcript) */
  aiResponse: string;
}

/**
 * Raw scores from the judge (1-10 scale)
 */
export interface JudgeScores {
  /** Accuracy score (1-10) */
  accuracy: number;
  /** Helpfulness score (1-10) */
  helpfulness: number;
  /** Naturalness score (1-10) */
  naturalness: number;
  /** Efficiency score (1-10) */
  efficiency: number;
}

/**
 * Full judge output including scores and reasoning
 */
export interface JudgeOutput {
  /** Scores on all four dimensions (1-10) */
  scores: JudgeScores;
  /** Scores normalized to 0-100 for database storage */
  normalizedScores: {
    accuracy: number;
    helpfulness: number;
    naturalness: number;
    efficiency: number;
  };
  /** Whether the task was completed successfully */
  taskCompleted: boolean;
  /** Judge's reasoning for the scores */
  reasoning: string;
  /** Model used for evaluation */
  model: string;
  /** Time taken for evaluation in milliseconds */
  evaluationTimeMs: number;
}

/**
 * Error thrown when judge evaluation fails
 */
export class JudgeError extends Error {
  constructor(
    message: string,
    public readonly code: JudgeErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'JudgeError';
  }
}

/**
 * Error codes for judge failures
 */
export type JudgeErrorCode =
  | 'API_ERROR'
  | 'INVALID_RESPONSE'
  | 'PARSE_ERROR'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'INVALID_INPUT';

/**
 * Default configuration for the judge
 */
const DEFAULT_CONFIG: Required<Omit<JudgeConfig, 'apiKey'>> = {
  model: 'gpt-4o',
  timeoutMs: 60000,
  temperature: 0,
  maxRetries: 3,
};

/**
 * Validate and normalize a score to ensure it's within bounds
 */
function normalizeScore(score: unknown, field: string): number {
  if (typeof score !== 'number' || isNaN(score)) {
    throw new JudgeError(
      `Invalid ${field} score: expected number, got ${typeof score}`,
      'PARSE_ERROR'
    );
  }
  // Clamp to valid range
  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * Convert 1-10 score to 0-100 for database storage
 */
function scoreToPercentage(score: number): number {
  // 1 -> 0, 10 -> 100
  return Math.round(((score - 1) / 9) * 100);
}

/**
 * Parse and validate the judge's JSON response
 */
function parseJudgeResponse(content: string): {
  accuracy: number;
  helpfulness: number;
  naturalness: number;
  efficiency: number;
  taskCompleted: boolean;
  reasoning: string;
} {
  let parsed: unknown;

  try {
    // Handle potential markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7);
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3);
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3);
    }
    jsonContent = jsonContent.trim();

    parsed = JSON.parse(jsonContent);
  } catch (err) {
    throw new JudgeError(
      `Failed to parse judge response as JSON: ${err instanceof Error ? err.message : 'Unknown error'}`,
      'PARSE_ERROR',
      err
    );
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new JudgeError(
      'Judge response is not a valid object',
      'PARSE_ERROR'
    );
  }

  const response = parsed as Record<string, unknown>;

  // Validate and extract fields
  const accuracy = normalizeScore(response.accuracy, 'accuracy');
  const helpfulness = normalizeScore(response.helpfulness, 'helpfulness');
  const naturalness = normalizeScore(response.naturalness, 'naturalness');
  const efficiency = normalizeScore(response.efficiency, 'efficiency');

  if (typeof response.taskCompleted !== 'boolean') {
    throw new JudgeError(
      `Invalid taskCompleted: expected boolean, got ${typeof response.taskCompleted}`,
      'PARSE_ERROR'
    );
  }

  if (typeof response.reasoning !== 'string') {
    throw new JudgeError(
      `Invalid reasoning: expected string, got ${typeof response.reasoning}`,
      'PARSE_ERROR'
    );
  }

  return {
    accuracy,
    helpfulness,
    naturalness,
    efficiency,
    taskCompleted: response.taskCompleted,
    reasoning: response.reasoning,
  };
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * LLM-as-Judge service for evaluating voice AI responses
 */
export class JudgeService {
  private client: OpenAI;
  private config: Required<Omit<JudgeConfig, 'apiKey'>>;

  constructor(config: JudgeConfig = {}) {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new JudgeError(
        'OpenAI API key is required. Set OPENAI_API_KEY environment variable or pass apiKey in config.',
        'INVALID_INPUT'
      );
    }

    this.client = new OpenAI({
      apiKey,
      timeout: config.timeoutMs ?? DEFAULT_CONFIG.timeoutMs,
    });

    this.config = {
      model: config.model ?? DEFAULT_CONFIG.model,
      timeoutMs: config.timeoutMs ?? DEFAULT_CONFIG.timeoutMs,
      temperature: config.temperature ?? DEFAULT_CONFIG.temperature,
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
    };
  }

  /**
   * Evaluate a voice AI response using the LLM judge
   */
  async evaluate(input: JudgeInput): Promise<JudgeOutput> {
    // Validate input
    if (!input.aiResponse || input.aiResponse.trim().length === 0) {
      throw new JudgeError(
        'AI response is required for evaluation',
        'INVALID_INPUT'
      );
    }

    if (!input.userPrompt || input.userPrompt.trim().length === 0) {
      throw new JudgeError(
        'User prompt is required for evaluation',
        'INVALID_INPUT'
      );
    }

    const evaluationPrompt = buildEvaluationPrompt({
      scenarioType: input.scenarioType,
      scenarioName: input.scenarioName,
      userPrompt: input.userPrompt,
      expectedOutcome: input.expectedOutcome,
      aiResponse: input.aiResponse,
    });

    const startTime = Date.now();
    let lastError: unknown;

    // Retry loop
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.config.model,
          temperature: this.config.temperature,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: JUDGE_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: evaluationPrompt,
            },
          ],
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
          throw new JudgeError(
            'Judge returned empty response',
            'INVALID_RESPONSE'
          );
        }

        const parsed = parseJudgeResponse(content);
        const evaluationTimeMs = Date.now() - startTime;

        return {
          scores: {
            accuracy: parsed.accuracy,
            helpfulness: parsed.helpfulness,
            naturalness: parsed.naturalness,
            efficiency: parsed.efficiency,
          },
          normalizedScores: {
            accuracy: scoreToPercentage(parsed.accuracy),
            helpfulness: scoreToPercentage(parsed.helpfulness),
            naturalness: scoreToPercentage(parsed.naturalness),
            efficiency: scoreToPercentage(parsed.efficiency),
          },
          taskCompleted: parsed.taskCompleted,
          reasoning: parsed.reasoning,
          model: this.config.model,
          evaluationTimeMs,
        };
      } catch (err) {
        lastError = err;

        // Don't retry on certain errors
        if (err instanceof JudgeError && err.code === 'INVALID_INPUT') {
          throw err;
        }

        // Check for rate limiting
        if (
          err instanceof OpenAI.APIError &&
          (err.status === 429 || err.code === 'rate_limit_exceeded')
        ) {
          if (attempt < this.config.maxRetries) {
            // Exponential backoff with jitter
            const backoffMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
            await sleep(backoffMs);
            continue;
          }
          throw new JudgeError(
            'Rate limited by OpenAI API',
            'RATE_LIMITED',
            err
          );
        }

        // Check for timeout
        if (err instanceof OpenAI.APIConnectionError) {
          if (attempt < this.config.maxRetries) {
            await sleep(1000 * attempt);
            continue;
          }
          throw new JudgeError(
            'Request to OpenAI API timed out',
            'TIMEOUT',
            err
          );
        }

        // Generic API error - retry
        if (err instanceof OpenAI.APIError && attempt < this.config.maxRetries) {
          await sleep(1000 * attempt);
          continue;
        }

        // Parse errors should not retry
        if (err instanceof JudgeError && err.code === 'PARSE_ERROR') {
          if (attempt < this.config.maxRetries) {
            await sleep(500);
            continue;
          }
          throw err;
        }

        // Unknown error - wrap and throw
        if (!(err instanceof JudgeError)) {
          throw new JudgeError(
            `OpenAI API error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            'API_ERROR',
            err
          );
        }

        throw err;
      }
    }

    // All retries exhausted
    throw new JudgeError(
      `Judge evaluation failed after ${this.config.maxRetries} attempts`,
      'API_ERROR',
      lastError
    );
  }

  /**
   * Evaluate multiple responses in batch (sequential to avoid rate limits)
   */
  async evaluateBatch(
    inputs: JudgeInput[],
    options: { delayBetweenMs?: number } = {}
  ): Promise<{ input: JudgeInput; result: JudgeOutput | JudgeError }[]> {
    const delayMs = options.delayBetweenMs ?? 500;
    const results: { input: JudgeInput; result: JudgeOutput | JudgeError }[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];

      try {
        const result = await this.evaluate(input);
        results.push({ input, result });
      } catch (err) {
        if (err instanceof JudgeError) {
          results.push({ input, result: err });
        } else {
          results.push({
            input,
            result: new JudgeError(
              `Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`,
              'API_ERROR',
              err
            ),
          });
        }
      }

      // Add delay between requests (except for last one)
      if (i < inputs.length - 1) {
        await sleep(delayMs);
      }
    }

    return results;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<typeof this.config> {
    return { ...this.config };
  }
}

/**
 * Create a judge service with default configuration
 */
export function createJudgeService(config?: JudgeConfig): JudgeService {
  return new JudgeService(config);
}

/**
 * Singleton instance for convenience
 */
let defaultJudge: JudgeService | null = null;

/**
 * Get or create the default judge service instance
 */
export function getDefaultJudge(): JudgeService {
  if (!defaultJudge) {
    defaultJudge = createJudgeService();
  }
  return defaultJudge;
}

/**
 * Reset the default judge instance (useful for testing)
 */
export function resetDefaultJudge(): void {
  defaultJudge = null;
}
