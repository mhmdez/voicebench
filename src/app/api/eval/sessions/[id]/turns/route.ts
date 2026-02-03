/**
 * Eval Turns API — Add turns to a session
 * 
 * POST /api/eval/sessions/[id]/turns — add a turn and optionally get AI response
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, evalSessions, evalTurns, providers } from '@/db';
import { createAdapter } from '@/lib/providers';
import type { ProviderConfig } from '@/types/provider';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sessionId = Number(id);
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });
    }

    // Get session
    const [session] = await db.select().from(evalSessions).where(eq(evalSessions.id, sessionId));
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Get existing turns for turn number + conversation history
    const existingTurns = await db.select().from(evalTurns).where(eq(evalTurns.sessionId, sessionId));
    const nextTurnNumber = existingTurns.length + 1;

    const sentAt = new Date();

    // Save user turn
    const [userTurn] = await db.insert(evalTurns).values({
      sessionId,
      turnNumber: nextTurnNumber,
      role: 'user',
      content,
      sentAt,
    }).returning();

    // Get provider
    const [provider] = await db.select().from(providers).where(eq(providers.id, session.providerId));
    if (!provider) {
      return NextResponse.json({
        success: true,
        data: {
          userTurn,
          assistantTurn: null,
          error: 'Provider not found',
        },
      });
    }

    // Build conversation history
    const conversationHistory = existingTurns
      .sort((a, b) => a.turnNumber - b.turnNumber)
      .map(t => ({
        role: t.role as 'user' | 'assistant',
        content: t.content,
      }));

    // Call provider
    const startTime = Date.now();
    let assistantTurn = null;

    try {
      const config = (provider.config || {}) as ProviderConfig;
      const adapter = createAdapter(provider.type as 'openai' | 'gemini' | 'retell' | 'elevenlabs' | 'custom', {
        config,
        timeoutMs: 60000,
        retryAttempts: 1,
      });

      // Use generateResponse with text transcript (no audio needed)
      const dummyAudio = Buffer.alloc(100); // Minimal buffer since we pass transcript
      const response = await adapter.generateResponse({
        audioBuffer: dummyAudio,
        mimeType: 'audio/wav',
        transcript: content,
        conversationHistory,
      });

      const firstByteAt = new Date(startTime + response.latency.ttfb);
      const completedAt = new Date();
      const totalResponseMs = Date.now() - startTime;
      const ttfbMs = response.latency.ttfb;
      const transcript = response.transcript || '(no transcript)';
      const wordCount = transcript.split(/\s+/).filter(Boolean).length;
      const audioDurationMs = response.durationMs;
      const speechRateWpm = audioDurationMs > 0 ? Math.round(wordCount / (audioDurationMs / 60000)) : 0;

      // Save audio to a data URL (base64) for playback
      const audioBase64 = response.audioBuffer.toString('base64');
      const audioUrl = `data:${response.mimeType};base64,${audioBase64}`;

      const [savedTurn] = await db.insert(evalTurns).values({
        sessionId,
        turnNumber: nextTurnNumber + 1,
        role: 'assistant',
        content: transcript,
        audioUrl,
        sentAt,
        firstByteAt,
        completedAt,
        ttfbMs,
        totalResponseMs,
        wordCount,
        speechRateWpm,
        audioDurationMs,
      }).returning();

      assistantTurn = savedTurn;
    } catch (providerError) {
      console.error('Provider error:', providerError);
      
      // Save a failed assistant turn with error info
      const completedAt = new Date();
      const totalResponseMs = Date.now() - startTime;
      const errorMessage = providerError instanceof Error ? providerError.message : 'Provider call failed';
      
      const [savedTurn] = await db.insert(evalTurns).values({
        sessionId,
        turnNumber: nextTurnNumber + 1,
        role: 'assistant',
        content: `[Error] ${errorMessage}`,
        sentAt,
        completedAt,
        totalResponseMs,
        ttfbMs: totalResponseMs,
        wordCount: 0,
      }).returning();

      assistantTurn = savedTurn;
    }

    return NextResponse.json({
      success: true,
      data: { userTurn, assistantTurn },
    });
  } catch (error) {
    console.error('Error adding turn:', error);
    return NextResponse.json({ success: false, error: 'Failed to add turn' }, { status: 500 });
  }
}
