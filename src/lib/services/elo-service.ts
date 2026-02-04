/**
 * Elo Rating Service
 *
 * Implements Bradley-Terry model for Elo rating calculations.
 * Used for updating provider ratings after arena votes.
 */

import { eq, and, sql } from 'drizzle-orm';
import { db, ratings, providers } from '@/db';
import { DEFAULT_ELO } from '@/db/schema/ratings';
import type { RatingCategory } from '@/types/rating';

/** Elo calculation constants */
export const K_FACTOR = 32;
export const ELO_SCALE = 400;

/**
 * Calculate expected score using Bradley-Terry model
 *
 * expected = 1 / (1 + 10^((opponentRating - rating) / 400))
 *
 * @param rating - Player's current rating
 * @param opponentRating - Opponent's current rating
 * @returns Expected score between 0 and 1
 */
export function calculateExpectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / ELO_SCALE));
}

/**
 * Calculate new Elo rating
 *
 * newRating = oldRating + K * (actual - expected)
 *
 * @param currentRating - Current rating
 * @param expectedScore - Expected score (0-1)
 * @param actualScore - Actual score (1 = win, 0.5 = tie, 0 = loss)
 * @returns New rating
 */
export function calculateNewRating(
  currentRating: number,
  expectedScore: number,
  actualScore: number
): number {
  return Math.round(currentRating + K_FACTOR * (actualScore - expectedScore));
}

/**
 * Elo update result for a single provider
 */
export interface EloUpdateResult {
  providerId: number;
  providerName: string;
  oldElo: number;
  newElo: number;
  category: RatingCategory;
}

/**
 * Complete Elo update result for both providers
 */
export interface EloMatchResult {
  providerA: EloUpdateResult;
  providerB: EloUpdateResult;
}

/**
 * Get or create a rating record for a provider/category
 *
 * @param providerId - Provider ID
 * @param category - Rating category
 * @returns Current rating (creates with DEFAULT_ELO if not exists)
 */
type DbClient = typeof db;

async function getOrCreateRating(
  providerId: number,
  category: RatingCategory,
  dbClient: DbClient
): Promise<{ id: number; elo: number; matchCount: number; winCount: number; tieCount: number }> {
  // Try to find existing rating
  const [existing] = await dbClient
    .select({
      id: ratings.id,
      elo: ratings.elo,
      matchCount: ratings.matchCount,
      winCount: ratings.winCount,
      tieCount: ratings.tieCount,
    })
    .from(ratings)
    .where(
      and(
        eq(ratings.providerId, providerId),
        eq(ratings.category, category)
      )
    );

  if (existing) {
    return existing;
  }

  // Create new rating with default values
  const [newRating] = await dbClient
    .insert(ratings)
    .values({
      providerId,
      category,
      elo: DEFAULT_ELO,
      matchCount: 0,
      winCount: 0,
      tieCount: 0,
    })
    .onConflictDoNothing({
      target: [ratings.providerId, ratings.category],
    })
    .returning({
      id: ratings.id,
      elo: ratings.elo,
      matchCount: ratings.matchCount,
      winCount: ratings.winCount,
      tieCount: ratings.tieCount,
    });

  if (newRating) {
    return newRating;
  }

  const [fallback] = await dbClient
    .select({
      id: ratings.id,
      elo: ratings.elo,
      matchCount: ratings.matchCount,
      winCount: ratings.winCount,
      tieCount: ratings.tieCount,
    })
    .from(ratings)
    .where(
      and(
        eq(ratings.providerId, providerId),
        eq(ratings.category, category)
      )
    );

  if (!fallback) {
    throw new Error('Failed to create or fetch rating record');
  }

  return fallback;
}

/**
 * Get provider name by ID
 */
async function getProviderName(providerId: number, dbClient: DbClient): Promise<string> {
  const [provider] = await dbClient
    .select({ name: providers.name })
    .from(providers)
    .where(eq(providers.id, providerId));

  return provider?.name ?? `Provider ${providerId}`;
}

/**
 * Update rating record with new values
 */
async function updateRating(
  ratingId: number,
  newElo: number,
  isWin: boolean,
  isTie: boolean,
  dbClient: DbClient
): Promise<void> {
  await dbClient
    .update(ratings)
    .set({
      elo: newElo,
      matchCount: sql`${ratings.matchCount} + 1`,
      winCount: isWin ? sql`${ratings.winCount} + 1` : ratings.winCount,
      tieCount: isTie ? sql`${ratings.tieCount} + 1` : ratings.tieCount,
      updatedAt: new Date(),
    })
    .where(eq(ratings.id, ratingId));
}

/**
 * Update Elo ratings for a match result
 *
 * @param providerAId - Provider A's ID (as stored in match)
 * @param providerBId - Provider B's ID (as stored in match)
 * @param winner - Match result: 'A' | 'B' | 'tie'
 * @param category - Match category for rating update
 * @returns Updated Elo ratings for both providers
 */
export async function updateEloRatings(
  providerAId: string,
  providerBId: string,
  winner: 'A' | 'B' | 'tie',
  category: RatingCategory,
  dbClient: DbClient = db
): Promise<EloMatchResult> {
  // Parse provider IDs to integers
  const providerAIdNum = parseInt(providerAId, 10);
  const providerBIdNum = parseInt(providerBId, 10);

  // Get or create ratings for both providers
  const [ratingA, ratingB, nameA, nameB] = await Promise.all([
    getOrCreateRating(providerAIdNum, category, dbClient),
    getOrCreateRating(providerBIdNum, category, dbClient),
    getProviderName(providerAIdNum, dbClient),
    getProviderName(providerBIdNum, dbClient),
  ]);

  // Calculate expected scores
  const expectedA = calculateExpectedScore(ratingA.elo, ratingB.elo);
  const expectedB = calculateExpectedScore(ratingB.elo, ratingA.elo);

  // Determine actual scores based on winner
  let actualA: number;
  let actualB: number;
  let isWinA = false;
  let isWinB = false;
  let isTie = false;

  switch (winner) {
    case 'A':
      actualA = 1;
      actualB = 0;
      isWinA = true;
      break;
    case 'B':
      actualA = 0;
      actualB = 1;
      isWinB = true;
      break;
    case 'tie':
      actualA = 0.5;
      actualB = 0.5;
      isTie = true;
      break;
  }

  // Calculate new ratings
  const newEloA = calculateNewRating(ratingA.elo, expectedA, actualA);
  const newEloB = calculateNewRating(ratingB.elo, expectedB, actualB);

  // Update ratings in database
  await Promise.all([
    updateRating(ratingA.id, newEloA, isWinA, isTie, dbClient),
    updateRating(ratingB.id, newEloB, isWinB, isTie, dbClient),
  ]);

  return {
    providerA: {
      providerId: providerAIdNum,
      providerName: nameA,
      oldElo: ratingA.elo,
      newElo: newEloA,
      category,
    },
    providerB: {
      providerId: providerBIdNum,
      providerName: nameB,
      oldElo: ratingB.elo,
      newElo: newEloB,
      category,
    },
  };
}
