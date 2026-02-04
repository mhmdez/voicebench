/**
 * Arena Service
 *
 * Business logic for arena match generation.
 * Handles prompt selection, provider calls, and match creation.
 */

import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { promises as fs } from 'fs';
import path from 'path';
import { db, matches, prompts } from '@/db';
import type { Category } from '@/types/prompt';
import type { Provider } from '@/types/provider';
import {
  selectProviderExcluding,
  selectProviders,
  getActiveProviderCount,
} from './matchmaking';
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
const AUDIO_RETENTION_MS = 1000 * 60 * 60 * 24;
const AUDIO_CLEANUP_SAMPLE_RATE = 0.1;

/**
 * Ensure audio directory exists
 */
async function ensureAudioDir(): Promise<void> {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
}

/**
 * Clean up old response audio files to keep storage temporary.
 */
async function cleanupOldResponseAudio(): Promise<void> {
  if (Math.random() > AUDIO_CLEANUP_SAMPLE_RATE) {
    return;
  }

  try {
    const files = await fs.readdir(AUDIO_DIR);
    const now = Date.now();

    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(AUDIO_DIR, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtimeMs > AUDIO_RETENTION_MS) {
          await fs.unlink(filePath);
        }
      })
    );
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return;
    }

    console.warn('[Arena] Failed to cleanup response audio:', error);
  }
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
 * Create a mock match for demo/testing purposes.
 * Pulls a random prompt from the database when available,
 * falling back to hardcoded prompts only if the DB is empty.
 */
async function createMockMatch(category: Category): Promise<MockMatch> {
  const matchId = randomUUID();

  // Try to fetch a random prompt from the DB for this category
  let promptId = `mock-prompt-${category}`;
  let promptText = '';
  let promptCategory: Category = category;

  const dbPrompt = await selectRandomPrompt(category);
  if (dbPrompt) {
    promptId = dbPrompt.id;
    promptText = dbPrompt.text;
    promptCategory = dbPrompt.category as Category;
  } else {
    // Fallback prompts if DB is empty
    const fallbackPrompts: Record<Category, string> = {
      'general': 'Hello! How are you doing today?',
      'customer-support': 'I need help with my order. It arrived damaged.',
      'information-retrieval': 'What is the capital of France?',
      'creative': 'Tell me a short story about a robot learning to paint.',
      'multilingual': 'Can you greet me in Spanish, French, and Japanese?',
    };
    promptText = fallbackPrompts[category];
  }

  return {
    matchId,
    prompt: {
      id: promptId,
      text: promptText,
      category: promptCategory,
      audioUrl: null,
    },
    responseA: {
      url: '/audio/mock/demo-response-a.mp3',
      latencyMs: 600 + Math.floor(Math.random() * 600),
    },
    responseB: {
      url: '/audio/mock/demo-response-b.mp3',
      latencyMs: 600 + Math.floor(Math.random() * 600),
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
        match: await createMockMatch(category),
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

    // Get full provider configs (with API keys)
    let providerARaw = await getProviderRaw(selectedProviders.providerA.id);
    let providerBRaw = await getProviderRaw(selectedProviders.providerB.id);

    const failedProviderIds = new Set<number>();

    let resultA = providerARaw
      ? await callProvider(providerARaw, prompt.text, promptAudioBuffer, timeoutMs)
      : {
          success: false,
          providerId: selectedProviders.providerA.id,
          error: 'Provider data not found',
          latencyMs: 0,
        };

    let resultB = providerBRaw
      ? await callProvider(providerBRaw, prompt.text, promptAudioBuffer, timeoutMs)
      : {
          success: false,
          providerId: selectedProviders.providerB.id,
          error: 'Provider data not found',
          latencyMs: 0,
        };

    // Check for failures
    if (!resultA.success && !resultB.success) {
      // Fall back to demo mode when both providers fail (e.g. invalid API keys)
      console.log('[Arena] Both providers failed, falling back to demo mode');
      return {
        success: true,
        match: await createMockMatch(category),
      };
    }

    // If one provider failed, attempt to re-pair with another provider.
    while (!resultA.success || !resultA.response || !resultB.success || !resultB.response) {
      const resultAOk = resultA.success && !!resultA.response;
      const failedResult = resultAOk ? resultB : resultA;
      const successfulResult = resultAOk ? resultA : resultB;
      const successfulProvider = resultAOk ? providerARaw : providerBRaw;

      if (!successfulProvider || !successfulResult.response) {
        return {
          success: false,
          error: {
            error: 'Provider data not found',
            code: 'INTERNAL_ERROR',
          },
        };
      }

      failedProviderIds.add(failedResult.providerId);

      const replacement = await selectProviderExcluding(category, [
        ...failedProviderIds,
        successfulProvider.id,
      ]);

      if (!replacement) {
        return {
          success: false,
          error: {
            error: 'No replacement provider available',
            code: 'PROVIDER_FAILURE',
            details: failedResult.error,
          },
        };
      }

      const replacementRaw = await getProviderRaw(replacement.id);
      if (!replacementRaw) {
        failedProviderIds.add(replacement.id);
        continue;
      }

      const replacementResult = await callProvider(
        replacementRaw,
        prompt.text,
        promptAudioBuffer,
        timeoutMs
      );

      if (!replacementResult.success || !replacementResult.response) {
        failedProviderIds.add(replacementRaw.id);
        continue;
      }

      if (resultAOk) {
        providerBRaw = replacementRaw;
        resultB = replacementResult;
      } else {
        providerARaw = replacementRaw;
        resultA = replacementResult;
      }
    }

    if (!providerARaw || !providerBRaw) {
      return {
        success: false,
        error: {
          error: 'Provider data not found',
          code: 'INTERNAL_ERROR',
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

    await cleanupOldResponseAudio();

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
