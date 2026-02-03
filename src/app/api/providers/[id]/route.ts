/**
 * Provider API Routes - Get, Update, Delete
 *
 * GET /api/providers/:id - Get a provider by ID
 * PUT /api/providers/:id - Update a provider
 * DELETE /api/providers/:id - Delete a provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getProviderById,
  updateProvider,
  deleteProvider,
} from '@/lib/services/provider-service';

/**
 * Zod schema for provider update
 */
const updateProviderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  type: z.enum(['openai', 'gemini', 'elevenlabs', 'retell', 'custom']).optional(),
  config: z.object({
    apiKey: z.string().optional(),
    endpoint: z.string().url().optional(),
    model: z.string().optional(),
    voiceId: z.string().optional(),
  }).passthrough().optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/providers/:id
 *
 * Get a provider by ID with ratings.
 * API keys are NOT included in the response.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid provider ID',
        },
        { status: 400 }
      );
    }
    
    const provider = await getProviderById(id);
    
    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    console.error('Error fetching provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch provider',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/providers/:id
 *
 * Update a provider.
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid provider ID',
        },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    
    // Validate input
    const parseResult = updateProviderSchema.safeParse(body);
    
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
    
    const provider = await updateProvider(id, parseResult.data);
    
    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: provider,
    });
  } catch (error) {
    console.error('Error updating provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update provider',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/providers/:id
 *
 * Delete a provider and its ratings.
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await context.params;
    const id = parseInt(params.id, 10);
    
    if (isNaN(id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid provider ID',
        },
        { status: 400 }
      );
    }
    
    const deleted = await deleteProvider(id);
    
    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found',
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Provider deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete provider',
      },
      { status: 500 }
    );
  }
}
