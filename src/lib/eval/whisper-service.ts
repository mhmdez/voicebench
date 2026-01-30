/**
 * Whisper Transcription Service
 *
 * Integrates with OpenAI's Whisper API for audio-to-text transcription.
 * Used to transcribe voice AI responses for evaluation against expected outputs.
 */

import OpenAI from 'openai';
import type { TranscriptionVerbose } from 'openai/resources/audio/transcriptions';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Supported languages for transcription
 * ISO 639-1 language codes
 */
export type SupportedLanguage =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'nl' // Dutch
  | 'ru' // Russian
  | 'zh' // Chinese
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'ar'; // Arabic

/**
 * Options for transcription
 */
export interface TranscriptionOptions {
  /** Language of the audio (ISO 639-1 code). If not provided, Whisper auto-detects. */
  language?: SupportedLanguage;
  /** Optional prompt to guide transcription (e.g., proper nouns, technical terms) */
  prompt?: string;
  /** Temperature for sampling (0-1). Lower = more deterministic. Default: 0 */
  temperature?: number;
  /** Response format. Default: 'text' */
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
}

/**
 * Result of a transcription operation
 */
export interface TranscriptionResult {
  /** The transcribed text */
  text: string;
  /** Detected or specified language */
  language?: string;
  /** Duration of the audio in seconds (if available) */
  duration?: number;
  /** Whether the transcription was successful */
  success: true;
}

/**
 * Error result from transcription
 */
export interface TranscriptionError {
  /** Error occurred */
  success: false;
  /** Error message */
  error: string;
  /** Error code for programmatic handling */
  code: 'INVALID_AUDIO' | 'API_ERROR' | 'FILE_NOT_FOUND' | 'UNSUPPORTED_FORMAT' | 'RATE_LIMITED';
}

/**
 * Union type for transcription outcomes
 */
export type TranscriptionOutcome = TranscriptionResult | TranscriptionError;

/**
 * Supported audio formats for Whisper API
 */
const SUPPORTED_FORMATS = [
  'audio/flac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/mpga',
  'audio/oga',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
];

/**
 * File extension to MIME type mapping
 */
const EXTENSION_TO_MIME: Record<string, string> = {
  '.flac': 'audio/flac',
  '.m4a': 'audio/m4a',
  '.mp3': 'audio/mp3',
  '.mp4': 'audio/mp4',
  '.mpeg': 'audio/mpeg',
  '.mpga': 'audio/mpga',
  '.oga': 'audio/oga',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
};

/**
 * WhisperService class for audio transcription
 */
export class WhisperService {
  private client: OpenAI;
  private model: string;

  /**
   * Create a new WhisperService instance
   * @param apiKey - OpenAI API key. Defaults to OPENAI_API_KEY env var.
   * @param model - Whisper model to use. Default: 'whisper-1'
   */
  constructor(apiKey?: string, model: string = 'whisper-1') {
    this.client = new OpenAI({
      apiKey: apiKey ?? process.env.OPENAI_API_KEY,
    });
    this.model = model;
  }

