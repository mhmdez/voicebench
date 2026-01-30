/**
 * OpenAI Realtime Provider Types
 *
 * Types specific to the OpenAI voice/audio integration.
 * Supports both the Realtime API and fallback TTS approach.
 */

/**
 * OpenAI-specific configuration options
 */
export interface OpenAIConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Model to use for chat completions */
  model?: OpenAIModel;
  /** Voice for TTS output */
  voice?: OpenAIVoice;
  /** TTS model to use */
  ttsModel?: OpenAITTSModel;
  /** Whisper model for transcription */
  whisperModel?: OpenAIWhisperModel;
  /** Organization ID (optional) */
  organizationId?: string;
  /** Response format for audio */
  audioFormat?: OpenAIAudioFormat;
  /** Temperature for chat completions */
  temperature?: number;
  /** Max tokens for completions */
  maxTokens?: number;
}

/**
 * Available OpenAI models for chat
 */
export type OpenAIModel =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'gpt-4'
  | 'gpt-3.5-turbo';

/**
 * Available voices for OpenAI TTS
 */
export type OpenAIVoice =
  | 'alloy'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer';

/**
 * Available TTS models
 */
export type OpenAITTSModel = 'tts-1' | 'tts-1-hd';

/**
 * Available Whisper models
 */
export type OpenAIWhisperModel = 'whisper-1';

/**
 * Supported audio output formats
 */
export type OpenAIAudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

/**
 * Whisper transcription response
 */
export interface WhisperTranscription {
  /** Transcribed text */
  text: string;
  /** Language detected */
  language?: string;
  /** Duration of the audio in seconds */
  duration?: number;
  /** Word-level timestamps (if requested) */
  words?: WhisperWord[];
}

/**
 * Word-level timestamp from Whisper
 */
export interface WhisperWord {
  /** The word */
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

/**
 * Chat completion response subset
 */
export interface ChatCompletionResult {
  /** Response text */
  content: string;
  /** Model used */
  model: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Finish reason */
  finishReason: string;
}

/**
 * TTS generation result
 */
export interface TTSResult {
  /** Audio buffer */
  audioBuffer: Buffer;
  /** MIME type of the audio */
  mimeType: string;
}

/**
 * Internal timing breakdown for the pipeline
 */
export interface OpenAIPipelineTiming {
  /** Time spent on transcription (Whisper) */
  transcriptionMs: number;
  /** Time spent on chat completion (GPT) */
  completionMs: number;
  /** Time spent on TTS generation */
  ttsMs: number;
  /** Total pipeline time */
  totalMs: number;
}

/**
 * OpenAI-specific error details
 */
export interface OpenAIErrorDetails {
  /** HTTP status code */
  statusCode?: number;
  /** OpenAI error type */
  type?: string;
  /** OpenAI error code */
  code?: string;
  /** Rate limit info if applicable */
  rateLimitInfo?: {
    limit?: number;
    remaining?: number;
    reset?: Date;
  };
}

/**
 * Default configuration values
 */
export const OPENAI_DEFAULTS = {
  model: 'gpt-4o' as OpenAIModel,
  voice: 'alloy' as OpenAIVoice,
  ttsModel: 'tts-1' as OpenAITTSModel,
  whisperModel: 'whisper-1' as OpenAIWhisperModel,
  audioFormat: 'mp3' as OpenAIAudioFormat,
  temperature: 0.7,
  maxTokens: 1024,
} as const;

/**
 * Audio format to MIME type mapping
 */
export const AUDIO_FORMAT_MIME_TYPES: Record<OpenAIAudioFormat, string> = {
  mp3: 'audio/mpeg',
  opus: 'audio/opus',
  aac: 'audio/aac',
  flac: 'audio/flac',
  wav: 'audio/wav',
  pcm: 'audio/pcm',
};

/**
 * Sample rates for different audio formats
 */
export const AUDIO_FORMAT_SAMPLE_RATES: Record<OpenAIAudioFormat, number> = {
  mp3: 24000,
  opus: 24000,
  aac: 24000,
  flac: 24000,
  wav: 24000,
  pcm: 24000,
};
