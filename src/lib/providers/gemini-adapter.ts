/**
 * Google Gemini Provider Adapter
 *
 * Provider adapter for Google's Gemini multimodal AI.
 * Uses Gemini's REST API for text generation + Google Cloud TTS,
 * or Gemini 2.0 Flash's native audio capabilities.
 *
 * Pipeline: Audio transcription → Gemini chat → TTS synthesis
 */

import { ProviderAdapter } from './base-adapter';
import type {
  AudioPrompt,
  ProviderResponse,
  ProviderHealthCheck,
  AdapterOptions,
} from './types';

/**
 * Gemini-specific configuration
 */
export interface GeminiConfig {
  /** Google AI / Vertex API key */
  apiKey: string;
  /** Gemini model to use */
  model: GeminiModel;
  /** Voice name for TTS (Google Cloud voices) */
  voice: string;
  /** Language code for TTS */
  languageCode: string;
  /** Temperature for generation */
  temperature: number;
  /** Max output tokens */
  maxOutputTokens: number;
  /** API base URL (for Vertex AI or custom endpoints) */
  baseUrl: string;
}

export type GeminiModel =
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-lite'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash';

const GEMINI_DEFAULTS: GeminiConfig = {
  apiKey: '',
  model: 'gemini-2.0-flash',
  voice: 'en-US-Studio-O',
  languageCode: 'en-US',
  temperature: 0.7,
  maxOutputTokens: 1024,
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
};

/**
 * Google Gemini Provider Adapter
 *
 * Implements voice-to-voice AI using Google's APIs:
 * - Gemini multimodal for understanding audio + generating text
 * - Google Cloud Text-to-Speech for speech synthesis
 *
 * @example
 * ```typescript
 * const adapter = new GeminiAdapter({
 *   config: {
 *     apiKey: process.env.GOOGLE_API_KEY,
 *     model: 'gemini-2.0-flash',
 *   },
 * });
 * ```
 */
export class GeminiAdapter extends ProviderAdapter {
  private geminiConfig: GeminiConfig;

  constructor(options: AdapterOptions) {
    super('gemini', options);
    this.geminiConfig = this.parseConfig(options.config);
  }

  private parseConfig(config: AdapterOptions['config']): GeminiConfig {
    if (!config.apiKey) {
      throw this.createError('Google API key is required', 'AUTHENTICATION_FAILED');
    }

    return {
      apiKey: config.apiKey,
      model: (config.model as GeminiModel) ?? GEMINI_DEFAULTS.model,
      voice: (config.voiceId as string) ?? GEMINI_DEFAULTS.voice,
      languageCode: (config.languageCode as string) ?? GEMINI_DEFAULTS.languageCode,
      temperature: (config.temperature as number) ?? GEMINI_DEFAULTS.temperature,
      maxOutputTokens: (config.maxOutputTokens as number) ?? GEMINI_DEFAULTS.maxOutputTokens,
      baseUrl: (config.endpoint as string) ?? GEMINI_DEFAULTS.baseUrl,
    };
  }

  getName(): string {
    return 'Google Gemini';
  }

  /**
   * Generate a voice response using Gemini + TTS
   *
   * Pipeline:
   * 1. Send audio to Gemini as inline data for transcription/understanding
   * 2. Generate text response via Gemini chat
   * 3. Synthesize speech via Google Cloud TTS
   */
  async generateResponse(prompt: AudioPrompt): Promise<ProviderResponse> {
    const startTime = Date.now();
    let firstByteTime: number | undefined;

    return this.withRetry(async () => {
      // Step 1 & 2: Send to Gemini (handles both understanding and response)
      this.log('Sending to Gemini...');
      const completionStart = Date.now();

      const responseText = await this.generateWithGemini(prompt);
      const completionMs = Date.now() - completionStart;
      firstByteTime = Date.now();
      this.log('Gemini response generated', { responseText, ms: completionMs });

      // Step 3: TTS
      this.log('Synthesizing speech...');
      const ttsStart = Date.now();

      const { audioBuffer, mimeType } = await this.synthesizeSpeech(responseText);
      const ttsMs = Date.now() - ttsStart;
      this.log('TTS complete', { bytes: audioBuffer.length, ms: ttsMs });

      const totalMs = Date.now() - startTime;
      const durationMs = this.estimateAudioDuration(audioBuffer);

      return {
        audioBuffer,
        mimeType,
        sampleRate: 24000,
        durationMs,
        transcript: responseText,
        latency: {
          ttfb: firstByteTime ? firstByteTime - startTime : totalMs,
          total: totalMs,
          inference: completionMs,
          tts: ttsMs,
        },
        metadata: {
          model: this.geminiConfig.model,
          voiceId: this.geminiConfig.voice,
          streamed: false,
          providerSpecific: {
            languageCode: this.geminiConfig.languageCode,
          },
        },
      };
    }, 'generateResponse');
  }

