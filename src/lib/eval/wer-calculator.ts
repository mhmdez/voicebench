/**
 * Word Error Rate (WER) Calculator
 *
 * Calculates the Word Error Rate between a hypothesis (transcription)
 * and a reference (expected) text. WER is a standard metric for
 * evaluating speech recognition accuracy.
 *
 * WER = (Substitutions + Insertions + Deletions) / Reference Length
 */

/**
 * Options for text normalization before WER calculation
 */
export interface NormalizationOptions {
  /** Convert to lowercase. Default: true */
  lowercase?: boolean;
  /** Remove punctuation. Default: true */
  removePunctuation?: boolean;
  /** Remove extra whitespace. Default: true */
  normalizeWhitespace?: boolean;
  /** Remove numbers. Default: false */
  removeNumbers?: boolean;
  /** Custom replacements to apply */
  customReplacements?: Array<[RegExp | string, string]>;
}

/**
 * Detailed breakdown of WER calculation
 */
export interface WERResult {
  /** Word Error Rate (0-1, can exceed 1 if many insertions) */
  wer: number;
  /** Word Error Rate as percentage (0-100+) */
  werPercent: number;
  /** Number of substituted words */
  substitutions: number;
  /** Number of inserted words (in hypothesis but not reference) */
  insertions: number;
  /** Number of deleted words (in reference but not hypothesis) */
  deletions: number;
  /** Total number of errors */
  totalErrors: number;
  /** Number of words in reference */
  referenceLength: number;
  /** Number of words in hypothesis */
  hypothesisLength: number;
  /** Number of correct words */
  correctWords: number;
  /** Word accuracy (1 - WER, clamped to 0-1) */
  accuracy: number;
}

/**
 * Alignment operation types for edit distance
 */
type EditOp = 'correct' | 'substitution' | 'insertion' | 'deletion';

/**
 * Alignment between reference and hypothesis words
 */
export interface AlignmentPair {
  /** Reference word (null if insertion) */
  reference: string | null;
  /** Hypothesis word (null if deletion) */
  hypothesis: string | null;
  /** Type of operation */
  operation: EditOp;
}

/**
 * Extended WER result with alignment details
 */
export interface DetailedWERResult extends WERResult {
  /** Word-by-word alignment */
  alignment: AlignmentPair[];
  /** Normalized reference text */
  normalizedReference: string;
  /** Normalized hypothesis text */
  normalizedHypothesis: string;
}

/**
 * Default normalization options
 */
const DEFAULT_NORMALIZATION: Required<NormalizationOptions> = {
  lowercase: true,
  removePunctuation: true,
  normalizeWhitespace: true,
  removeNumbers: false,
  customReplacements: [],
};

/**
 * Punctuation pattern for removal
 * Includes common punctuation but preserves apostrophes within words
 */
