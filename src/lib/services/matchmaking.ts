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
  // Get active providers
  const providerRows = await db
    .select()
    .from(providers)
    .where(eq(providers.isActive, true));

  const result: ProviderWithMatchCount[] = [];

  for (const row of providerRows) {
    // Get match count for this category
    const [rating] = await db
      .select({ matchCount: ratings.matchCount })
      .from(ratings)
      .where(
        and(
          eq(ratings.providerId, row.id),
          eq(ratings.category, category)
        )
      );

    result.push({
      provider: rowToProvider(row),
      matchCount: rating?.matchCount ?? 0,
    });
  }

  return result;
}

/**
 * Weighted random selection - favors providers with fewer matches
 *
 * Weight formula: 1 / (matchCount + 1)^0.5
 * This gives newer providers more chances while still including experienced ones
 */
function weightedRandomSelect(
  providers: ProviderWithMatchCount[],
  exclude?: number
): ProviderWithMatchCount | null {
  // Filter out excluded provider
  const available = exclude
    ? providers.filter((p) => p.provider.id !== exclude)
    : providers;

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
 * Select a single provider excluding a set of IDs.
 */
export async function selectReplacementProvider(
  category: Category,
  excludeIds: number[]
): Promise<Provider | null> {
  const providersWithCount = await getActiveProvidersWithMatchCount(category);
  const available = providersWithCount.filter(
    (entry) => !excludeIds.includes(entry.provider.id)
  );
  const selected = weightedRandomSelect(available);
  return selected?.provider ?? null;
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
  category: Category
): Promise<SelectedProviders | null> {
  const providersWithCount = await getActiveProvidersWithMatchCount(category);

  // Need at least 2 active providers
  if (providersWithCount.length < 2) {
    return null;
  }

  // Select first provider
  const first = weightedRandomSelect(providersWithCount);
  if (!first) {
    return null;
  }

  // Select second provider (excluding the first)
  const second = weightedRandomSelect(providersWithCount, first.provider.id);
  if (!second) {
    return null;
  }

  return {
    providerA: first.provider,
    providerB: second.provider,
  };
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
