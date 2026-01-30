/**
 * Arena Vote API Route
 *
 * POST /api/arena/vote - Record a vote on a match and update Elo ratings
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { eq, and, sql, gt } from 'drizzle-orm';
import { db, matches, votes } from '@/db';
import { updateEloRatings } from '@/lib/services/elo-service';
import type { Winner } from '@/types/vote';
import type { RatingCategory } from '@/types/rating';

/** Rate limit configuration */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_VOTES = 10; // 10 votes per minute per session

/** Valid winner values for voting (skip not allowed in API) */
type VoteWinner = 'A' | 'B' | 'tie';
const VALID_WINNERS: VoteWinner[] = ['A', 'B', 'tie'];

/**
 * Type guard to check if a value is a valid vote winner
 */
function isValidWinner(value: unknown): value is VoteWinner {
  return typeof value === 'string' && VALID_WINNERS.includes(value as VoteWinner);
}

/** Request body schema */
interface VoteRequest {
  matchId: string;
  winner: VoteWinner;
  sessionId?: string;
}

/** Vote response */
interface VoteResponse {
  success: true;
  voteId: string;
  matchId: string;
  winner: Winner;
  providerA: {
    name: string;
    oldElo: number;
    newElo: number;
  };
  providerB: {
    name: string;
    oldElo: number;
    newElo: number;
  };
  category: RatingCategory;
}

/** Error response */
interface ErrorResponse {
  error: string;
  code: string;
  details?: string;
}

/**
 * Get session ID from request
 * Uses provided sessionId or generates from IP + User-Agent hash
 */
