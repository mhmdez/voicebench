/**
 * Turn Ratings API — Set human ratings for a turn
 *
 * PUT /api/eval/sessions/[id]/turns/[turnId]/ratings
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, evalTurnRatings } from '@/db';

const VALID_METRICS = ['naturalness', 'prosody', 'accuracy', 'helpfulness', 'efficiency'] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; turnId: string }> }
) {
  try {
    const { turnId: turnIdStr } = await params;
    const turnId = Number(turnIdStr);
    const body = await request.json();
    const { metric, value } = body;

    if (!VALID_METRICS.includes(metric)) {
      return NextResponse.json(
        { success: false, error: `Invalid metric. Must be one of: ${VALID_METRICS.join(', ')}` },
        { status: 400 }
      );
    }

    if (![1, 0, -1].includes(value)) {
      return NextResponse.json(
        { success: false, error: 'Value must be 1 (good), -1 (bad), or 0 (neutral)' },
        { status: 400 }
      );
    }

    // Check if rating exists
    const existing = await db
      .select()
      .from(evalTurnRatings)
      .where(and(eq(evalTurnRatings.turnId, turnId), eq(evalTurnRatings.metric, metric)));

    if (existing.length > 0) {
      // Update
      await db
        .update(evalTurnRatings)
        .set({ value })
        .where(and(eq(evalTurnRatings.turnId, turnId), eq(evalTurnRatings.metric, metric)));
    } else {
      // Insert
      await db.insert(evalTurnRatings).values({ turnId, metric, value });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving rating:', error);
    return NextResponse.json({ success: false, error: 'Failed to save rating' }, { status: 500 });
  }
}
