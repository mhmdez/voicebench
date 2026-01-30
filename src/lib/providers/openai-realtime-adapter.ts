/**
 * OpenAI Realtime Provider Adapter
 *
 * Provider adapter for OpenAI's voice capabilities.
 * Uses a pipeline approach: Whisper (STT) → GPT-4o → TTS
 *
 * This is the reference implementation for VoiceBench providers.
 */

import OpenAI from 'openai';
import { ProviderAdapter } from './base-adapter';
import type {
  AudioPrompt,
  ProviderResponse,
  ProviderHealthCheck,
  AdapterOptions,
} from './types';
import {
  type OpenAIConfig,
  type OpenAIVoice,
  type OpenAIModel,
  type OpenAITTSModel,
  type OpenAIAudioFormat,
  type OpenAIPipelineTiming,
  OPENAI_DEFAULTS,
  AUDIO_FORMAT_MIME_TYPES,
  AUDIO_FORMAT_SAMPLE_RATES,
} from './openai-realtime-types';

/**
 * OpenAI Realtime Provider Adapter
 *
 * Implements voice-to-voice AI using OpenAI's APIs:
 * - Whisper for speech-to-text
 * - GPT-4o for conversation/response generation
 * - TTS for text-to-speech
 *
 * @example
 * ```typescript
 * const adapter = new OpenAIRealtimeAdapter({
 *   config: {
 *     apiKey: process.env.OPENAI_API_KEY,
 *     model: 'gpt-4o',
 *     voiceId: 'nova',
 *   },
 * });
 *
 * const response = await adapter.generateResponse({
 *   audioBuffer: audioData,
 *   mimeType: 'audio/wav',
 * });
 * ```
 */
export class OpenAIRealtimeAdapter extends ProviderAdapter {
  private client: OpenAI;
  private openaiConfig: OpenAIConfig;

  constructor(options: AdapterOptions) {
    super('openai', options);

    // Extract OpenAI-specific config
    this.openaiConfig = this.parseConfig(options.config);

    // Initialize OpenAI client
    this.client = new OpenAI({
      apiKey: this.openaiConfig.apiKey,
      organization: this.openaiConfig.organizationId,
    });
  }

  /**
   * Parse and validate provider config into OpenAI-specific config
   */
  private parseConfig(config: AdapterOptions['config']): OpenAIConfig {
    if (!config.apiKey) {
      throw this.createError(
        'OpenAI API key is required',
        'AUTHENTICATION_FAILED'
      );
    }

    return {
      apiKey: config.apiKey,
      model: (config.model as OpenAIModel) ?? OPENAI_DEFAULTS.model,
      voice: (config.voiceId as OpenAIVoice) ?? OPENAI_DEFAULTS.voice,
      ttsModel: (config.ttsModel as OpenAITTSModel) ?? OPENAI_DEFAULTS.ttsModel,
      whisperModel: OPENAI_DEFAULTS.whisperModel,
      organizationId: config.organizationId as string | undefined,
      audioFormat: (config.audioFormat as OpenAIAudioFormat) ?? OPENAI_DEFAULTS.audioFormat,
      temperature: (config.temperature as number) ?? OPENAI_DEFAULTS.temperature,
      maxTokens: (config.maxTokens as number) ?? OPENAI_DEFAULTS.maxTokens,
    };
  }

  /**
   * Get the display name of this provider
   */
  getName(): string {
    return 'OpenAI Realtime';
  }

