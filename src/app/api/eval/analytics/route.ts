/**
 * Eval Analytics API — Aggregated metrics across all sessions
 *
 * GET /api/eval/analytics
 * Returns: { providers, prompts, metrics }
 */

import { NextResponse } from 'next/server';
import { eq, desc, sql } from 'drizzle-orm';
import { db, evalSessions, evalTurns, evalTurnRatings, providers, scenarios } from '@/db';

interface ProviderAnalytics {
  id: number;
  name: string;
  type: string;
  sessionCount: number;
  completedCount: number;
  avgTtfbMs: number | null;
  avgResponseMs: number | null;
  avgHumanScore: number | null;
}

interface PromptAnalytics {
  promptId: string | null;
  promptName: string;
  timesUsed: number;
  avgTtfbMs: number | null;
  avgResponseMs: number | null;
  avgHumanScore: number | null;
}

interface MetricAnalytics {
  metric: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  positivePercent: number;
}

export async function GET() {
  try {
    // Fetch all sessions
    const allSessions = await db.select().from(evalSessions).orderBy(desc(evalSessions.startedAt));

    // Fetch all providers
    const allProviders = await db.select().from(providers);
    const providerMap = new Map(allProviders.map(p => [p.id, p]));

    // Fetch all scenarios
    const allScenarios = await db.select().from(scenarios);
    const scenarioMap = new Map(allScenarios.map(s => [s.id, s]));

    // Fetch all turns
    const allTurns = await db.select().from(evalTurns);
    const turnsBySession = new Map<number, typeof allTurns>();
    for (const turn of allTurns) {
      const existing = turnsBySession.get(turn.sessionId) ?? [];
      existing.push(turn);
      turnsBySession.set(turn.sessionId, existing);
    }

    // Fetch all ratings
    const allRatings = await db.select().from(evalTurnRatings);
    const ratingsByTurn = new Map<number, typeof allRatings>();
    for (const rating of allRatings) {
      const existing = ratingsByTurn.get(rating.turnId) ?? [];
      existing.push(rating);
      ratingsByTurn.set(rating.turnId, existing);
    }

    // --- Provider Analytics ---
    const providerStats = new Map<number, {
      ttfbSum: number; ttfbCount: number;
      responseSum: number; responseCount: number;
      positiveRatings: number; totalRatings: number;
      sessionCount: number; completedCount: number;
    }>();

    for (const session of allSessions) {
      if (!providerStats.has(session.providerId)) {
        providerStats.set(session.providerId, {
          ttfbSum: 0, ttfbCount: 0,
          responseSum: 0, responseCount: 0,
          positiveRatings: 0, totalRatings: 0,
          sessionCount: 0, completedCount: 0,
        });
      }
      const stats = providerStats.get(session.providerId)!;
      stats.sessionCount++;
      if (session.status === 'completed') stats.completedCount++;

      const turns = turnsBySession.get(session.id) ?? [];
      const assistantTurns = turns.filter(t => t.role === 'assistant');

      for (const turn of assistantTurns) {
        if (turn.ttfbMs != null) { stats.ttfbSum += turn.ttfbMs; stats.ttfbCount++; }
        if (turn.totalResponseMs != null) { stats.responseSum += turn.totalResponseMs; stats.responseCount++; }
        const ratings = ratingsByTurn.get(turn.id) ?? [];
        for (const r of ratings) {
          if (r.value !== 0) {
            stats.totalRatings++;
            if (r.value === 1) stats.positiveRatings++;
          }
        }
      }
    }

    const providerAnalytics: ProviderAnalytics[] = [];
    for (const [id, stats] of providerStats) {
      const provider = providerMap.get(id);
      if (!provider) continue;
      providerAnalytics.push({
        id,
        name: provider.name,
        type: provider.type,
        sessionCount: stats.sessionCount,
        completedCount: stats.completedCount,
        avgTtfbMs: stats.ttfbCount > 0 ? Math.round(stats.ttfbSum / stats.ttfbCount) : null,
        avgResponseMs: stats.responseCount > 0 ? Math.round(stats.responseSum / stats.responseCount) : null,
        avgHumanScore: stats.totalRatings > 0 ? Math.round((stats.positiveRatings / stats.totalRatings) * 100) : null,
      });
    }

    // --- Prompt Analytics ---
    const promptStats = new Map<string, {
      promptName: string; promptId: string | null;
      ttfbSum: number; ttfbCount: number;
      responseSum: number; responseCount: number;
      positiveRatings: number; totalRatings: number;
      timesUsed: number;
    }>();

    for (const session of allSessions) {
      const key = session.promptId ?? `__freestyle__${session.freestylePrompt ?? ''}`;
      let promptName = '(freestyle)';
      if (session.promptId) {
        const scenario = scenarioMap.get(session.promptId);
        promptName = scenario?.name ?? 'Unknown';
      }

      if (!promptStats.has(key)) {
        promptStats.set(key, {
          promptName, promptId: session.promptId,
          ttfbSum: 0, ttfbCount: 0,
          responseSum: 0, responseCount: 0,
          positiveRatings: 0, totalRatings: 0,
          timesUsed: 0,
        });
      }
      const stats = promptStats.get(key)!;
      stats.timesUsed++;

      const turns = turnsBySession.get(session.id) ?? [];
      const assistantTurns = turns.filter(t => t.role === 'assistant');

      for (const turn of assistantTurns) {
        if (turn.ttfbMs != null) { stats.ttfbSum += turn.ttfbMs; stats.ttfbCount++; }
        if (turn.totalResponseMs != null) { stats.responseSum += turn.totalResponseMs; stats.responseCount++; }
        const ratings = ratingsByTurn.get(turn.id) ?? [];
        for (const r of ratings) {
          if (r.value !== 0) {
            stats.totalRatings++;
            if (r.value === 1) stats.positiveRatings++;
          }
        }
      }
    }

    const promptAnalytics: PromptAnalytics[] = Array.from(promptStats.values())
      .map(stats => ({
        promptId: stats.promptId,
        promptName: stats.promptName,
        timesUsed: stats.timesUsed,
        avgTtfbMs: stats.ttfbCount > 0 ? Math.round(stats.ttfbSum / stats.ttfbCount) : null,
        avgResponseMs: stats.responseCount > 0 ? Math.round(stats.responseSum / stats.responseCount) : null,
        avgHumanScore: stats.totalRatings > 0 ? Math.round((stats.positiveRatings / stats.totalRatings) * 100) : null,
      }))
      .sort((a, b) => b.timesUsed - a.timesUsed);

    // --- Metric Analytics ---
    const metricStats = new Map<string, { positive: number; negative: number; neutral: number }>();
    const metricNames = ['naturalness', 'prosody', 'accuracy', 'helpfulness', 'efficiency'];
    for (const name of metricNames) {
      metricStats.set(name, { positive: 0, negative: 0, neutral: 0 });
    }

    for (const rating of allRatings) {
      const stats = metricStats.get(rating.metric);
      if (!stats) continue;
      if (rating.value === 1) stats.positive++;
      else if (rating.value === -1) stats.negative++;
      else stats.neutral++;
    }

    const metricAnalytics: MetricAnalytics[] = metricNames.map(metric => {
      const stats = metricStats.get(metric)!;
      const total = stats.positive + stats.negative + stats.neutral;
      const nonNeutralTotal = stats.positive + stats.negative;
      return {
        metric,
        positive: stats.positive,
        negative: stats.negative,
        neutral: stats.neutral,
        total,
        positivePercent: nonNeutralTotal > 0 ? Math.round((stats.positive / nonNeutralTotal) * 100) : 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        providers: providerAnalytics,
        prompts: promptAnalytics,
        metrics: metricAnalytics,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
