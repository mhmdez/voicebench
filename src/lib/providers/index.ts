/**
 * Provider Adapters
 *
 * Barrel export for provider adapter system including types, base class,
 * and factory function for instantiating adapters.
 */

import type { ProviderType } from '@/types/provider';
import { ProviderAdapter } from './base-adapter';
import type { AdapterOptions } from './types';
import { ProviderError } from './types';

// Import concrete adapters
import { OpenAIRealtimeAdapter } from './openai-realtime-adapter';

// Re-export types
export * from './types';
export * from './openai-realtime-types';

// Re-export base adapter
export { ProviderAdapter } from './base-adapter';

// Re-export concrete adapters
export { OpenAIRealtimeAdapter } from './openai-realtime-adapter';

/**
 * Type for adapter constructor function
 */
export type AdapterConstructor = new (options: AdapterOptions) => ProviderAdapter;

/**
 * Registry of provider adapters by type
 */
const adapterRegistry = new Map<ProviderType, AdapterConstructor>();

/**
 * Register a provider adapter in the registry.
 *
 * @param type - The provider type to register
 * @param adapter - The adapter constructor class
 *
 * @example
 * ```typescript
 * import { registerAdapter } from '@/lib/providers';
 * import { OpenAIAdapter } from './openai-adapter';
 *
 * registerAdapter('openai', OpenAIAdapter);
 * ```
 */
export function registerAdapter(
  type: ProviderType,
  adapter: AdapterConstructor
): void {
  adapterRegistry.set(type, adapter);
}

/**
 * Check if an adapter is registered for a provider type.
 *
 * @param type - The provider type to check
 * @returns True if an adapter is registered
 */
export function hasAdapter(type: ProviderType): boolean {
  return adapterRegistry.has(type);
}

/**
 * Get all registered provider types.
 *
 * @returns Array of registered provider types
 */
export function getRegisteredTypes(): ProviderType[] {
  return Array.from(adapterRegistry.keys());
}

/**
 * Create a provider adapter instance by type.
 *
 * This is the factory function for instantiating provider adapters.
 * The adapter must be registered first using `registerAdapter`.
 *
 * @param type - The provider type to instantiate
 * @param options - Configuration options for the adapter
 * @returns A new adapter instance
 * @throws {ProviderError} If no adapter is registered for the type
 *
 * @example
 * ```typescript
 * import { createAdapter } from '@/lib/providers';
 *
 * const adapter = createAdapter('openai', {
 *   config: {
 *     apiKey: process.env.OPENAI_API_KEY,
 *     model: 'gpt-4o-realtime',
 *   },
 *   timeoutMs: 30000,
 * });
 *
 * const response = await adapter.generateResponse(prompt);
 * ```
 */
export function createAdapter(
  type: ProviderType,
  options: AdapterOptions
): ProviderAdapter {
  const AdapterClass = adapterRegistry.get(type);

  if (!AdapterClass) {
    throw new ProviderError(
      `No adapter registered for provider type: ${type}. ` +
        `Available types: ${getRegisteredTypes().join(', ') || 'none'}`,
      type,
      'PROVIDER_ERROR',
      undefined,
      false
    );
  }

  return new AdapterClass(options);
}

/**
 * Create multiple adapters from a configuration map.
 *
 * @param configs - Map of provider type to options
 * @returns Map of provider type to adapter instance
 *
 * @example
 * ```typescript
 * const adapters = createAdapters({
 *   openai: { config: { apiKey: '...' } },
 *   gemini: { config: { apiKey: '...' } },
 * });
 * ```
 */
export function createAdapters(
  configs: Partial<Record<ProviderType, AdapterOptions>>
): Map<ProviderType, ProviderAdapter> {
  const adapters = new Map<ProviderType, ProviderAdapter>();

  for (const [type, options] of Object.entries(configs)) {
    if (options && hasAdapter(type as ProviderType)) {
      adapters.set(type as ProviderType, createAdapter(type as ProviderType, options));
    }
  }

  return adapters;
}

/**
 * Unregister a provider adapter (mainly for testing).
 *
 * @param type - The provider type to unregister
 * @returns True if the adapter was removed
 */
export function unregisterAdapter(type: ProviderType): boolean {
  return adapterRegistry.delete(type);
}

/**
 * Clear all registered adapters (mainly for testing).
 */
export function clearAdapterRegistry(): void {
  adapterRegistry.clear();
}

// =============================================================================
// Auto-register built-in adapters
// =============================================================================

registerAdapter('openai', OpenAIRealtimeAdapter);
