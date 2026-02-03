/**
 * Provider Types
 *
 * TypeScript interfaces for voice/AI providers in the benchmark system.
 */

/** Supported provider types */
export type ProviderType = 'openai' | 'gemini' | 'elevenlabs' | 'retell' | 'custom';

/** Provider-specific configuration */
export interface ProviderConfig {
  /** API key or authentication token */
  apiKey?: string;
  /** API endpoint URL (for custom providers) */
  endpoint?: string;
  /** Model identifier */
  model?: string;
  /** Voice ID (for TTS providers) */
  voiceId?: string;
  /** Additional provider-specific settings */
  [key: string]: unknown;
}

/** Provider entity */
export interface Provider {
  /** Unique identifier */
  id: number;
  /** Display name */
  name: string;
  /** Provider type */
  type: ProviderType;
  /** Provider configuration (JSON) */
  config: ProviderConfig;
  /** Whether the provider is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

/** Provider creation input (without auto-generated fields) */
export type NewProvider = Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>;
