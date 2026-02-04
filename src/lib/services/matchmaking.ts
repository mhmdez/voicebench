/**
 * Matchmaking Service
 *
 * Provider selection logic for arena matches.
 * Implements weighted random selection favoring providers with fewer matches.
 */

import { eq, and } from 'drizzle-orm';
import { db, providers, ratings } from '@/db';
import type { Provider } from '@/types/provider';
import type { Category } from '@/types/prompt';

/**
 * Provider with match count for weighted selection
 */
interface ProviderWithMatchCount {
  provider: Provider;
  matchCount: number;
}

/**
 * Result of selecting two providers for a match
 */
export interface SelectedProviders {
  providerA: Provider;
  providerB: Provider;
}

/**
 * Convert database row to Provider type
 */
function rowToProvider(row: typeof providers.$inferSelect): Provider {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Provider['type'], // supports openai, gemini, retell, elevenlabs, custom
    config: (row.config || {}) as Provider['config'],
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get all active providers with their match count for a category
 */
async function getActiveProvidersWithMatchCount(
  category: Category
): Promise<ProviderWithMatchCount[]> {
  const rows = await db
    .select({
      provider: providers,
      matchCount: ratings.matchCount,
    })
    .from(providers)
    .leftJoin(
      ratings,
      and(
        eq(providers.id, ratings.providerId),
        eq(ratings.category, category)
      )
    )
    .where(eq(providers.isActive, true));

  return rows.map((row) => ({
    provider: rowToProvider(row.provider),
    matchCount: row.matchCount ?? 0,
  }));
}

/**
 * Weighted random selection - favors providers with fewer matches
 *
 * Weight formula: 1 / (matchCount + 1)^0.5
 * This gives newer providers more chances while still including experienced ones
 */
function weightedRandomSelect(
  providers: ProviderWithMatchCount[],
  excludeIds: Set<number> = new Set()
): ProviderWithMatchCount | null {
  // Filter out excluded providers
  const available = providers.filter(
    (p) => !excludeIds.has(p.provider.id)
  );

  if (available.length === 0) {
    return null;
  }

  // Calculate weights (inverse square root of match count + 1)
  const weights = available.map((p) => 1 / Math.sqrt(p.matchCount + 1));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  // Weighted random selection
  let random = Math.random() * totalWeight;
  for (let i = 0; i < available.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return available[i];
    }
  }

  // Fallback (should not happen, but for safety)
  return available[available.length - 1];
}

/**
 * Select two different providers for a match
 *
 * Uses weighted random selection to favor providers with fewer matches,
 * ensuring a more balanced distribution of matchups across providers.
 *
 * @param category - The category for the match (affects match count weighting)
 * @returns Two different providers or null if not enough providers available
 */
export async function selectProviders(
  category: Category,
  excludedIds: number[] = []
): Promise<SelectedProviders | null> {
  const providersWithCount = await getActiveProvidersWithMatchCount(category);
  const excludedSet = new Set(excludedIds);

  // Need at least 2 active providers
  if (providersWithCount.filter((p) => !excludedSet.has(p.provider.id)).length < 2) {
    return null;
  }

  // Select first provider
  const first = weightedRandomSelect(providersWithCount, excludedSet);
  if (!first) {
    return null;
  }

  // Select second provider (excluding the first)
  excludedSet.add(first.provider.id);
  const second = weightedRandomSelect(providersWithCount, excludedSet);
  if (!second) {
    return null;
  }

  return {
    providerA: first.provider,
    providerB: second.provider,
  };
}

/**
 * Select a single provider excluding a list of providers
 */
export async function selectProviderExcluding(
  category: Category,
  excludedIds: number[]
): Promise<Provider | null> {
  const providersWithCount = await getActiveProvidersWithMatchCount(category);
  const selection = weightedRandomSelect(
    providersWithCount,
    new Set(excludedIds)
  );

  return selection?.provider ?? null;
}

/**
 * Get the count of active providers
 */
export async function getActiveProviderCount(): Promise<number> {
  const result = await db
    .select()
    .from(providers)
    .where(eq(providers.isActive, true));

  return result.length;
}

/**
 * Get all active providers (used for testing/debugging)
 */
export async function getActiveProviders(): Promise<Provider[]> {
  const rows = await db
    .select()
    .from(providers)
    .where(eq(providers.isActive, true));

  return rows.map(rowToProvider);
}