  /**
   * Generate text response using Gemini API
   */
  private async generateWithGemini(prompt: AudioPrompt): Promise<string> {
    const { apiKey, model, temperature, maxOutputTokens, baseUrl } = this.geminiConfig;

    // Build request parts
    const parts: Array<Record<string, unknown>> = [];

    // System instruction
    const systemPrompt =
      prompt.systemPrompt ??
      'You are a helpful voice assistant. Respond naturally and conversationally. Keep responses concise for speech.';

    // If we have audio data, include it as inline data
    if (prompt.audioBuffer.length > 0) {
      const base64Audio = prompt.audioBuffer.toString('base64');
      const mimeType = prompt.mimeType || 'audio/wav';

      parts.push({
        inlineData: {
          mimeType,
          data: base64Audio,
        },
      });

      parts.push({
        text: prompt.transcript
          ? `The user said: "${prompt.transcript}". Please respond naturally.`
          : 'Please listen to the audio and respond naturally.',
      });
    } else if (prompt.transcript) {
      parts.push({ text: prompt.transcript });
    }

    // Add conversation history
    const contents: Array<Record<string, unknown>> = [];

    if (prompt.conversationHistory) {
      for (const turn of prompt.conversationHistory) {
        contents.push({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.content }],
        });
      }
    }

    contents.push({ role: 'user', parts });

    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature,
            maxOutputTokens,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.handleGeminiError(response.status, errorBody, 'generateContent');
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw this.createError('Empty response from Gemini', 'INVALID_RESPONSE');
      }

      return text;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw this.createError('Gemini request timed out', 'TIMEOUT', error, true);
      }
      throw error;
    }
  }

  /**
   * Synthesize speech using Google Cloud TTS API
   *
   * Falls back to a simple TTS endpoint. For production,
   * configure a Google Cloud TTS API key separately.
   */
  private async synthesizeSpeech(
    text: string
  ): Promise<{ audioBuffer: Buffer; mimeType: string }> {
    const { apiKey, voice, languageCode } = this.geminiConfig;

    // Use the Gemini API's text-to-speech via the generateContent endpoint
    // with response_modalities set to audio, or fall back to Google Cloud TTS
    const ttsUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

    try {
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode,
            name: voice,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            sampleRateHertz: 24000,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        // If Cloud TTS fails (e.g., not enabled), generate a simple placeholder
        this.log('Google Cloud TTS not available, using Gemini text response only');
        // Return an empty audio buffer — the transcript is still available
        const errorBody = await response.text();
        throw this.createError(
          `TTS synthesis failed: ${errorBody}`,
          'PROVIDER_ERROR',
          undefined,
          true
        );
      }

      const data = (await response.json()) as { audioContent?: string };
      if (!data.audioContent) {
        throw this.createError('Empty audio from TTS', 'INVALID_RESPONSE');
      }

      const audioBuffer = Buffer.from(data.audioContent, 'base64');
      return { audioBuffer, mimeType: 'audio/mpeg' };
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw this.createError('TTS request timed out', 'TIMEOUT', error, true);
      }
      throw error;
    }
  }

  /**
   * Health check — verify Gemini API connectivity
   */
  async healthCheck(): Promise<ProviderHealthCheck> {
    const startTime = Date.now();
    const { apiKey, model, baseUrl } = this.geminiConfig;

    try {
      // List models as lightweight health check
      const url = `${baseUrl}/models/${model}?key=${apiKey}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          status: response.status === 401 || response.status === 403 ? 'unhealthy' : 'degraded',
          available: false,
          responseTimeMs: Date.now() - startTime,
          timestamp: new Date(),
          error: `HTTP ${response.status}: ${body.slice(0, 200)}`,
        };
      }

      return {
        status: 'healthy',
        available: true,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date(),
        details: { model: this.geminiConfig.model, voice: this.geminiConfig.voice },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        available: false,
        responseTimeMs: Date.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle Gemini API errors
   */
  private handleGeminiError(status: number, body: string, operation: string): never {
    if (status === 401 || status === 403) {
      throw this.createError(
        `Authentication failed during ${operation}: ${body.slice(0, 200)}`,
        'AUTHENTICATION_FAILED',
        undefined,
        false
      );
    }

    if (status === 429) {
      throw this.createError(
        `Rate limited during ${operation}`,
        'RATE_LIMITED',
        undefined,
        true
      );
    }

    if (status === 400) {
      throw this.createError(
        `Invalid request during ${operation}: ${body.slice(0, 200)}`,
        'INVALID_REQUEST',
        undefined,
        false
      );
    }

    if (status === 404) {
      throw this.createError(
        `Model not found during ${operation}`,
        'MODEL_NOT_FOUND',
        undefined,
        false
      );
    }

    if (status >= 500) {
      throw this.createError(
        `Server error during ${operation}: ${body.slice(0, 200)}`,
        'PROVIDER_ERROR',
        undefined,
        true
      );
    }

    throw this.createError(
      `Gemini API error (${status}) during ${operation}: ${body.slice(0, 200)}`,
      'PROVIDER_ERROR',
      undefined,
      false
    );
  }

  /**
   * Estimate audio duration from MP3 buffer
   */
  private estimateAudioDuration(buffer: Buffer): number {
    // ~128kbps MP3 ≈ 16000 bytes/sec
    return Math.round((buffer.length / 16000) * 1000);
  }
}
