/**
 * Arena Service
 *
 * Business logic for arena match generation.
 * Handles prompt selection, provider calls, and match creation.
 */

import { randomUUID } from 'crypto';
import { eq, and, sql } from 'drizzle-orm';
import { promises as fs } from 'fs';
import path from 'path';
import { db, matches, prompts } from '@/db';
import type { Category } from '@/types/prompt';
import type { Provider } from '@/types/provider';
import { selectProviders, getActiveProviderCount } from './matchmaking';
import { getProviderRaw } from './provider-service';
import { createAdapter, ProviderError } from '@/lib/providers';
import type { ProviderResponse } from '@/lib/providers/types';

/**
 * Generated match result returned to the client
 */
export interface GeneratedMatch {
  matchId: string;
  prompt: {
    id: string;
    text: string;
    category: Category;
    audioUrl: string | null;
  };
  responseA: {
    url: string;
    latencyMs: number;
  };
  responseB: {
    url: string;
    latencyMs: number;
  };
  createdAt: Date;
}

/**
 * Mock match for demo/testing when no providers are configured
 */
export interface MockMatch extends GeneratedMatch {
  isMock: true;
  mockProviderA: string;
  mockProviderB: string;
}

/**
 * Error result when match generation fails
 */
export interface MatchGenerationError {
  error: string;
  code: 'NO_PROVIDERS' | 'NO_PROMPTS' | 'PROVIDER_FAILURE' | 'INTERNAL_ERROR';
  details?: string;
}

/**
 * Result type for generateMatch
 */
export type GenerateMatchResult =
  | { success: true; match: GeneratedMatch | MockMatch }
  | { success: false; error: MatchGenerationError };

/**
 * Provider call result (internal)
 */
interface ProviderCallResult {
  success: boolean;
  providerId: number;
  response?: ProviderResponse;
  error?: string;
  latencyMs: number;
}

// Audio storage directory
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio', 'responses');

/**
 * Ensure audio directory exists
 */
async function ensureAudioDir(): Promise<void> {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
}

/**
 * Get file extension from MIME type
 */
function getExtensionFromMime(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/flac': 'flac',
    'audio/aac': 'aac',
    'audio/mp4': 'm4a',
    'audio/webm': 'webm',
  };
  return mimeMap[mimeType] ?? 'mp3';
}

/**
 * Save audio buffer to filesystem and return URL
 */
async function saveAudioFile(
  audioBuffer: Buffer,
  mimeType: string,
  matchId: string,
  position: 'a' | 'b'
): Promise<string> {
  await ensureAudioDir();
  
  const ext = getExtensionFromMime(mimeType);
  const filename = `${matchId}-${position}.${ext}`;
  const filepath = path.join(AUDIO_DIR, filename);
  
  await fs.writeFile(filepath, audioBuffer);
  
  // Return public URL
  return `/audio/responses/${filename}`;
}

/**
 * Call a provider and return the result
 */
async function callProvider(
  provider: Provider,
  promptText: string,
  promptAudioBuffer: Buffer | null,
  timeoutMs: number
): Promise<ProviderCallResult> {
  const startTime = Date.now();
  
  try {
    const adapter = createAdapter(provider.type, {
      config: provider.config,
      timeoutMs,
      retryAttempts: 1, // Single attempt for matches (no retries)
    });

    // Create audio prompt
    // If we have prompt audio, use it; otherwise use a simple text prompt
    const audioPrompt = promptAudioBuffer
      ? {
          audioBuffer: promptAudioBuffer,
          mimeType: 'audio/wav',
          transcript: promptText,
        }
      : {
          // For text-only prompts, we need to create a simple audio buffer
          // In a real system, you'd want to TTS the prompt first
          // For now, just send the text as transcript
          audioBuffer: Buffer.from(''), // Empty buffer
          mimeType: 'audio/wav',
          transcript: promptText,
          systemPrompt: 'You are a helpful voice assistant. Respond naturally and conversationally.',
        };

    const response = await adapter.generateResponse(audioPrompt);
    
    return {
      success: true,
      providerId: provider.id,
      response,
      latencyMs: Date.now() - startTime,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    
    if (error instanceof ProviderError) {
      return {
        success: false,
        providerId: provider.id,
        error: `${error.code}: ${error.message}`,
        latencyMs,
      };
    }
    
    return {
      success: false,
      providerId: provider.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      latencyMs,
    };
  }
}

/**
 * Select a random prompt from the category pool
 */
async function selectRandomPrompt(category: Category) {
  // Get all active prompts for the category
  const categoryPrompts = await db
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.category, category),
        eq(prompts.isActive, true)
      )
    );

  if (categoryPrompts.length === 0) {
    // If no prompts in category, try to get any active prompt
    const allPrompts = await db
      .select()
      .from(prompts)
      .where(eq(prompts.isActive, true));
    
    if (allPrompts.length === 0) {
      return null;
    }
    
    // Pick random from all
    return allPrompts[Math.floor(Math.random() * allPrompts.length)];
  }

  // Pick random from category
  return categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];
}

