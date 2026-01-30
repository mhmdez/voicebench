/**
 * Provider Adapter Types
 *
 * Shared types for provider adapters in the VoiceBench system.
 */

import type { ProviderType, ProviderConfig } from '@/types/provider';

/**
 * Audio prompt sent to voice AI providers
 */
export interface AudioPrompt {
  /** Audio buffer containing the input audio */
  audioBuffer: Buffer;
  /** MIME type of the audio (e.g., 'audio/wav', 'audio/mp3') */
  mimeType: string;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Number of audio channels */
  channels?: number;
  /** Optional text transcript of the audio (for providers that support it) */
  transcript?: string;
  /** Optional system prompt or context */
  systemPrompt?: string;
  /** Optional conversation history for multi-turn */
  conversationHistory?: ConversationTurn[];
}

/**
 * A single turn in a conversation
 */
export interface ConversationTurn {
  /** Role: 'user' or 'assistant' */
  role: 'user' | 'assistant';
  /** Text content of the turn */
  content: string;
  /** Optional audio buffer for this turn */
  audioBuffer?: Buffer;
  /** Timestamp of the turn */
  timestamp?: Date;
}

/**
 * Latency measurements for a provider response
 */
export interface LatencyMetrics {
  /** Time to first byte in milliseconds */
  ttfb: number;
  /** Total response time in milliseconds */
  total: number;
  /** Time spent on audio processing (if available) */
  audioProcessing?: number;
  /** Time spent on model inference (if available) */
  inference?: number;
  /** Time spent on text-to-speech (if available) */
  tts?: number;
}

/**
 * Token usage information (for providers that report it)
 */
export interface TokenUsage {
  /** Input/prompt tokens */
  inputTokens?: number;
  /** Output/completion tokens */
  outputTokens?: number;
  /** Total tokens */
  totalTokens?: number;
  /** Audio tokens (for multimodal models) */
  audioTokens?: number;
}

/**
 * Metadata about the provider response
 */
export interface ResponseMetadata {
  /** Model used for the response */
  model?: string;
  /** Voice ID used (if applicable) */
  voiceId?: string;
  /** Request ID from the provider */
  requestId?: string;
  /** Token usage information */
  tokenUsage?: TokenUsage;
  /** Whether the response was streamed */
  streamed?: boolean;
  /** Provider-specific metadata */
  providerSpecific?: Record<string, unknown>;
}

/**
 * Response from a voice AI provider
 */
export interface ProviderResponse {
  /** Audio buffer containing the response audio */
  audioBuffer: Buffer;
  /** MIME type of the response audio */
  mimeType: string;
  /** Sample rate of the response audio in Hz */
  sampleRate: number;
  /** Duration of the audio in milliseconds */
  durationMs: number;
  /** Text transcript of the response (if available) */
  transcript?: string;
  /** Latency measurements */
  latency: LatencyMetrics;
  /** Additional metadata */
  metadata: ResponseMetadata;
}

/**
 * Health check status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Health check result from a provider
 */
export interface ProviderHealthCheck {
  /** Overall health status */
  status: HealthStatus;
  /** Whether the provider is available */
  available: boolean;
  /** Response time for the health check in milliseconds */
  responseTimeMs: number;
  /** Timestamp of the health check */
  timestamp: Date;
  /** Optional error message if unhealthy */
  error?: string;
  /** Optional details about the health check */
  details?: Record<string, unknown>;
}

/**
 * Error thrown by provider adapters
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerType: ProviderType,
    public readonly code: ProviderErrorCode,
    public readonly cause?: Error,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Provider error codes
 */
export type ProviderErrorCode =
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'NETWORK_ERROR'
  | 'PROVIDER_ERROR'
  | 'UNSUPPORTED_FORMAT'
  | 'QUOTA_EXCEEDED'
  | 'MODEL_NOT_FOUND'
  | 'UNKNOWN';

/**
 * Options for adapter initialization
 */
export interface AdapterOptions {
  /** Provider configuration */
  config: ProviderConfig;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
  /** Number of retry attempts */
  retryAttempts?: number;
  /** Delay between retries in milliseconds */
  retryDelayMs?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Re-export ProviderType and ProviderConfig for convenience
 */
export type { ProviderType, ProviderConfig };
