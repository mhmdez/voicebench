/**
 * Provider API Routes - List and Create
 *
 * GET /api/providers - List all providers with ratings
 * POST /api/providers - Create a new provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllProviders, createProvider } from '@/lib/services/provider-service';

/**
 * Zod schema for provider creation
 */
const createProviderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  type: z.enum(['openai', 'gemini', 'elevenlabs', 'custom']),
  config: z.object({
    apiKey: z.string().optional(),
    endpoint: z.string().url().optional(),
    model: z.string().optional(),
    voiceId: z.string().optional(),
  }).passthrough().default({}),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/providers
 *
 * List all providers with their ratings.
 * API keys are NOT included in the response.
 */
export async function GET() {
  try {
    const providers = await getAllProviders();
    
    return NextResponse.json({
      success: true,
      data: providers,
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch providers',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/providers
 *
 * Create a new provider.
 * Initializes ratings for all categories at default Elo.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const parseResult = createProviderSchema.safeParse(body);
    
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
    
    const provider = await createProvider(parseResult.data);
    
    return NextResponse.json(
      {
        success: true,
        data: provider,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create provider',
      },
      { status: 500 }
    );
  }
}