/**
 * Load prompt audio file as buffer (if exists)
 */
async function loadPromptAudio(audioUrl: string | null): Promise<Buffer | null> {
  if (!audioUrl) {
    return null;
  }

  try {
    // Handle relative URLs
    const filepath = audioUrl.startsWith('/')
      ? path.join(process.cwd(), 'public', audioUrl)
      : audioUrl;
    
    return await fs.readFile(filepath);
  } catch {
    // Audio file not found, proceed without it
    return null;
  }
}

/**
 * Create a mock match for demo/testing purposes
 */
function createMockMatch(category: Category): MockMatch {
  const matchId = randomUUID();
  const mockPrompts: Record<Category, string> = {
    'general': 'Hello! How are you doing today?',
    'customer-support': 'I need help with my order. It arrived damaged.',
    'information-retrieval': 'What is the capital of France?',
    'creative': 'Tell me a short story about a robot learning to paint.',
    'multilingual': 'Can you greet me in Spanish, French, and Japanese?',
  };

  const promptText = mockPrompts[category];
  
  return {
    matchId,
    prompt: {
      id: `mock-prompt-${category}`,
      text: promptText,
      category,
      audioUrl: null,
    },
    responseA: {
      url: '/audio/mock/demo-response-a.mp3',
      latencyMs: 850,
    },
    responseB: {
      url: '/audio/mock/demo-response-b.mp3',
      latencyMs: 920,
    },
    createdAt: new Date(),
    isMock: true,
    mockProviderA: 'Demo Provider A',
    mockProviderB: 'Demo Provider B',
  };
}

/**
 * Generate a new match
 *
 * This is the main entry point for match generation:
 * 1. Select a random prompt from the category
 * 2. Select two providers using weighted random selection
 * 3. Call both providers in parallel with timeout
 * 4. Store response audio files
 * 5. Create match record in database
 * 6. Return match info with randomized A/B assignment
 *
 * @param category - The category for the match
 * @param timeoutMs - Timeout for provider calls (default: 30000)
 * @returns Generated match or error
 */
