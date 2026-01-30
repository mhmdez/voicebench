/**
 * Arena Match Generation API Route
 *
 * POST /api/arena/match - Generate a new match between two providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateMatch } from '@/lib/services/arena-service';
import type { Category } from '@/types/prompt';

/** Valid categories */
const VALID_CATEGORIES: Category[] = [
  'general',
  'customer-support',
  'information-retrieval',
  'creative',
  'multilingual',
];

/** Request body schema */
interface GenerateMatchRequest {
  category?: Category;
  timeoutMs?: number;
}

/**
 * POST /api/arena/match
 *
 * Generate a new match between two voice AI providers.
 *
 * Request Body:
 * - category: Optional category for the match (defaults to 'general')
 * - timeoutMs: Optional timeout for provider calls (defaults to 30000)
 *
 * Response:
 * - matchId: Unique identifier for the match
 * - prompt: The prompt used for the match
 * - responseA: First provider's response (URL and latency)
 * - responseB: Second provider's response (URL and latency)
 * - createdAt: Match creation timestamp
 *
 * For demo/testing (when no providers are configured):
 * - Returns a mock match with demo audio URLs
 * - Includes isMock: true flag
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: GenerateMatchRequest;
    try {
      body = await request.json();
    } catch {
      // Empty body is OK, use defaults
      body = {};
    }

    // Validate category if provided
    const category: Category = body.category || 'general';
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        {
          error: 'Invalid category',
          validCategories: VALID_CATEGORIES,
        },
        { status: 400 }
      );
    }

    // Validate timeout if provided
    const timeoutMs = body.timeoutMs ?? 30000;
    if (typeof timeoutMs !== 'number' || timeoutMs < 1000 || timeoutMs > 120000) {
      return NextResponse.json(
        {
          error: 'Invalid timeout',
          message: 'timeoutMs must be between 1000 and 120000 milliseconds',
        },
        { status: 400 }
      );
    }

    // Generate the match
    const result = await generateMatch(category, timeoutMs);

    if (!result.success) {
      // Map error codes to HTTP status codes
      const statusCode =
        result.error.code === 'NO_PROVIDERS' ? 503 :
        result.error.code === 'NO_PROMPTS' ? 404 :
        result.error.code === 'PROVIDER_FAILURE' ? 502 :
        500;

      return NextResponse.json(
        {
          error: result.error.error,
          code: result.error.code,
          details: result.error.details,
        },
        { status: statusCode }
      );
    }

    // Return successful match
    return NextResponse.json(result.match, { status: 201 });
  } catch (error) {
    console.error('Match generation API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/arena/match
 *
 * Returns information about how to use the match API.
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/arena/match',
    description: 'Generate a new match between two voice AI providers',
    requestBody: {
      category: {
        type: 'string',
        description: 'Category for the match',
        default: 'general',
        validValues: VALID_CATEGORIES,
      },
      timeoutMs: {
        type: 'number',
        description: 'Timeout for provider calls in milliseconds',
        default: 30000,
        min: 1000,
        max: 120000,
      },
    },
    response: {
      matchId: 'Unique identifier for the match',
      prompt: {
        id: 'Prompt identifier',
        text: 'Prompt text',
        category: 'Prompt category',
        audioUrl: 'Optional audio URL for the prompt',
      },
      responseA: {
        url: 'URL to first provider response audio',
        latencyMs: 'Response latency in milliseconds',
      },
      responseB: {
        url: 'URL to second provider response audio',
        latencyMs: 'Response latency in milliseconds',
      },
      createdAt: 'Match creation timestamp',
      isMock: 'True if this is a demo/mock match (optional)',
    },
  });
}
