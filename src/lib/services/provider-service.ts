/**
 * Provider Service
 *
 * Business logic for provider CRUD operations.
 * Handles database interactions via Drizzle ORM.
 */

import { eq, sql } from 'drizzle-orm';
import { db, providers, ratings, DEFAULT_ELO } from '@/db';
import type { Provider, NewProvider, ProviderConfig, ProviderType } from '@/types/provider';
import type { Rating, RatingCategory } from '@/types/rating';
import { createAdapter } from '@/lib/providers';
import type { ProviderHealthCheck } from '@/lib/providers/types';

/** All rating categories for initializing new providers */
const ALL_CATEGORIES: RatingCategory[] = [
  'general',
  'customer-support',
  'information-retrieval',
  'creative',
  'multilingual',
];

/**
 * Provider with ratings attached
 */
export interface ProviderWithRatings extends Omit<Provider, 'config'> {
  /** Sanitized config (no API keys) */
  config: Omit<ProviderConfig, 'apiKey'>;
  /** Ratings by category */
  ratings: Rating[];
}

/**
 * Strip sensitive data from provider config
 */
function sanitizeConfig(config: ProviderConfig): Omit<ProviderConfig, 'apiKey'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { apiKey, ...safeConfig } = config;
  return safeConfig;
}

/**
 * Convert database row to Provider type
 */
function rowToProvider(row: typeof providers.$inferSelect): Provider {
  return {
    id: row.id,
    name: row.name,
    type: row.type as ProviderType,
    config: (row.config || {}) as ProviderConfig,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get all providers with their ratings
 */
export async function getAllProviders(): Promise<ProviderWithRatings[]> {
  const providerRows = await db.select().from(providers);
  
  const result: ProviderWithRatings[] = [];
  
  for (const row of providerRows) {
    const providerRatings = await db
      .select()
      .from(ratings)
      .where(eq(ratings.providerId, row.id));
    
    const provider = rowToProvider(row);
    
    result.push({
      ...provider,
      config: sanitizeConfig(provider.config),
      ratings: providerRatings.map((r) => ({
        id: r.id,
        providerId: r.providerId,
        category: r.category as RatingCategory,
        elo: r.elo,
        matchCount: r.matchCount,
        winCount: r.winCount,
        tieCount: r.tieCount,
        updatedAt: r.updatedAt,
      })),
    });
  }
  
  return result;
}

/**
 * Get a provider by ID with ratings
 */
export async function getProviderById(id: number): Promise<ProviderWithRatings | null> {
  const [row] = await db.select().from(providers).where(eq(providers.id, id));
  
  if (!row) {
    return null;
  }
  
  const providerRatings = await db
    .select()
    .from(ratings)
    .where(eq(ratings.providerId, id));
  
  const provider = rowToProvider(row);
  
  return {
    ...provider,
    config: sanitizeConfig(provider.config),
    ratings: providerRatings.map((r) => ({
      id: r.id,
      providerId: r.providerId,
      category: r.category as RatingCategory,
      elo: r.elo,
      matchCount: r.matchCount,
      winCount: r.winCount,
      tieCount: r.tieCount,
      updatedAt: r.updatedAt,
    })),
  };
}

/**
 * Get raw provider (with full config including API key) for internal use
 */
export async function getProviderRaw(id: number): Promise<Provider | null> {
  const [row] = await db.select().from(providers).where(eq(providers.id, id));
  
  if (!row) {
    return null;
  }
  
  return rowToProvider(row);
}

/**
 * Create a new provider with initial ratings
 */
export async function createProvider(data: NewProvider): Promise<ProviderWithRatings> {
  // Insert the provider
  const [inserted] = await db
    .insert(providers)
    .values({
      name: data.name,
      type: data.type,
      config: data.config as Record<string, unknown>,
      isActive: data.isActive ?? true,
    })
    .returning();
  
  // Initialize ratings for all categories
  for (const category of ALL_CATEGORIES) {
    await db.insert(ratings).values({
      providerId: inserted.id,
      category,
      elo: DEFAULT_ELO,
      matchCount: 0,
      winCount: 0,
      tieCount: 0,
    });
  }
  
  // Return the provider with ratings
  const result = await getProviderById(inserted.id);
  
  if (!result) {
    throw new Error('Failed to retrieve created provider');
  }
  
  return result;
}

/**
 * Update a provider
 */
export async function updateProvider(
  id: number,
  data: Partial<NewProvider>
): Promise<ProviderWithRatings | null> {
  // Check if provider exists
  const existing = await getProviderById(id);
  if (!existing) {
    return null;
  }
  
  // Build update object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {
    updatedAt: sql`(unixepoch())`,
  };
  
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  
  if (data.type !== undefined) {
    updateData.type = data.type;
  }
  
  if (data.config !== undefined) {
    updateData.config = data.config as Record<string, unknown>;
  }
  
  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }
  
  // Perform the update
  await db.update(providers).set(updateData).where(eq(providers.id, id));
  
  // Return updated provider
  return getProviderById(id);
}

/**
 * Delete a provider (cascades to ratings)
 */
export async function deleteProvider(id: number): Promise<boolean> {
  const existing = await getProviderById(id);
  if (!existing) {
    return false;
  }
  
  await db.delete(providers).where(eq(providers.id, id));
  return true;
}

/**
 * Test provider connectivity via health check
 */
export async function testProvider(id: number): Promise<ProviderHealthCheck> {
  const provider = await getProviderRaw(id);
  
  if (!provider) {
    return {
      status: 'unhealthy',
      available: false,
      responseTimeMs: 0,
      timestamp: new Date(),
      error: `Provider with ID ${id} not found`,
    };
  }
  
  try {
    const adapter = createAdapter(provider.type, {
      config: provider.config,
      timeoutMs: 10000,
    });
    
    return await adapter.healthCheck();
  } catch (error) {
    return {
      status: 'unhealthy',
      available: false,
      responseTimeMs: 0,
      timestamp: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
