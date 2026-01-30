/**
 * Base Provider Adapter
 *
 * Abstract base class that all voice AI provider adapters must implement.
 */

import type { ProviderType, ProviderConfig } from '@/types/provider';
import type {
  AudioPrompt,
  ProviderResponse,
  ProviderHealthCheck,
  AdapterOptions,
  LatencyMetrics,
} from './types';
import { ProviderError } from './types';

/**
 * Abstract base class for provider adapters.
 *
 * All voice AI provider implementations must extend this class and implement
 * the abstract methods for generating responses and performing health checks.
 *
 * @example
 * ```typescript
 * class OpenAIAdapter extends ProviderAdapter {
 *   constructor(options: AdapterOptions) {
 *     super('openai', options);
 *   }
 *
 *   async generateResponse(prompt: AudioPrompt): Promise<ProviderResponse> {
 *     // Implementation for OpenAI
 *   }
 *
 *   async healthCheck(): Promise<ProviderHealthCheck> {
 *     // Implementation for health check
 *   }
 * }
 * ```
 */
export abstract class ProviderAdapter {
  /** Provider type identifier */
  protected readonly providerType: ProviderType;

  /** Provider configuration */
  protected readonly config: ProviderConfig;

  /** Request timeout in milliseconds */
  protected readonly timeoutMs: number;

  /** Number of retry attempts */
  protected readonly retryAttempts: number;

  /** Delay between retries in milliseconds */
  protected readonly retryDelayMs: number;

  /** Debug mode flag */
  protected readonly debug: boolean;

  /**
   * Create a new provider adapter instance.
   *
   * @param providerType - The type of provider this adapter handles
   * @param options - Configuration options for the adapter
   */
  constructor(providerType: ProviderType, options: AdapterOptions) {
    this.providerType = providerType;
    this.config = options.config;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.retryAttempts = options.retryAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.debug = options.debug ?? false;
  }

  /**
   * Generate a voice response from the provider.
   *
   * This method sends an audio prompt to the provider and returns the
   * generated audio response along with latency metrics and metadata.
   *
   * @param prompt - The audio prompt to send to the provider
   * @returns A promise that resolves to the provider response
   * @throws {ProviderError} If the request fails
   */
  abstract generateResponse(prompt: AudioPrompt): Promise<ProviderResponse>;

  /**
   * Perform a health check on the provider.
   *
   * This method checks if the provider is available and functioning correctly.
   * Implementations should perform a lightweight check that verifies
   * authentication and basic connectivity.
   *
   * @returns A promise that resolves to the health check result
   */
  abstract healthCheck(): Promise<ProviderHealthCheck>;

  /**
   * Get the display name of this provider.
   *
   * @returns The human-readable name of the provider
   */
  abstract getName(): string;

  /**
   * Get the type of this provider.
   *
   * @returns The provider type identifier
   */
  getType(): ProviderType {
    return this.providerType;
  }

  /**
   * Get the current configuration.
   *
   * @returns A copy of the provider configuration
   */
  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  /**
   * Check if the adapter has valid configuration.
   *
   * @returns True if the configuration appears valid
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey || this.config.endpoint);
  }

  /**
   * Log a debug message if debug mode is enabled.
   *
   * @param message - The message to log
   * @param data - Optional additional data to log
   */
  protected log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[${this.providerType}] ${message}`, data ?? '');
    }
  }

  /**
   * Create a ProviderError with the correct provider type.
   *
   * @param message - Error message
   * @param code - Error code
   * @param cause - Original error that caused this error
   * @param retryable - Whether the operation can be retried
   * @returns A new ProviderError instance
   */
  protected createError(
    message: string,
    code: ProviderError['code'],
    cause?: Error,
    retryable = false
  ): ProviderError {
    return new ProviderError(message, this.providerType, code, cause, retryable);
  }

  /**
   * Execute an operation with retry logic.
   *
   * @param operation - The async operation to execute
   * @param operationName - Name of the operation for logging
   * @returns The result of the operation
   * @throws {ProviderError} If all retries fail
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        this.log(`${operationName} attempt ${attempt}/${this.retryAttempts}`);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry non-retryable errors
        if (error instanceof ProviderError && !error.retryable) {
          throw error;
        }

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelayMs * attempt;
          this.log(`${operationName} failed, retrying in ${delay}ms`, {
            error: lastError.message,
          });
          await this.sleep(delay);
        }
      }
    }

    throw this.createError(
      `${operationName} failed after ${this.retryAttempts} attempts: ${lastError?.message}`,
      'PROVIDER_ERROR',
      lastError,
      false
    );
  }

  /**
   * Create a latency metrics object.
   *
   * @param startTime - Start time in milliseconds
   * @param firstByteTime - Time when first byte was received (optional)
   * @returns Latency metrics object
   */
  protected createLatencyMetrics(
    startTime: number,
    firstByteTime?: number
  ): LatencyMetrics {
    const now = Date.now();
    return {
      ttfb: firstByteTime ? firstByteTime - startTime : now - startTime,
      total: now - startTime,
    };
  }

  /**
   * Sleep for a specified duration.
   *
   * @param ms - Duration in milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
