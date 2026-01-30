/**
 * Scenarios YAML Import API Route
 *
 * POST /api/scenarios/import - Import scenarios from YAML
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq, inArray } from 'drizzle-orm';

import { db, scenarios } from '@/db';
import { parseScenarioYaml, yamlToNewScenarios } from '@/lib/eval';

/**
 * POST /api/scenarios/import
 *
 * Import scenarios from YAML content.
 * Request body should contain:
 *   - yaml: The YAML content string
 *   - mode: 'skip' (default), 'update', or 'fail' for handling existing IDs
 *
 * Returns the imported scenarios and any skipped/updated entries.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { yaml, mode = 'skip' } = body;

    // Validate required fields
    if (!yaml || typeof yaml !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'YAML content is required',
        },
        { status: 400 }
      );
    }

    // Validate mode
    if (!['skip', 'update', 'fail'].includes(mode)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mode must be "skip", "update", or "fail"',
        },
        { status: 400 }
      );
    }

    // Parse the YAML
    const parseResult = parseScenarioYaml(yaml);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'YAML validation failed',
          details: parseResult.errors,
        },
        { status: 400 }
      );
    }

    const yamlScenarios = parseResult.scenarios!;
    const newScenarios = yamlToNewScenarios(yamlScenarios);

    // Map original IDs to new scenarios
    const idMap = new Map(yamlScenarios.map((ys, i) => [ys.id, newScenarios[i]]));

    // Check for existing scenarios
    const existingIds = new Set<string>();
    for (const ys of yamlScenarios) {
      const [existing] = await db
        .select({ id: scenarios.id })
        .from(scenarios)
        .where(eq(scenarios.id, ys.id));

      if (existing) {
        existingIds.add(ys.id);
      }
    }

    // Handle existing IDs based on mode
    if (mode === 'fail' && existingIds.size > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Some scenario IDs already exist',
          existingIds: Array.from(existingIds),
        },
        { status: 409 }
      );
    }

    const imported: string[] = [];
    const skipped: string[] = [];
    const updated: string[] = [];

    const now = new Date();

    for (const ys of yamlScenarios) {
      const newScenario = idMap.get(ys.id)!;

      if (existingIds.has(ys.id)) {
        if (mode === 'skip') {
          skipped.push(ys.id);
          continue;
        }

        if (mode === 'update') {
          await db
            .update(scenarios)
            .set({
              name: newScenario.name,
              type: newScenario.type,
              prompt: newScenario.prompt,
              expectedOutcome: newScenario.expectedOutcome,
              promptAudioUrl: newScenario.promptAudioUrl,
              tags: newScenario.tags,
              language: newScenario.language,
              difficulty: newScenario.difficulty,
            })
            .where(eq(scenarios.id, ys.id));

          updated.push(ys.id);
          continue;
        }
      }

      // Insert new scenario
      await db.insert(scenarios).values({
        id: ys.id,
        name: newScenario.name,
        type: newScenario.type,
        prompt: newScenario.prompt,
        expectedOutcome: newScenario.expectedOutcome,
        promptAudioUrl: newScenario.promptAudioUrl,
        tags: newScenario.tags,
        language: newScenario.language,
        difficulty: newScenario.difficulty,
        createdAt: now,
      });

      imported.push(ys.id);
    }

    // Fetch all imported/updated scenarios
    const allIds = [...imported, ...updated];
    const importedScenarios = allIds.length > 0
      ? await db
          .select()
          .from(scenarios)
          .where(inArray(scenarios.id, allIds))
      : [];

    return NextResponse.json(
      {
        success: true,
        data: {
          imported,
          updated,
          skipped,
          scenarios: importedScenarios,
        },
        meta: {
          totalParsed: yamlScenarios.length,
          totalImported: imported.length,
          totalUpdated: updated.length,
          totalSkipped: skipped.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error importing scenarios:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to import scenarios',
      },
      { status: 500 }
    );
  }
}
