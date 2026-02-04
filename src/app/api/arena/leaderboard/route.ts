/**
 * Arena Leaderboard API Route
 *
 * GET /api/arena/leaderboard - Returns provider rankings with Elo scores
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, ratings, providers } from '@/db';
import { eq, desc, sql } from 'drizzle-orm';
import type { RatingCategory } from '@/types/rating';

/** Valid rating categories */
const VALID_CATEGORIES: RatingCategory[] = [
  'general',
  'customer-support',
  'information-retrieval',
  'creative',
  'multilingual',
];

/** Confidence interval result */
interface ConfidenceInterval {
  lower: number;
  upper: number;
}

/** Leaderboard entry */
interface LeaderboardEntry {
  rank: number;
  providerId: number;
  providerName: string;
  elo: number;
  matchCount: number;
  winRate: number;
  confidence: ConfidenceInterval | null;
}

/**
 * Calculate 95% confidence interval for Elo rating
 * Uses normal approximation: Elo ± 1.96 * (400 / sqrt(n))
 * Only calculated when matchCount > 30
 */
function calculateConfidenceInterval(
  elo: number,
  matchCount: number
): ConfidenceInterval | null {
  if (matchCount <= 30) {
    return null;
  }

  // Standard deviation approximation for Elo ratings
  // 400 is the standard Elo scale factor
  const stdDev = 400 / Math.sqrt(matchCount);
  const margin = 1.96 * stdDev;

  return {
    lower: Math.round(elo - margin),
    upper: Math.round(elo + margin),
  };
}

/**
 * Calculate win rate from wins, ties, and total matches
 * Ties count as 0.5 wins
 */
function calculateWinRate(
  winCount: number,
  tieCount: number,
  matchCount: number
): number {
  if (matchCount === 0) return 0;
  // Ties count as half a win
  const effectiveWins = winCount + tieCount * 0.5;
  return effectiveWins / matchCount;
}

/**
 * GET /api/arena/leaderboard
 *
 * Query Parameters:
 * - category: Optional rating category (defaults to 'overall')
 *
 * Returns providers sorted by Elo descending
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'overall';

    let leaderboardData: LeaderboardEntry[];

    if (category === 'overall') {
      // Aggregate ratings across all categories
      const weightedElo = sql<number>`CASE WHEN SUM(${ratings.matchCount}) = 0 THEN AVG(${ratings.elo}) ELSE CAST(SUM(${ratings.elo} * ${ratings.matchCount}) / SUM(${ratings.matchCount}) AS INTEGER) END`;
      const results = await db
        .select({
          providerId: providers.id,
          providerName: providers.name,
          weightedElo,
          totalMatchCount: sql<number>`SUM(${ratings.matchCount})`,
          totalWinCount: sql<number>`SUM(${ratings.winCount})`,
          totalTieCount: sql<number>`SUM(${ratings.tieCount})`,
        })
        .from(providers)
        .leftJoin(ratings, eq(providers.id, ratings.providerId))
        .where(eq(providers.isActive, true))
        .groupBy(providers.id, providers.name)
        .orderBy(desc(weightedElo));

      leaderboardData = results.map((row, index) => {
        const elo = row.weightedElo ?? 1500;
        const matchCount = row.totalMatchCount ?? 0;
        const winCount = row.totalWinCount ?? 0;
        const tieCount = row.totalTieCount ?? 0;

        return {
          rank: index + 1,
          providerId: row.providerId,
          providerName: row.providerName,
          elo,
          matchCount,
          winRate: calculateWinRate(winCount, tieCount, matchCount),
          confidence: calculateConfidenceInterval(elo, matchCount),
        };
      });
    } else {
      // Validate category
      if (!VALID_CATEGORIES.includes(category as RatingCategory)) {
        return NextResponse.json(
          {
            error: 'Invalid category',
            validCategories: VALID_CATEGORIES,
          },
          { status: 400 }
        );
      }

      // Query ratings for specific category
      const results = await db
        .select({
          providerId: providers.id,
          providerName: providers.name,
          elo: ratings.elo,
          matchCount: ratings.matchCount,
          winCount: ratings.winCount,
          tieCount: ratings.tieCount,
        })
        .from(providers)
        .leftJoin(
          ratings,
          sql`${providers.id} = ${ratings.providerId} AND ${ratings.category} = ${category}`
        )
        .where(eq(providers.isActive, true))
        .orderBy(desc(ratings.elo));

      leaderboardData = results.map((row, index) => {
        const elo = row.elo ?? 1500;
        const matchCount = row.matchCount ?? 0;
        const winCount = row.winCount ?? 0;
        const tieCount = row.tieCount ?? 0;

        return {
          rank: index + 1,
          providerId: row.providerId,
          providerName: row.providerName,
          elo,
          matchCount,
          winRate: calculateWinRate(winCount, tieCount, matchCount),
          confidence: calculateConfidenceInterval(elo, matchCount),
        };
      });
    }

    // Return response with 60-second cache
    return NextResponse.json(
      { rankings: leaderboardData },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
