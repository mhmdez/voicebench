/**
 * Scenario YAML Parser
 *
 * Parses and validates scenario definitions from YAML format.
 */

import { parseDocument, isMap, isSeq, LineCounter, type YAMLError } from 'yaml';
import { z } from 'zod';
import {
  scenarioYamlDocumentSchema,
  singleScenarioSchema,
  type ScenarioYamlEntryParsed,
} from './scenario-schema';
import type {
  ScenarioYamlEntry,
  ScenarioParseResult,
  YamlValidationError,
} from '../../types/scenario-yaml';
import type { NewScenario } from '../../types/scenario';

/**
 * Parse a YAML string containing multiple scenarios.
 *
 * @param yamlContent - The YAML string to parse
 * @returns ParseResult with scenarios or validation errors
 */
export function parseScenarioYaml(yamlContent: string): ScenarioParseResult {
  const lineCounter = new LineCounter();
  const doc = parseDocument(yamlContent, { lineCounter });

  // Check for YAML syntax errors
  if (doc.errors.length > 0) {
    const errors = doc.errors.map((err: YAMLError) => ({
      path: 'yaml',
      message: err.message,
      line: err.linePos?.[0]?.line,
      column: err.linePos?.[0]?.col,
    }));
    return { success: false, errors };
  }

  const parsed = doc.toJS();

  // Handle single scenario (no 'scenarios' wrapper)
  if (parsed && !parsed.scenarios && typeof parsed === 'object' && 'id' in parsed) {
    return parseSingleScenario(parsed, doc, lineCounter);
  }

  // Handle document with scenarios array
  const result = scenarioYamlDocumentSchema.safeParse(parsed);

  if (!result.success) {
    const errors = mapZodErrorsWithLineNumbers(result.error, doc, lineCounter);
    return { success: false, errors };
  }

  return {
    success: true,
    scenarios: result.data.scenarios as ScenarioYamlEntry[],
  };
}

/**
 * Parse a single scenario from YAML.
 */
function parseSingleScenario(
  parsed: unknown,
  doc: ReturnType<typeof parseDocument>,
  lineCounter: LineCounter
): ScenarioParseResult {
  const result = singleScenarioSchema.safeParse(parsed);

  if (!result.success) {
    const errors = mapZodErrorsWithLineNumbers(result.error, doc, lineCounter);
    return { success: false, errors };
  }

  return {
    success: true,
    scenarios: [result.data as ScenarioYamlEntry],
  };
}

/**
 * Map Zod validation errors to include line numbers from the YAML document.
 */
function mapZodErrorsWithLineNumbers(
  zodError: z.ZodError,
  doc: ReturnType<typeof parseDocument>,
  lineCounter: LineCounter
): YamlValidationError[] {
  return zodError.issues.map((issue) => {
    const path = issue.path.join('.');
    const lineInfo = getLineInfoForPath(doc, issue.path as (string | number)[], lineCounter);

    return {
      path: path || 'root',
      message: issue.message,
      line: lineInfo?.line,
      column: lineInfo?.col,
    };
  });
}

/**
 * Get line number information for a path in the YAML document.
 */
function getLineInfoForPath(
  doc: ReturnType<typeof parseDocument>,
  path: (string | number)[],
  lineCounter: LineCounter
): { line: number; col: number } | null {
  let node: unknown = doc.contents;

  for (const key of path) {
    if (!node) return null;

    if (isMap(node)) {
      const pair = node.items.find((item) => {
        const keyNode = item.key;
        return keyNode && (keyNode as { value?: unknown }).value === key;
      });
      node = pair?.value;
    } else if (isSeq(node) && typeof key === 'number') {
      node = node.items[key];
    } else {
      return null;
    }
  }

  if (node && typeof node === 'object' && 'range' in node) {
    const range = (node as { range?: [number, number, number] }).range;
    if (range) {
      const pos = lineCounter.linePos(range[0]);
      return pos;
    }
  }

  return null;
}

/**
 * Convert parsed YAML scenarios to NewScenario format for database insertion.
 *
 * @param yamlScenarios - Parsed scenarios from YAML
 * @returns Array of NewScenario objects ready for DB insertion
 */
export function yamlToNewScenarios(yamlScenarios: ScenarioYamlEntry[]): NewScenario[] {
  return yamlScenarios.map((s) => ({
    name: s.name,
    type: s.type,
    prompt: s.prompt,
    promptAudioUrl: s.prompt_audio_url ?? null,
    expectedOutcome: s.expected_outcome,
    tags: s.tags ?? [],
    language: s.language ?? 'en',
    difficulty: s.difficulty ?? 'medium',
  }));
}

/**
 * Parse YAML and convert to NewScenario format in one step.
 *
 * @param yamlContent - The YAML string to parse
 * @returns ParseResult with NewScenario array or validation errors
 */
export function parseAndConvertScenarios(
  yamlContent: string
): { success: true; scenarios: NewScenario[] } | { success: false; errors: YamlValidationError[] } {
  const parseResult = parseScenarioYaml(yamlContent);

  if (!parseResult.success) {
    return { success: false, errors: parseResult.errors! };
  }

  return {
    success: true,
    scenarios: yamlToNewScenarios(parseResult.scenarios!),
  };
}

/**
 * Validate YAML content without parsing (useful for UI validation).
 *
 * @param yamlContent - The YAML string to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateScenarioYaml(yamlContent: string): YamlValidationError[] {
  const result = parseScenarioYaml(yamlContent);
  return result.success ? [] : result.errors!;
}