export async function generateMatch(
  category: Category,
  timeoutMs: number = 30000
): Promise<GenerateMatchResult> {
  try {
    // Check if we have any active providers
    const providerCount = await getActiveProviderCount();
    
    if (providerCount === 0) {
      // No providers configured - return mock match for demo
      console.log('[Arena] No providers configured, returning mock match');
      return {
        success: true,
        match: createMockMatch(category),
      };
    }

    if (providerCount < 2) {
      return {
        success: false,
        error: {
          error: 'Not enough active providers for a match',
          code: 'NO_PROVIDERS',
          details: `Need at least 2 providers, found ${providerCount}`,
        },
      };
    }

    // Select providers
    const selectedProviders = await selectProviders(category);
    if (!selectedProviders) {
      return {
        success: false,
        error: {
          error: 'Failed to select providers',
          code: 'NO_PROVIDERS',
        },
      };
    }

    // Get full provider configs (with API keys)
    const providerARaw = await getProviderRaw(selectedProviders.providerA.id);
    const providerBRaw = await getProviderRaw(selectedProviders.providerB.id);
    
    if (!providerARaw || !providerBRaw) {
      return {
        success: false,
        error: {
          error: 'Provider data not found',
          code: 'INTERNAL_ERROR',
        },
      };
    }

    // Select a prompt
    const prompt = await selectRandomPrompt(category);
    if (!prompt) {
      return {
        success: false,
        error: {
          error: 'No prompts available for the selected category',
          code: 'NO_PROMPTS',
          details: `Category: ${category}`,
        },
      };
    }

    // Load prompt audio if available
    const promptAudioBuffer = await loadPromptAudio(prompt.audioUrl);

    // Generate match ID
    const matchId = randomUUID();

    // Call both providers in parallel with timeout
    const [resultA, resultB] = await Promise.all([
      callProvider(providerARaw, prompt.text, promptAudioBuffer, timeoutMs),
      callProvider(providerBRaw, prompt.text, promptAudioBuffer, timeoutMs),
    ]);

    // Check for failures
    if (!resultA.success && !resultB.success) {
      return {
        success: false,
        error: {
          error: 'Both providers failed to generate responses',
          code: 'PROVIDER_FAILURE',
          details: `Provider A: ${resultA.error}, Provider B: ${resultB.error}`,
        },
      };
    }

    // If one provider failed, we could still return the match with a forfeit
    // For now, we require both to succeed
    if (!resultA.success || !resultA.response) {
      return {
        success: false,
        error: {
          error: `Provider ${providerARaw.name} failed`,
          code: 'PROVIDER_FAILURE',
          details: resultA.error,
        },
      };
    }

    if (!resultB.success || !resultB.response) {
      return {
        success: false,
        error: {
          error: `Provider ${providerBRaw.name} failed`,
          code: 'PROVIDER_FAILURE',
          details: resultB.error,
        },
      };
    }

    // Save audio files
    const [audioUrlA, audioUrlB] = await Promise.all([
      saveAudioFile(resultA.response.audioBuffer, resultA.response.mimeType, matchId, 'a'),
      saveAudioFile(resultB.response.audioBuffer, resultB.response.mimeType, matchId, 'b'),
    ]);

    // Randomize A/B assignment (50% chance to swap)
    const shouldSwap = Math.random() < 0.5;
    const finalProviderAId = shouldSwap ? providerBRaw.id : providerARaw.id;
    const finalProviderBId = shouldSwap ? providerARaw.id : providerBRaw.id;
    const finalResponseAUrl = shouldSwap ? audioUrlB : audioUrlA;
    const finalResponseBUrl = shouldSwap ? audioUrlA : audioUrlB;
    const finalLatencyA = shouldSwap ? resultB.latencyMs : resultA.latencyMs;
    const finalLatencyB = shouldSwap ? resultA.latencyMs : resultB.latencyMs;

    // Create match record in database
    const now = new Date();
    await db.insert(matches).values({
      id: matchId,
      promptId: prompt.id,
      category: prompt.category,
      providerAId: String(finalProviderAId),
      providerBId: String(finalProviderBId),
      responseAUrl: finalResponseAUrl,
      responseBUrl: finalResponseBUrl,
      responseALatency: finalLatencyA,
      responseBLatency: finalLatencyB,
      createdAt: now,
      status: 'pending',
    });

    // Return match info
    return {
      success: true,
      match: {
        matchId,
        prompt: {
          id: prompt.id,
          text: prompt.text,
          category: prompt.category,
          audioUrl: prompt.audioUrl,
        },
        responseA: {
          url: finalResponseAUrl,
          latencyMs: finalLatencyA,
        },
        responseB: {
          url: finalResponseBUrl,
          latencyMs: finalLatencyB,
        },
        createdAt: now,
      },
    };
  } catch (error) {
    console.error('[Arena] Match generation error:', error);
    
    return {
      success: false,
      error: {
        error: 'Internal error during match generation',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Get a match by ID
 */
export async function getMatch(matchId: string) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId));

  return match ?? null;
}
