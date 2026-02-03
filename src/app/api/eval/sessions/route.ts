/**
 * Eval Sessions API — List and Create
 */

import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db, evalSessions, evalTurns, evalTurnRatings, providers, scenarios } from '@/db';

/**
 * GET /api/eval/sessions — list all sessions with summary
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerFilter = searchParams.get('provider_id');
    const statusFilter = searchParams.get('status');

    const sessions = await db.select().from(evalSessions).orderBy(desc(evalSessions.startedAt));

    const results = [];
    for (const session of sessions) {
      if (providerFilter && session.providerId !== Number(providerFilter)) continue;
      if (statusFilter && session.status !== statusFilter) continue;

      // Get provider name
      const [provider] = await db.select({ name: providers.name }).from(providers).where(eq(providers.id, session.providerId));
      
      // Get prompt name
      let promptName = session.freestylePrompt ? '(freestyle)' : '';
      if (session.promptId) {
        const [scenario] = await db.select({ name: scenarios.name }).from(scenarios).where(eq(scenarios.id, session.promptId));
        promptName = scenario?.name ?? 'Unknown';
      }

      // Get turn count
      const turns = await db.select().from(evalTurns).where(eq(evalTurns.sessionId, session.id));
      const assistantTurns = turns.filter(t => t.role === 'assistant');

      // Get avg metrics
      const avgTtfb = assistantTurns.length > 0
        ? Math.round(assistantTurns.reduce((sum, t) => sum + (t.ttfbMs ?? 0), 0) / assistantTurns.length)
        : null;

      // Get ratings
      const allRatings = [];
      for (const turn of assistantTurns) {
        const ratings = await db.select().from(evalTurnRatings).where(eq(evalTurnRatings.turnId, turn.id));
        allRatings.push(...ratings);
      }
      const positiveRatings = allRatings.filter(r => r.value === 1).length;
      const totalRatings = allRatings.filter(r => r.value !== 0).length;
      const humanScore = totalRatings > 0 ? Math.round((positiveRatings / totalRatings) * 100) : null;

      results.push({
        ...session,
        providerName: provider?.name ?? 'Unknown',
        promptName,
        turnCount: turns.length,
        avgTtfbMs: avgTtfb,
        humanScore,
      });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

/**
 * POST /api/eval/sessions — create new session
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId, promptId, freestylePrompt } = body;

    if (!providerId) {
      return NextResponse.json({ success: false, error: 'providerId is required' }, { status: 400 });
    }

    const [session] = await db.insert(evalSessions).values({
      providerId,
      promptId: promptId || null,
      freestylePrompt: freestylePrompt || null,
      startedAt: new Date(),
      status: 'active',
    }).returning();

    return NextResponse.json({ success: true, data: session }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ success: false, error: 'Failed to create session' }, { status: 500 });
  }
}
