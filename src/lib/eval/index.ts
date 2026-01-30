/**
 * Evaluation Module
 *
 * Exports transcription and evaluation utilities for VoiceBench.
 */

// Whisper transcription service
export {
  WhisperService,
  getWhisperService,
  transcribeFile,
  transcribeBuffer,
  transcribeUrl,
  type SupportedLanguage,
  type TranscriptionOptions,
  type TranscriptionResult,
  type TranscriptionError,
  type TranscriptionOutcome,
} from './whisper-service';

// Word Error Rate calculator
export {
  calculateWER,
  calculateDetailedWER,
  calculateCER,
  normalizeText,
  tokenize,
  formatAlignment,
  type NormalizationOptions,
  type WERResult,
  type DetailedWERResult,
  type AlignmentPair,
} from './wer-calculator';

// Re-export other eval modules
export * from './scenario-schema';
export * from './scenario-parser';
export * from './judge-prompts';
export * from './judge-service';