function getSessionId(request: NextRequest, providedSessionId?: string): string {
  if (providedSessionId) {
    return providedSessionId;
  }

  // Generate session ID from request characteristics
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Simple hash for session identification
  const combined = `${ip}:${userAgent}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `session_${Math.abs(hash).toString(16)}`;
}

/**
 * Check rate limit for a session
 * Returns true if under limit, false if rate limited
 */
async function checkRateLimit(sessionId: string): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  // Count recent votes from this session
  const [result] = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(votes)
    .where(
      and(
        eq(votes.sessionId, sessionId),
        gt(votes.createdAt, windowStart)
      )
    );

  const count = result?.count ?? 0;
  const remaining = Math.max(0, RATE_LIMIT_MAX_VOTES - count);

  return {
    allowed: count < RATE_LIMIT_MAX_VOTES,
    remaining,
  };
}

/**
 * POST /api/arena/vote
 *
 * Record a vote on a match and update Elo ratings.
 *
 * Request Body:
 * - matchId: ID of the match to vote on (required)
 * - winner: 'A' | 'B' | 'tie' (required)
 * - sessionId: Optional session identifier for deduplication
 *
 * Response:
 * - voteId: Unique identifier for the vote
 * - matchId: Match that was voted on
 * - winner: The recorded vote
 * - providerA/providerB: Provider names and Elo changes
 * - category: The match category
 *
 * Errors:
 * - 400: Invalid request body or winner value
 * - 404: Match not found
 * - 409: Match already voted on
 * - 429: Rate limit exceeded
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: VoteRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          code: 'INVALID_BODY',
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.matchId || typeof body.matchId !== 'string') {
      return NextResponse.json(
        {
          error: 'matchId is required and must be a string',
          code: 'MISSING_MATCH_ID',
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    if (!isValidWinner(body.winner)) {
      return NextResponse.json(
        {
          error: 'winner must be one of: A, B, tie',
          code: 'INVALID_WINNER',
          details: `Received: ${body.winner}`,
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    // Get or generate session ID
    const sessionId = getSessionId(request, body.sessionId);

    // Check rate limit
    const rateLimit = await checkRateLimit(sessionId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          details: `Maximum ${RATE_LIMIT_MAX_VOTES} votes per minute. Try again later.`,
        } satisfies ErrorResponse,
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_VOTES),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
          },
        }
      );
    }

    // Fetch the match
    const [match] = await db
      .select()
      .from(matches)
      .where(eq(matches.id, body.matchId));

    if (!match) {
      return NextResponse.json(
        {
          error: 'Match not found',
          code: 'MATCH_NOT_FOUND',
          details: `No match with ID: ${body.matchId}`,
        } satisfies ErrorResponse,
        { status: 404 }
      );
    }

    // Check if match has already been voted on
    if (match.status === 'completed' || match.votedAt) {
      return NextResponse.json(
        {
          error: 'Match has already been voted on',
          code: 'ALREADY_VOTED',
          details: `Match ${body.matchId} was voted on at ${match.votedAt?.toISOString()}`,
        } satisfies ErrorResponse,
        { status: 409 }
      );
    }

    // Check if match has expired
    if (match.status === 'expired') {
      return NextResponse.json(
        {
          error: 'Match has expired',
          code: 'MATCH_EXPIRED',
        } satisfies ErrorResponse,
        { status: 410 }
      );
    }

    // Check for duplicate vote from this session on this match
    const [existingVote] = await db
      .select({ id: votes.id })
      .from(votes)
      .where(
        and(
          eq(votes.matchId, body.matchId),
          eq(votes.sessionId, sessionId)
        )
      );

    if (existingVote) {
      return NextResponse.json(
        {
          error: 'You have already voted on this match',
          code: 'DUPLICATE_VOTE',
        } satisfies ErrorResponse,
        { status: 409 }
      );
    }

    // Generate vote ID
    const voteId = randomUUID();
    const now = new Date();

    // Update Elo ratings
    const eloResult = await updateEloRatings(
      match.providerAId,
      match.providerBId,
      body.winner,
      match.category as RatingCategory
    );

    // Record the vote
    await db.insert(votes).values({
      id: voteId,
      matchId: body.matchId,
      winner: body.winner,
      sessionId,
      createdAt: now,
    });

    // Update match status
    await db
      .update(matches)
      .set({
        status: 'completed',
        votedAt: now,
      })
      .where(eq(matches.id, body.matchId));

    // Return success response
    const response: VoteResponse = {
      success: true,
      voteId,
      matchId: body.matchId,
      winner: body.winner,
      providerA: {
        name: eloResult.providerA.providerName,
        oldElo: eloResult.providerA.oldElo,
        newElo: eloResult.providerA.newElo,
      },
      providerB: {
        name: eloResult.providerB.providerName,
        oldElo: eloResult.providerB.oldElo,
        newElo: eloResult.providerB.newElo,
      },
      category: match.category as RatingCategory,
    };

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'X-RateLimit-Limit': String(RATE_LIMIT_MAX_VOTES),
        'X-RateLimit-Remaining': String(rateLimit.remaining - 1),
      },
    });
  } catch (error) {
    console.error('Vote API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : undefined,
      } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/arena/vote
 *
 * Returns API documentation for the vote endpoint.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/arena/vote',
    description: 'Record a vote on a match and update Elo ratings',
    requestBody: {
      matchId: {
        type: 'string',
        required: true,
        description: 'ID of the match to vote on',
      },
      winner: {
        type: 'string',
        required: true,
        enum: VALID_WINNERS,
        description: 'Which side won: A, B, or tie',
      },
      sessionId: {
        type: 'string',
        required: false,
        description: 'Optional session identifier for deduplication',
      },
    },
    response: {
      success: 'boolean - always true on success',
      voteId: 'string - unique identifier for the vote',
      matchId: 'string - the match that was voted on',
      winner: 'string - the recorded vote (A, B, or tie)',
      providerA: {
        name: 'string - provider name',
        oldElo: 'number - Elo before vote',
        newElo: 'number - Elo after vote',
      },
      providerB: {
        name: 'string - provider name',
        oldElo: 'number - Elo before vote',
        newElo: 'number - Elo after vote',
      },
      category: 'string - the match category',
    },
    errors: {
      400: 'Invalid request body or winner value',
      404: 'Match not found',
      409: 'Match already voted on or duplicate vote',
      410: 'Match has expired',
      429: 'Rate limit exceeded (10 votes/minute per session)',
    },
    rateLimit: {
      limit: RATE_LIMIT_MAX_VOTES,
      window: '1 minute',
      identifier: 'Session ID (provided or derived from IP + User-Agent)',
    },
  });
}