  /**
   * Generate a voice response from an audio prompt
   *
   * Pipeline:
   * 1. Transcribe input audio using Whisper
   * 2. Generate response using GPT-4o
   * 3. Convert response to speech using TTS
   */
  async generateResponse(prompt: AudioPrompt): Promise<ProviderResponse> {
    const startTime = Date.now();
    let firstByteTime: number | undefined;
    const timing: OpenAIPipelineTiming = {
      transcriptionMs: 0,
      completionMs: 0,
      ttsMs: 0,
      totalMs: 0,
    };

    return this.withRetry(async () => {
      // Step 1: Transcribe audio to text
      this.log('Starting transcription...');
      const transcriptionStart = Date.now();
      
      const transcript = prompt.transcript ?? await this.transcribeAudio(prompt);
      timing.transcriptionMs = Date.now() - transcriptionStart;
      this.log('Transcription complete', { transcript, ms: timing.transcriptionMs });

      // Step 2: Generate response text
      this.log('Generating response...');
      const completionStart = Date.now();
      
      const { content: responseText, usage } = await this.generateCompletion(
        transcript,
        prompt.systemPrompt,
        prompt.conversationHistory
      );
      timing.completionMs = Date.now() - completionStart;
      firstByteTime = Date.now(); // Mark when we have the response ready
      this.log('Response generated', { responseText, ms: timing.completionMs });

      // Step 3: Convert to speech
      this.log('Converting to speech...');
      const ttsStart = Date.now();
      
      const { audioBuffer, mimeType } = await this.textToSpeech(responseText);
      timing.ttsMs = Date.now() - ttsStart;
      this.log('TTS complete', { bytes: audioBuffer.length, ms: timing.ttsMs });

      timing.totalMs = Date.now() - startTime;

      // Calculate audio duration (approximate for MP3)
      const sampleRate = AUDIO_FORMAT_SAMPLE_RATES[this.openaiConfig.audioFormat!];
      const durationMs = this.estimateAudioDuration(audioBuffer, mimeType);

      return {
        audioBuffer,
        mimeType,
        sampleRate,
        durationMs,
        transcript: responseText,
        latency: {
          ttfb: firstByteTime ? firstByteTime - startTime : timing.totalMs,
          total: timing.totalMs,
          audioProcessing: timing.transcriptionMs,
          inference: timing.completionMs,
          tts: timing.ttsMs,
        },
        metadata: {
          model: this.openaiConfig.model,
          voiceId: this.openaiConfig.voice,
          streamed: false,
          tokenUsage: usage ? {
            inputTokens: usage.promptTokens,
            outputTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          } : undefined,
          providerSpecific: {
            pipelineTiming: timing,
            ttsModel: this.openaiConfig.ttsModel,
            whisperModel: this.openaiConfig.whisperModel,
            inputTranscript: transcript,
          },
        },
      };
    }, 'generateResponse');
  }

  /**
   * Transcribe audio using Whisper
   */
  private async transcribeAudio(prompt: AudioPrompt): Promise<string> {
    try {
      // OpenAI SDK accepts a File object - we need to create one properly
      // Using toFile helper from openai SDK for proper compatibility
      const audioFile = await OpenAI.toFile(
        prompt.audioBuffer,
        `audio.${this.getExtensionFromMime(prompt.mimeType)}`,
        { type: prompt.mimeType }
      );

      const transcription = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: this.openaiConfig.whisperModel!,
        response_format: 'json',
      });

