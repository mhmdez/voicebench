/**
 * Scenario API - Single scenario operations
 *
 * DELETE /api/scenarios/[id] - Delete a scenario
 */

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scenarios } from '@/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const existing = await db.select().from(scenarios).where(eq(scenarios.id, id));
    
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    await db.delete(scenarios).where(eq(scenarios.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete scenario' },
      { status: 500 }
    );
  }
}
