/**
 * Eval Run Detail API Route
 *
 * GET /api/eval/runs/[id] - Get run details with results and aggregated metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db, evalRuns, evalResults } from '@/db';

/**
 * Calculate statistical aggregates for a numeric array
 */
function calculateAggregates(values: number[]): {
  mean: number | null;
  median: number | null;
  p95: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  count: number;
} {
  const filtered = values.filter((v) => v !== null && v !== undefined && !isNaN(v));
  
  if (filtered.length === 0) {
    return { mean: null, median: null, p95: null, stdDev: null, min: null, max: null, count: 0 };
  }

  // Sort for percentile calculations
  const sorted = [...filtered].sort((a, b) => a - b);
  const n = sorted.length;

  // Mean
  const sum = filtered.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Median
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // P95 (95th percentile)
  const p95Index = Math.ceil(0.95 * n) - 1;
  const p95 = sorted[Math.min(p95Index, n - 1)];

  // Standard deviation
  const squaredDiffs = filtered.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((acc, v) => acc + v, 0) / n;
  const stdDev = Math.sqrt(variance);

  // Min/Max
  const min = sorted[0];
  const max = sorted[n - 1];

  return {
    mean: Math.round(mean * 1000) / 1000,
    median: Math.round(median * 1000) / 1000,
    p95: Math.round(p95 * 1000) / 1000,
    stdDev: Math.round(stdDev * 1000) / 1000,
    min: Math.round(min * 1000) / 1000,
    max: Math.round(max * 1000) / 1000,
    count: n,
  };
}

/**
 * GET /api/eval/runs/[id]
 *
 * Returns the evaluation run with all results and aggregated metrics.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;

    // Get the run
    const [run] = await db
      .select()
      .from(evalRuns)
      .where(eq(evalRuns.id, runId));

    if (!run) {
      return NextResponse.json(
        {
          success: false,
          error: 'Evaluation run not found',
        },
        { status: 404 }
      );
    }

    // Get all results for this run
    const results = await db
      .select()
      .from(evalResults)
      .where(eq(evalResults.runId, runId));

    // Calculate aggregates for each metric
    const ttfbValues = results.map((r) => r.ttfb).filter((v): v is number => v !== null);
    const totalResponseTimeValues = results.map((r) => r.totalResponseTime).filter((v): v is number => v !== null);
    const werValues = results.map((r) => r.wer).filter((v): v is number => v !== null);
    const accuracyValues = results.map((r) => r.accuracyScore).filter((v): v is number => v !== null);
    const helpfulnessValues = results.map((r) => r.helpfulnessScore).filter((v): v is number => v !== null);
    const naturalnessValues = results.map((r) => r.naturalnessScore).filter((v): v is number => v !== null);
    const efficiencyValues = results.map((r) => r.efficiencyScore).filter((v): v is number => v !== null);

    const taskCompletedCount = results.filter((r) => r.taskCompleted === true).length;
    const taskCompletedTotal = results.filter((r) => r.taskCompleted !== null).length;

    const aggregates = {
      ttfb: calculateAggregates(ttfbValues),
      totalResponseTime: calculateAggregates(totalResponseTimeValues),
      wer: calculateAggregates(werValues),
      accuracyScore: calculateAggregates(accuracyValues),
      helpfulnessScore: calculateAggregates(helpfulnessValues),
      naturalnessScore: calculateAggregates(naturalnessValues),
      efficiencyScore: calculateAggregates(efficiencyValues),
      taskCompletion: {
        completed: taskCompletedCount,
        total: taskCompletedTotal,
        rate: taskCompletedTotal > 0 ? Math.round((taskCompletedCount / taskCompletedTotal) * 1000) / 10 : null,
      },
    };

    // Calculate per-provider aggregates
    const providerIds = [...new Set(results.map((r) => r.providerId))];
    const byProvider: Record<string, typeof aggregates> = {};

    for (const providerId of providerIds) {
      const providerResults = results.filter((r) => r.providerId === providerId);
      
      const pTtfb = providerResults.map((r) => r.ttfb).filter((v): v is number => v !== null);
      const pTotalTime = providerResults.map((r) => r.totalResponseTime).filter((v): v is number => v !== null);
      const pWer = providerResults.map((r) => r.wer).filter((v): v is number => v !== null);
      const pAccuracy = providerResults.map((r) => r.accuracyScore).filter((v): v is number => v !== null);
      const pHelpfulness = providerResults.map((r) => r.helpfulnessScore).filter((v): v is number => v !== null);
      const pNaturalness = providerResults.map((r) => r.naturalnessScore).filter((v): v is number => v !== null);
      const pEfficiency = providerResults.map((r) => r.efficiencyScore).filter((v): v is number => v !== null);

      const pTaskCompleted = providerResults.filter((r) => r.taskCompleted === true).length;
      const pTaskTotal = providerResults.filter((r) => r.taskCompleted !== null).length;

      byProvider[providerId] = {
        ttfb: calculateAggregates(pTtfb),
        totalResponseTime: calculateAggregates(pTotalTime),
        wer: calculateAggregates(pWer),
        accuracyScore: calculateAggregates(pAccuracy),
        helpfulnessScore: calculateAggregates(pHelpfulness),
        naturalnessScore: calculateAggregates(pNaturalness),
        efficiencyScore: calculateAggregates(pEfficiency),
        taskCompletion: {
          completed: pTaskCompleted,
          total: pTaskTotal,
          rate: pTaskTotal > 0 ? Math.round((pTaskCompleted / pTaskTotal) * 1000) / 10 : null,
        },
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        run,
        results,
        aggregates: {
          overall: aggregates,
          byProvider,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching eval run details:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch evaluation run details',
      },
      { status: 500 }
    );
  }
}
