/**
 * Scenarios API Routes - List and Create
 *
 * GET /api/scenarios - List all scenarios
 * POST /api/scenarios - Create a new scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { desc } from 'drizzle-orm';

import { db, scenarios } from '@/db';

/**
 * Zod schema for scenario creation
 */
const createScenarioSchema = z.object({
  id: z
    .string()
    .min(1, 'id is required')
    .regex(/^[a-z0-9-]+$/, 'id must be lowercase alphanumeric with hyphens only')
    .optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  type: z.enum(['task-completion', 'information-retrieval', 'conversation-flow']),
  prompt: z.string().min(1, 'Prompt is required'),
  expectedOutcome: z.string().min(1, 'Expected outcome is required'),
  promptAudioUrl: z.string().url('Must be a valid URL').optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  language: z.string().min(2).max(10).optional().default('en'),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
});

/**
 * GET /api/scenarios
 *
 * List all scenarios ordered by creation date (newest first).
 * Optional query params:
 *   - type: Filter by scenario type
 *   - difficulty: Filter by difficulty
 *   - language: Filter by language
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const difficultyFilter = searchParams.get('difficulty');
    const languageFilter = searchParams.get('language');

    let query = db.select().from(scenarios);

    // Apply filters if provided
    const allScenarios = await query.orderBy(desc(scenarios.createdAt));

    // Filter in memory (Drizzle SQLite has limited dynamic where support)
    let filtered = allScenarios;

    if (typeFilter) {
      filtered = filtered.filter((s) => s.type === typeFilter);
    }
    if (difficultyFilter) {
      filtered = filtered.filter((s) => s.difficulty === difficultyFilter);
    }
    if (languageFilter) {
      filtered = filtered.filter((s) => s.language === languageFilter);
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      meta: {
        total: filtered.length,
        filters: {
          type: typeFilter,
          difficulty: difficultyFilter,
          language: languageFilter,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch scenarios',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scenarios
 *
 * Create a new scenario.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parseResult = createScenarioSchema.safeParse(body);

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

    const {
      id: providedId,
      name,
      type,
      prompt,
      expectedOutcome,
      promptAudioUrl,
      tags,
      language,
      difficulty,
    } = parseResult.data;

    // Use provided ID or generate one
    const scenarioId = providedId || randomUUID();
    const now = new Date();

    await db.insert(scenarios).values({
      id: scenarioId,
      name,
      type,
      prompt,
      expectedOutcome,
      promptAudioUrl: promptAudioUrl ?? null,
      tags,
      language,
      difficulty,
      createdAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: scenarioId,
          name,
          type,
          prompt,
          expectedOutcome,
          promptAudioUrl: promptAudioUrl ?? null,
          tags,
          language,
          difficulty,
          createdAt: now,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating scenario:', error);

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: 'A scenario with this ID already exists',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create scenario',
      },
      { status: 500 }
    );
  }
}