  /**
   * Transcribe an audio file from disk
   * @param filePath - Path to the audio file
   * @param options - Transcription options
   */
  async transcribeFile(
    filePath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionOutcome> {
    try {
      // Check file exists
      try {
        await fs.access(filePath);
      } catch {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          code: 'FILE_NOT_FOUND',
        };
      }

      // Validate file extension
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = EXTENSION_TO_MIME[ext];
      if (!mimeType) {
        return {
          success: false,
          error: `Unsupported audio format: ${ext}. Supported: ${Object.keys(EXTENSION_TO_MIME).join(', ')}`,
          code: 'UNSUPPORTED_FORMAT',
        };
      }

      // Read file and transcribe
      const audioBuffer = await fs.readFile(filePath);
      return this.transcribeBuffer(audioBuffer, mimeType, path.basename(filePath), options);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Transcribe an audio buffer
   * @param buffer - Audio data buffer
   * @param mimeType - MIME type of the audio (e.g., 'audio/wav')
   * @param filename - Optional filename for the audio (helps Whisper infer format)
   * @param options - Transcription options
   */
  async transcribeBuffer(
    buffer: Buffer,
    mimeType: string,
    filename: string = 'audio.wav',
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionOutcome> {
    try {
      // Validate MIME type
      if (!SUPPORTED_FORMATS.includes(mimeType)) {
        return {
          success: false,
          error: `Unsupported MIME type: ${mimeType}. Supported: ${SUPPORTED_FORMATS.join(', ')}`,
          code: 'UNSUPPORTED_FORMAT',
        };
      }

      // Validate buffer
      if (!buffer || buffer.length === 0) {
        return {
          success: false,
          error: 'Audio buffer is empty',
          code: 'INVALID_AUDIO',
        };
      }

      // Create a File object from the buffer for OpenAI SDK
      // Use Uint8Array to ensure compatibility
      const file = new File([new Uint8Array(buffer)], filename, { type: mimeType });

      // Call Whisper API with verbose_json format for metadata
      const response: TranscriptionVerbose = await this.client.audio.transcriptions.create({
        file,
        model: this.model,
        language: options.language,
        prompt: options.prompt,
        temperature: options.temperature ?? 0,
        response_format: 'verbose_json',
      });

      // verbose_json format returns full transcription object with metadata
      return {
        success: true,
        text: response.text.trim(),
        language: response.language,
        duration: response.duration,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Transcribe from a URL (downloads then transcribes)
   * @param url - URL to the audio file
   * @param options - Transcription options
   */
  async transcribeUrl(
    url: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionOutcome> {
    try {
      // Fetch the audio
      const response = await fetch(url);
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch audio from URL: ${response.status} ${response.statusText}`,
          code: 'INVALID_AUDIO',
        };
      }

      const contentType = response.headers.get('content-type') ?? 'audio/wav';
      const mimeType = contentType.split(';')[0].trim();
      
      // Extract filename from URL or use default
      const urlPath = new URL(url).pathname;
      const filename = path.basename(urlPath) || 'audio.wav';

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return this.transcribeBuffer(buffer, mimeType, filename, options);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Handle errors from the Whisper API
   */
  private handleError(error: unknown): TranscriptionError {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        return {
          success: false,
          error: 'Rate limited by OpenAI API. Please retry later.',
          code: 'RATE_LIMITED',
        };
      }
      return {
        success: false,
        error: `OpenAI API error: ${error.message}`,
        code: 'API_ERROR',
      };
    }

    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        code: 'API_ERROR',
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred during transcription',
      code: 'API_ERROR',
    };
  }
}

/**
 * Create a singleton instance with default configuration
 */
let defaultInstance: WhisperService | null = null;

/**
 * Get the default WhisperService instance
 * Uses OPENAI_API_KEY from environment
 */
export function getWhisperService(): WhisperService {
  if (!defaultInstance) {
    defaultInstance = new WhisperService();
  }
  return defaultInstance;
}

/**
 * Convenience function to transcribe a file
 */
export async function transcribeFile(
  filePath: string,
  options?: TranscriptionOptions
): Promise<TranscriptionOutcome> {
  return getWhisperService().transcribeFile(filePath, options);
}

/**
 * Convenience function to transcribe a buffer
 */
export async function transcribeBuffer(
  buffer: Buffer,
  mimeType: string,
  filename?: string,
  options?: TranscriptionOptions
): Promise<TranscriptionOutcome> {
  return getWhisperService().transcribeBuffer(buffer, mimeType, filename, options);
}

/**
 * Convenience function to transcribe from URL
 */
export async function transcribeUrl(
  url: string,
  options?: TranscriptionOptions
): Promise<TranscriptionOutcome> {
  return getWhisperService().transcribeUrl(url, options);
}