      return transcription.text;
    } catch (error) {
      throw this.handleOpenAIError(error, 'transcription');
    }
  }

  /**
   * Generate a chat completion response
   */
  private async generateCompletion(
    userMessage: string,
    systemPrompt?: string,
    conversationHistory?: AudioPrompt['conversationHistory']
  ): Promise<{ content: string; usage?: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      // Add conversation history if provided
      if (conversationHistory) {
        for (const turn of conversationHistory) {
          messages.push({
            role: turn.role,
            content: turn.content,
          });
        }
      }

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      const completion = await this.client.chat.completions.create({
        model: this.openaiConfig.model!,
        messages,
        temperature: this.openaiConfig.temperature,
        max_tokens: this.openaiConfig.maxTokens,
      });

      const content = completion.choices[0]?.message?.content ?? '';
      const usage = completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      } : undefined;

      return { content, usage };
    } catch (error) {
      throw this.handleOpenAIError(error, 'completion');
    }
  }

  /**
   * Convert text to speech using OpenAI TTS
   */
  private async textToSpeech(text: string): Promise<{ audioBuffer: Buffer; mimeType: string }> {
    try {
      const response = await this.client.audio.speech.create({
        model: this.openaiConfig.ttsModel!,
        voice: this.openaiConfig.voice!,
        input: text,
        response_format: this.openaiConfig.audioFormat,
      });

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      const mimeType = AUDIO_FORMAT_MIME_TYPES[this.openaiConfig.audioFormat!];

      return { audioBuffer, mimeType };
    } catch (error) {
      throw this.handleOpenAIError(error, 'tts');
    }
  }

  /**
   * Perform a health check on the OpenAI API
   */
  async healthCheck(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();

    try {
      // Use models list as a lightweight health check
      await this.client.models.list();

      return {
        status: 'healthy',
        available: true,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date(),
        details: {
          model: this.openaiConfig.model,
          voice: this.openaiConfig.voice,
        },
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Determine if it's an auth error vs a transient error
      const isAuthError = error instanceof OpenAI.AuthenticationError;

      return {
        status: isAuthError ? 'unhealthy' : 'degraded',
        available: false,
        responseTimeMs,
        timestamp: new Date(),
        error: errorMessage,
        details: {
          errorType: error instanceof OpenAI.APIError ? error.type : 'unknown',
        },
      };
    }
  }

  /**
   * Handle OpenAI API errors and convert to ProviderError
   */
  private handleOpenAIError(error: unknown, operation: string): never {
    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status;

      // Map status codes to error types
      if (statusCode === 401) {
        throw this.createError(
          `Authentication failed during ${operation}: ${error.message}`,
          'AUTHENTICATION_FAILED',
          error,
          false
        );
      }

      if (statusCode === 429) {
        throw this.createError(
          `Rate limited during ${operation}: ${error.message}`,
          'RATE_LIMITED',
          error,
          true // Retryable
        );
      }

      if (statusCode === 400) {
        throw this.createError(
          `Invalid request during ${operation}: ${error.message}`,
          'INVALID_REQUEST',
          error,
          false
        );
      }

      if (statusCode === 404) {
        throw this.createError(
          `Model not found during ${operation}: ${error.message}`,
          'MODEL_NOT_FOUND',
          error,
          false
        );
      }

      if (statusCode && statusCode >= 500) {
        throw this.createError(
          `Provider error during ${operation}: ${error.message}`,
          'PROVIDER_ERROR',
          error,
          true // Server errors are retryable
        );
      }

      // Generic API error
      throw this.createError(
        `OpenAI API error during ${operation}: ${error.message}`,
        'PROVIDER_ERROR',
        error,
        false
      );
    }

    // Network or other errors
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        throw this.createError(
          `Timeout during ${operation}: ${error.message}`,
          'TIMEOUT',
          error,
          true
        );
      }

      if (error.message.includes('ECONNREFUSED') || error.message.includes('network')) {
        throw this.createError(
          `Network error during ${operation}: ${error.message}`,
          'NETWORK_ERROR',
          error,
          true
        );
      }

      throw this.createError(
        `Unknown error during ${operation}: ${error.message}`,
        'UNKNOWN',
        error,
        false
      );
    }

    throw this.createError(
      `Unknown error during ${operation}`,
      'UNKNOWN',
      undefined,
      false
    );
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMime(mimeType: string): string {
    const mimeMap: Record<string, string> = {
      'audio/wav': 'wav',
      'audio/wave': 'wav',
      'audio/x-wav': 'wav',
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/mp4': 'm4a',
      'audio/m4a': 'm4a',
      'audio/ogg': 'ogg',
      'audio/webm': 'webm',
      'audio/flac': 'flac',
    };
    return mimeMap[mimeType] ?? 'wav';
  }

  /**
   * Estimate audio duration from buffer (approximate)
   * For accurate duration, would need to parse the actual audio format
   */
  private estimateAudioDuration(buffer: Buffer, mimeType: string): number {
    // Rough estimates based on typical bitrates
    const bytesPerSecond: Record<string, number> = {
      'audio/mpeg': 16000,    // ~128kbps MP3
      'audio/opus': 8000,     // ~64kbps Opus
      'audio/aac': 16000,     // ~128kbps AAC
      'audio/flac': 88200,    // ~705kbps FLAC
      'audio/wav': 48000,     // 24kHz 16-bit mono
      'audio/pcm': 48000,     // 24kHz 16-bit mono
    };

    const bps = bytesPerSecond[mimeType] ?? 16000;
    return Math.round((buffer.length / bps) * 1000);
  }
}
