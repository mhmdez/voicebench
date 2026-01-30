/**
 * Eval Run Export API Route
 *
 * GET /api/eval/runs/[id]/export - Export results as JSON or CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db, evalRuns, evalResults, scenarios } from '@/db';

/**
 * Convert results to CSV format
 */
function toCSV(
  results: Array<{
    id: string;
    runId: string;
    scenarioId: string;
    providerId: string;
    audioUrl: string | null;
    transcript: string | null;
    ttfb: number | null;
    totalResponseTime: number | null;
    wer: number | null;
    accuracyScore: number | null;
    helpfulnessScore: number | null;
    naturalnessScore: number | null;
    efficiencyScore: number | null;
    judgeReasoning: string | null;
    taskCompleted: boolean | null;
    createdAt: Date;
    scenarioName: string | null;
    scenarioType: string | null;
  }>
): string {
  const headers = [
    'id',
    'runId',
    'scenarioId',
    'scenarioName',
    'scenarioType',
    'providerId',
    'audioUrl',
    'transcript',
    'ttfb',
    'totalResponseTime',
    'wer',
    'accuracyScore',
    'helpfulnessScore',
    'naturalnessScore',
    'efficiencyScore',
    'taskCompleted',
    'judgeReasoning',
    'createdAt',
  ];

  const escapeCSV = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape quotes and wrap in quotes if contains comma, newline, or quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = results.map((r) => [
    r.id,
    r.runId,
    r.scenarioId,
    r.scenarioName ?? '',
    r.scenarioType ?? '',
    r.providerId,
    r.audioUrl,
    r.transcript,
    r.ttfb,
    r.totalResponseTime,
    r.wer,
    r.accuracyScore,
    r.helpfulnessScore,
    r.naturalnessScore,
    r.efficiencyScore,
    r.taskCompleted,
    r.judgeReasoning,
    r.createdAt?.toISOString() ?? '',
  ].map(escapeCSV).join(','));

  return [headers.join(','), ...rows].join('\n');
}

/**
 * GET /api/eval/runs/[id]/export
 *
 * Export evaluation results in JSON or CSV format.
 * Query params:
 *   - format: 'json' (default) or 'csv'
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: runId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Validate format
    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid format. Use "json" or "csv".',
        },
        { status: 400 }
      );
    }

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

    // Get all results with scenario info
    const results = await db
      .select({
        id: evalResults.id,
        runId: evalResults.runId,
        scenarioId: evalResults.scenarioId,
        providerId: evalResults.providerId,
        audioUrl: evalResults.audioUrl,
        transcript: evalResults.transcript,
        ttfb: evalResults.ttfb,
        totalResponseTime: evalResults.totalResponseTime,
        wer: evalResults.wer,
        accuracyScore: evalResults.accuracyScore,
        helpfulnessScore: evalResults.helpfulnessScore,
        naturalnessScore: evalResults.naturalnessScore,
        efficiencyScore: evalResults.efficiencyScore,
        judgeReasoning: evalResults.judgeReasoning,
        taskCompleted: evalResults.taskCompleted,
        createdAt: evalResults.createdAt,
        scenarioName: scenarios.name,
        scenarioType: scenarios.type,
      })
      .from(evalResults)
      .leftJoin(scenarios, eq(evalResults.scenarioId, scenarios.id))
      .where(eq(evalResults.runId, runId));

    if (format === 'csv') {
      const csvContent = toCSV(results);
      const filename = `eval-run-${runId}-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // JSON format (default)
    const filename = `eval-run-${runId}-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(
      JSON.stringify({ run, results }, null, 2),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      }
    );
  } catch (error) {
    console.error('Error exporting eval run:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export evaluation run',
      },
      { status: 500 }
    );
  }
}
