/**
 * Provider Test API Route - Health Check
 *
 * POST /api/providers/:id/test - Run health check on provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { testProvider } from '@/lib/services/provider-service';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/providers/:id/test
 *
 * Run a health check on the provider.
 * Tests connectivity, authentication, and basic functionality.
 */
export async function POST(
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
    
    const healthCheck = await testProvider(id);
    
    // Return appropriate status based on health
    const httpStatus = healthCheck.available ? 200 : 503;
    
    return NextResponse.json(
      {
        success: healthCheck.available,
        data: healthCheck,
      },
      { status: httpStatus }
    );
  } catch (error) {
    console.error('Error testing provider:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test provider',
        data: {
          status: 'unhealthy',
          available: false,
          responseTimeMs: 0,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
