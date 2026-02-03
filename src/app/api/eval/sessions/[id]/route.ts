/**
 * Eval Session API — Get and Update single session
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, evalSessions, evalTurns, evalTurnRatings, providers, scenarios } from '@/db';

/**
 * GET /api/eval/sessions/[id] — get full session detail with turns and ratings
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = Number(id);

    const [session] = await db.select().from(evalSessions).where(eq(evalSessions.id, sessionId));
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Provider name
    const [provider] = await db.select().from(providers).where(eq(providers.id, session.providerId));

    // Prompt name
    let promptName = session.freestylePrompt ? '(freestyle)' : '';
    let promptText = session.freestylePrompt || '';
    if (session.promptId) {
      const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, session.promptId));
      promptName = scenario?.name ?? 'Unknown';
      promptText = scenario?.prompt ?? '';
    }

    // Get all turns with ratings
    const turns = await db.select().from(evalTurns).where(eq(evalTurns.sessionId, sessionId));
    
    const turnsWithRatings = [];
    for (const turn of turns) {
      const ratings = await db.select().from(evalTurnRatings).where(eq(evalTurnRatings.turnId, turn.id));
      turnsWithRatings.push({
        ...turn,
        ratings: ratings.reduce((acc, r) => {
          acc[r.metric] = r.value;
          return acc;
        }, {} as Record<string, number>),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...session,
        providerName: provider?.name ?? 'Unknown',
        providerType: provider?.type ?? 'unknown',
        promptName,
        promptText,
        turns: turnsWithRatings,
      },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch session' }, { status: 500 });
  }
}

/**
 * PATCH /api/eval/sessions/[id] — end session
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = Number(id);
    const body = await request.json();

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status === 'completed' || body.status === 'aborted') {
      updateData.endedAt = new Date();
    }

    await db.update(evalSessions).set(updateData).where(eq(evalSessions.id, sessionId));

    const [updated] = await db.select().from(evalSessions).where(eq(evalSessions.id, sessionId));

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ success: false, error: 'Failed to update session' }, { status: 500 });
  }
}
