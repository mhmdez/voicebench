/**
 * Eval Runs API Routes - List and Create
 *
 * GET /api/eval/runs - List all evaluation runs
 * POST /api/eval/runs - Create and start a new evaluation run
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { desc } from 'drizzle-orm';

import { db, evalRuns } from '@/db';
import { executeEvalRun } from '@/lib/eval';

/**
 * Zod schema for eval run creation
 */
const createEvalRunSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  providerIds: z.array(z.string()).min(1, 'At least one provider is required'),
  scenarioIds: z.array(z.string()).min(1, 'At least one scenario is required'),
});

/**
 * GET /api/eval/runs
 *
 * List all evaluation runs ordered by creation date (newest first).
 */
export async function GET() {
  try {
    const runs = await db
      .select()
      .from(evalRuns)
      .orderBy(desc(evalRuns.createdAt));

    return NextResponse.json({
      success: true,
      data: runs,
    });
  } catch (error) {
    console.error('Error fetching eval runs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch evaluation runs',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/eval/runs
 *
 * Create a new evaluation run and start execution.
 * Returns immediately with the run ID; execution continues in background.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parseResult = createEvalRunSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, providerIds, scenarioIds } = parseResult.data;

    // Create the run record
    const runId = randomUUID();
    const now = new Date();

    await db.insert(evalRuns).values({
      id: runId,
      name,
      providerIds,
      scenarioIds,
      status: 'pending',
      progress: 0,
      createdAt: now,
    });

    // Start execution in background (non-blocking)
    // Using setImmediate to allow response to be sent first
    setImmediate(async () => {
      try {
        await executeEvalRun(runId);
      } catch (err) {
        console.error(`Eval run ${runId} failed:`, err);
        // Status will be set to 'failed' by the engine
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: runId,
          name,
          providerIds,
          scenarioIds,
          status: 'pending',
          progress: 0,
          createdAt: now,
        },
        message: 'Evaluation run created and started',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating eval run:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create evaluation run',
      },
      { status: 500 }
    );
  }
}