const PUNCTUATION_PATTERN = /[.,!?;:"""''„‚«»‹›()[\]{}<>@#$%^&*+=|\\~`—–-]/g;

/**
 * Normalize text for WER comparison
 * @param text - Text to normalize
 * @param options - Normalization options
 */
export function normalizeText(
  text: string,
  options: NormalizationOptions = {}
): string {
  const opts = { ...DEFAULT_NORMALIZATION, ...options };
  let normalized = text;

  // Apply custom replacements first
  for (const [pattern, replacement] of opts.customReplacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  // Lowercase
  if (opts.lowercase) {
    normalized = normalized.toLowerCase();
  }

  // Remove punctuation
  if (opts.removePunctuation) {
    // Handle contractions by preserving internal apostrophes
    normalized = normalized
      .replace(PUNCTUATION_PATTERN, ' ')
      .replace(/^'|'$/g, '') // Remove leading/trailing apostrophes
      .replace(/\s'/g, ' ') // Remove apostrophes at word start
      .replace(/'\s/g, ' '); // Remove apostrophes at word end
  }

  // Remove numbers
  if (opts.removeNumbers) {
    normalized = normalized.replace(/\d+/g, ' ');
  }

  // Normalize whitespace
  if (opts.normalizeWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }

  return normalized;
}

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(word => word.length > 0);
}

/**
 * Calculate Levenshtein distance at word level with backtracking
 * Returns the distance matrix and operations for alignment
 */
function calculateEditDistance(
  reference: string[],
  hypothesis: string[]
): { distance: number[][]; operations: EditOp[][] } {
  const m = reference.length;
  const n = hypothesis.length;

  // Distance matrix
  const d: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Operations matrix for backtracking
  const ops: EditOp[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill('correct' as EditOp));

  // Initialize first row (insertions)
  for (let j = 1; j <= n; j++) {
    d[0][j] = j;
    ops[0][j] = 'insertion';
  }

  // Initialize first column (deletions)
  for (let i = 1; i <= m; i++) {
    d[i][0] = i;
    ops[i][0] = 'deletion';
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (reference[i - 1] === hypothesis[j - 1]) {
        d[i][j] = d[i - 1][j - 1];
        ops[i][j] = 'correct';
      } else {
        const substitutionCost = d[i - 1][j - 1] + 1;
        const insertionCost = d[i][j - 1] + 1;
        const deletionCost = d[i - 1][j] + 1;

        const minCost = Math.min(substitutionCost, insertionCost, deletionCost);
        d[i][j] = minCost;

        if (minCost === substitutionCost) {
          ops[i][j] = 'substitution';
        } else if (minCost === insertionCost) {
          ops[i][j] = 'insertion';
        } else {
          ops[i][j] = 'deletion';
        }
      }
    }
  }

  return { distance: d, operations: ops };
}

/**
 * Backtrack through the operations matrix to get alignment
 */
function backtrack(
  reference: string[],
  hypothesis: string[],
  distance: number[][],
  operations: EditOp[][]
): AlignmentPair[] {
  const alignment: AlignmentPair[] = [];
  let i = reference.length;
  let j = hypothesis.length;

  while (i > 0 || j > 0) {
    const op = operations[i][j];

    switch (op) {
      case 'correct':
        alignment.unshift({
          reference: reference[i - 1],
          hypothesis: hypothesis[j - 1],
          operation: 'correct',
        });
        i--;
        j--;
        break;

      case 'substitution':
        alignment.unshift({
          reference: reference[i - 1],
          hypothesis: hypothesis[j - 1],
          operation: 'substitution',
        });
        i--;
        j--;
        break;

      case 'insertion':
        alignment.unshift({
          reference: null,
          hypothesis: hypothesis[j - 1],
          operation: 'insertion',
        });
        j--;
        break;

      case 'deletion':
        alignment.unshift({
          reference: reference[i - 1],
          hypothesis: null,
          operation: 'deletion',
        });
        i--;
        break;
    }
  }

  return alignment;
}

/**
 * Calculate Word Error Rate between hypothesis and reference text
 * @param hypothesis - The transcribed/generated text
 * @param reference - The expected/ground truth text
 * @param options - Normalization options
 */
export function calculateWER(
  hypothesis: string,
  reference: string,
  options: NormalizationOptions = {}
): WERResult {
  // Normalize texts
  const normHypothesis = normalizeText(hypothesis, options);
  const normReference = normalizeText(reference, options);

  // Tokenize
  const hypWords = tokenize(normHypothesis);
  const refWords = tokenize(normReference);

  // Handle edge cases
  if (refWords.length === 0) {
    if (hypWords.length === 0) {
      // Both empty = perfect match
      return {
        wer: 0,
        werPercent: 0,
        substitutions: 0,
        insertions: 0,
        deletions: 0,
        totalErrors: 0,
        referenceLength: 0,
        hypothesisLength: 0,
        correctWords: 0,
        accuracy: 1,
      };
    }
    // Reference empty, hypothesis not = all insertions
    return {
      wer: hypWords.length, // WER can exceed 1
      werPercent: hypWords.length * 100,
      substitutions: 0,
      insertions: hypWords.length,
      deletions: 0,
      totalErrors: hypWords.length,
      referenceLength: 0,
      hypothesisLength: hypWords.length,
      correctWords: 0,
      accuracy: 0,
    };
  }

  // Calculate edit distance
  const { distance, operations } = calculateEditDistance(refWords, hypWords);

  // Get alignment for counting operations
  const alignment = backtrack(refWords, hypWords, distance, operations);

  // Count operations
  let substitutions = 0;
  let insertions = 0;
  let deletions = 0;
  let correct = 0;

  for (const pair of alignment) {
    switch (pair.operation) {
      case 'substitution':
        substitutions++;
        break;
      case 'insertion':
        insertions++;
        break;
      case 'deletion':
        deletions++;
        break;
      case 'correct':
        correct++;
        break;
    }
  }

  const totalErrors = substitutions + insertions + deletions;
  const wer = totalErrors / refWords.length;

  return {
    wer,
    werPercent: wer * 100,
    substitutions,
    insertions,
    deletions,
    totalErrors,
    referenceLength: refWords.length,
    hypothesisLength: hypWords.length,
    correctWords: correct,
    accuracy: Math.max(0, 1 - wer),
  };
}

/**
 * Calculate detailed WER with word-by-word alignment
 * @param hypothesis - The transcribed/generated text
 * @param reference - The expected/ground truth text
 * @param options - Normalization options
 */
export function calculateDetailedWER(
  hypothesis: string,
  reference: string,
  options: NormalizationOptions = {}
): DetailedWERResult {
  // Normalize texts
  const normHypothesis = normalizeText(hypothesis, options);
  const normReference = normalizeText(reference, options);

  // Tokenize
  const hypWords = tokenize(normHypothesis);
  const refWords = tokenize(normReference);

  // Handle edge cases
  if (refWords.length === 0 && hypWords.length === 0) {
    return {
      wer: 0,
      werPercent: 0,
      substitutions: 0,
      insertions: 0,
      deletions: 0,
      totalErrors: 0,
      referenceLength: 0,
      hypothesisLength: 0,
      correctWords: 0,
      accuracy: 1,
      alignment: [],
      normalizedReference: normReference,
      normalizedHypothesis: normHypothesis,
    };
  }

  // Calculate edit distance with backtracking
  const { distance, operations } = calculateEditDistance(refWords, hypWords);
  const alignment = backtrack(refWords, hypWords, distance, operations);

  // Count operations
  let substitutions = 0;
  let insertions = 0;
  let deletions = 0;
  let correct = 0;

  for (const pair of alignment) {
    switch (pair.operation) {
      case 'substitution':
        substitutions++;
        break;
      case 'insertion':
        insertions++;
        break;
      case 'deletion':
        deletions++;
        break;
      case 'correct':
        correct++;
        break;
    }
  }

  const totalErrors = substitutions + insertions + deletions;
  const wer = refWords.length > 0 ? totalErrors / refWords.length : (hypWords.length > 0 ? hypWords.length : 0);

  return {
    wer,
    werPercent: wer * 100,
    substitutions,
    insertions,
    deletions,
    totalErrors,
    referenceLength: refWords.length,
    hypothesisLength: hypWords.length,
    correctWords: correct,
    accuracy: Math.max(0, 1 - wer),
    alignment,
    normalizedReference: normReference,
    normalizedHypothesis: normHypothesis,
  };
}

/**
 * Calculate Character Error Rate (CER)
 * Similar to WER but at character level
 * @param hypothesis - The transcribed/generated text
 * @param reference - The expected/ground truth text
 * @param options - Normalization options
 */
export function calculateCER(
  hypothesis: string,
  reference: string,
  options: NormalizationOptions = {}
): WERResult {
  // Normalize texts
  const normHypothesis = normalizeText(hypothesis, options);
  const normReference = normalizeText(reference, options);

  // Convert to character arrays (excluding spaces for CER)
  const hypChars = normHypothesis.replace(/\s/g, '').split('');
  const refChars = normReference.replace(/\s/g, '').split('');

  // Handle edge cases
  if (refChars.length === 0) {
    if (hypChars.length === 0) {
      return {
        wer: 0,
        werPercent: 0,
        substitutions: 0,
        insertions: 0,
        deletions: 0,
        totalErrors: 0,
        referenceLength: 0,
        hypothesisLength: 0,
        correctWords: 0,
        accuracy: 1,
      };
    }
    return {
      wer: hypChars.length,
      werPercent: hypChars.length * 100,
      substitutions: 0,
      insertions: hypChars.length,
      deletions: 0,
      totalErrors: hypChars.length,
      referenceLength: 0,
      hypothesisLength: hypChars.length,
      correctWords: 0,
      accuracy: 0,
    };
  }

  // Calculate edit distance
  const { distance, operations } = calculateEditDistance(refChars, hypChars);
  const alignment = backtrack(refChars, hypChars, distance, operations);

  // Count operations
  let substitutions = 0;
  let insertions = 0;
  let deletions = 0;
  let correct = 0;

  for (const pair of alignment) {
    switch (pair.operation) {
      case 'substitution':
        substitutions++;
        break;
      case 'insertion':
        insertions++;
        break;
      case 'deletion':
        deletions++;
        break;
      case 'correct':
        correct++;
        break;
    }
  }

  const totalErrors = substitutions + insertions + deletions;
  const cer = totalErrors / refChars.length;

  return {
    wer: cer, // Keeping 'wer' property name for consistency
    werPercent: cer * 100,
    substitutions,
    insertions,
    deletions,
    totalErrors,
    referenceLength: refChars.length,
    hypothesisLength: hypChars.length,
    correctWords: correct, // Actually correct characters
    accuracy: Math.max(0, 1 - cer),
  };
}

/**
 * Format alignment as a human-readable string
 * Useful for debugging and visualization
 */
export function formatAlignment(alignment: AlignmentPair[]): string {
  const lines: string[] = ['REF: ', 'HYP: ', 'OPS: '];

  for (const pair of alignment) {
    const refWord = pair.reference ?? '***';
    const hypWord = pair.hypothesis ?? '***';
    const maxLen = Math.max(refWord.length, hypWord.length);

    lines[0] += refWord.padEnd(maxLen + 1);
    lines[1] += hypWord.padEnd(maxLen + 1);

    let opChar: string;
    switch (pair.operation) {
      case 'correct':
        opChar = ' ';
        break;
      case 'substitution':
        opChar = 'S';
        break;
      case 'insertion':
        opChar = 'I';
        break;
      case 'deletion':
        opChar = 'D';
        break;
    }
    lines[2] += opChar.padEnd(maxLen + 1);
  }

  return lines.join('\n');
}
