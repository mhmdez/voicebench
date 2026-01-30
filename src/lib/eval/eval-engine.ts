/**
 * Eval Execution Engine
 *
 * TASK-028: Executes EvalRuns.
 * - Scenarios are executed sequentially.
 * - Within each scenario, providers are called in parallel.
 * - Results are persisted to eval_results and progress is updated on eval_runs.
 * - Supports resume: already-completed (scenarioId, providerId) pairs are skipped.
 */

import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { eq, inArray } from 'drizzle-orm';

import { db, evalRuns, evalResults, scenarios as scenariosTable } from '@/db';
import type { Provider as ProviderEntity } from '@/types/provider';
import type { Scenario } from '@/types/scenario';

import { createAdapter, type AudioPrompt } from '@/lib/providers';
import { getProviderRaw } from '@/lib/services/provider-service';

import { getWhisperService } from './whisper-service';
import { calculateWER } from './wer-calculator';
import { JudgeService } from './judge-service';
import { collectLatencyMetrics } from './metrics-collector';

export interface EvalEngineOptions {
  /** Provider request timeout in ms (default: 30000) */
  providerTimeoutMs?: number;
  /** Retry attempts per provider call (default: 1) */
  providerRetryAttempts?: number;
  /** Persist provider audio responses to filesystem (default: true) */
  saveAudio?: boolean;
  /** Directory under /public/audio for eval results (default: /audio/evals) */
  publicAudioBaseUrl?: string;
  /** Optional judge configuration */
  judge?: ConstructorParameters<typeof JudgeService>[0];
}

export interface EvalExecutionSummary {
  runId: string;
  totalPairs: number;
  skippedPairs: number;
  completedPairs: number;
  failedPairs: number;
}

// ---------------------------------------------------------------------------
// Audio persistence helpers
// ---------------------------------------------------------------------------

const DEFAULT_PUBLIC_AUDIO_BASE_URL = '/audio/evals';

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

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function saveEvalAudioFile(params: {
  audioBuffer: Buffer;
  mimeType: string;
  runId: string;
  scenarioId: string;
  providerId: string;
  publicAudioBaseUrl: string;
}): Promise<string> {
  const ext = getExtensionFromMime(params.mimeType);

  const publicBase = params.publicAudioBaseUrl.startsWith('/')
    ? params.publicAudioBaseUrl
    : `/${params.publicAudioBaseUrl}`;

  // public/<publicBase>/<runId>/<scenarioId>-<providerId>.<ext>
  const relDir = path.join('public', publicBase.replace(/^\//, ''), params.runId);
  const absDir = path.join(process.cwd(), relDir);
  await ensureDir(absDir);

  const filename = `${params.scenarioId}-${params.providerId}.${ext}`;
  const absPath = path.join(absDir, filename);

  await fs.writeFile(absPath, params.audioBuffer);

  return path.posix.join(publicBase, params.runId, filename);
}

async function loadScenarioPromptAudio(promptAudioUrl: string | null): Promise<Buffer | null> {
  if (!promptAudioUrl) return null;

  // Supports:
  // - relative public URLs: /audio/prompts/foo.wav
  // - direct file paths
  const filepath = promptAudioUrl.startsWith('/')
    ? path.join(process.cwd(), 'public', promptAudioUrl)
    : promptAudioUrl;

  try {
    return await fs.readFile(filepath);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

function pairKey(scenarioId: string, providerId: string): string {
  return `${scenarioId}::${providerId}`;
}

async function getRunOrThrow(runId: string) {
  const [run] = await db.select().from(evalRuns).where(eq(evalRuns.id, runId));
  if (!run) {
    throw new Error(`EvalRun not found: ${runId}`);
  }
  return run;
}

async function getScenariosByIdsOrdered(scenarioIds: string[]): Promise<(typeof scenariosTable.$inferSelect)[]> {
  if (scenarioIds.length === 0) return [];

  const rows = await db
    .select()
    .from(scenariosTable)
    .where(inArray(scenariosTable.id, scenarioIds));

  const byId = new Map(rows.map((s) => [s.id, s]));
  return scenarioIds.map((id) => byId.get(id)).filter((s): s is typeof rows[number] => !!s);
}

async function getCompletedPairs(runId: string): Promise<Set<string>> {
  const rows = await db
    .select({ scenarioId: evalResults.scenarioId, providerId: evalResults.providerId })
    .from(evalResults)
    .where(eq(evalResults.runId, runId));

  const set = new Set<string>();
  for (const r of rows) {
    set.add(pairKey(r.scenarioId, r.providerId));
  }
  return set;
}

async function updateRunProgress(runId: string, completedPairs: number, totalPairs: number): Promise<void> {
  const progress = totalPairs > 0 ? (completedPairs / totalPairs) * 100 : 0;
  await db.update(evalRuns).set({ progress }).where(eq(evalRuns.id, runId));
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class EvalEngine {
  private readonly options: Required<EvalEngineOptions>;
  private readonly judge: JudgeService;

  constructor(options: EvalEngineOptions = {}) {
    this.options = {
      providerTimeoutMs: options.providerTimeoutMs ?? 30000,
      providerRetryAttempts: options.providerRetryAttempts ?? 1,
      saveAudio: options.saveAudio ?? true,
      publicAudioBaseUrl: options.publicAudioBaseUrl ?? DEFAULT_PUBLIC_AUDIO_BASE_URL,
      judge: options.judge ?? {},
    };

    this.judge = new JudgeService(this.options.judge);
  }

  /**
   * Execute an existing EvalRun (supports resume).
   */
  async execute(runId: string): Promise<EvalExecutionSummary> {
    const run = await getRunOrThrow(runId);

    // Mark run running
    await db
      .update(evalRuns)
      .set({
        status: 'running',
        startedAt: run.startedAt ?? new Date(),
      })
      .where(eq(evalRuns.id, runId));

    const providerIds = (run.providerIds ?? []).map(String);
    const scenarioIds = (run.scenarioIds ?? []).map(String);

    const totalPairs = providerIds.length * scenarioIds.length;

    const completed = await getCompletedPairs(runId);
    const skippedPairsInitial = completed.size;

    let completedPairs = completed.size;
    let failedPairs = 0;

    await updateRunProgress(runId, completedPairs, totalPairs);

    const scenarioRows = await getScenariosByIdsOrdered(scenarioIds);

    // sequential per scenario
    for (const scenario of scenarioRows) {
      const tasks = providerIds
        .filter((providerId) => !completed.has(pairKey(scenario.id, providerId)))
        .map(async (providerId) => {
          const key = pairKey(scenario.id, providerId);

          try {
            const provider = await this.loadProviderOrThrow(providerId);

            const resultRowId = randomUUID();
            const now = new Date();

            const promptAudioBuffer = await loadScenarioPromptAudio(scenario.promptAudioUrl ?? null);

            const audioPrompt: AudioPrompt = promptAudioBuffer
              ? {
                  audioBuffer: promptAudioBuffer,
                  mimeType: 'audio/wav',
                  transcript: scenario.prompt,
                }
              : {
                  audioBuffer: Buffer.from(''),
                  mimeType: 'audio/wav',
                  transcript: scenario.prompt,
                  systemPrompt: 'You are a helpful voice assistant. Respond naturally and conversationally.',
                };

            const adapter = createAdapter(provider.type, {
              config: provider.config,
              timeoutMs: this.options.providerTimeoutMs,
              retryAttempts: this.options.providerRetryAttempts,
            });

            const startTimeMs = Date.now();
            const providerResponse = await adapter.generateResponse(audioPrompt);
            const measuredTotalMs = Date.now() - startTimeMs;

            const extracted = collectLatencyMetrics(providerResponse);
            const latency = {
              ttfb: extracted.ttfb ?? extracted.total ?? measuredTotalMs,
              total: extracted.total ?? measuredTotalMs,
            };

            const audioUrl = this.options.saveAudio
              ? await saveEvalAudioFile({
                  audioBuffer: providerResponse.audioBuffer,
                  mimeType: providerResponse.mimeType,
                  runId,
                  scenarioId: scenario.id,
                  providerId,
                  publicAudioBaseUrl: this.options.publicAudioBaseUrl,
                })
              : null;

            const transcript = await this.getTranscript(providerResponse);

            const wer = transcript
              ? calculateWER(transcript, scenario.expectedOutcome).wer
              : null;

            const judgeOutput = transcript
              ? await this.judge.evaluate({
                  scenarioType: scenario.type as Scenario['type'],
                  scenarioName: scenario.name,
                  userPrompt: scenario.prompt,
                  expectedOutcome: scenario.expectedOutcome,
                  aiResponse: transcript,
                })
              : null;

            await db.insert(evalResults).values({
              id: resultRowId,
              runId,
              scenarioId: scenario.id,
              providerId,
              audioUrl,
              transcript,
              ttfb: latency.ttfb,
              totalResponseTime: latency.total,
              wer,
              accuracyScore: judgeOutput?.normalizedScores.accuracy ?? null,
              helpfulnessScore: judgeOutput?.normalizedScores.helpfulness ?? null,
              naturalnessScore: judgeOutput?.normalizedScores.naturalness ?? null,
              efficiencyScore: judgeOutput?.normalizedScores.efficiency ?? null,
              judgeReasoning: judgeOutput?.reasoning ?? null,
              taskCompleted: judgeOutput?.taskCompleted ?? null,
              createdAt: now,
            });

            completed.add(key);
            completedPairs += 1;
            await updateRunProgress(runId, completedPairs, totalPairs);
          } catch (err) {
            failedPairs += 1;

            // Persist a row so resume will skip this pair.
            // Keep best-effort error detail in judgeReasoning.
            const now = new Date();
            const message = err instanceof Error ? err.message : String(err);

            await db.insert(evalResults).values({
              id: randomUUID(),
              runId,
              scenarioId: scenario.id,
              providerId,
              audioUrl: null,
              transcript: null,
              ttfb: null,
              totalResponseTime: null,
              wer: null,
              accuracyScore: null,
              helpfulnessScore: null,
              naturalnessScore: null,
              efficiencyScore: null,
              judgeReasoning: `ERROR: ${message}`,
              taskCompleted: false,
              createdAt: now,
            });

            completed.add(key);
            completedPairs += 1;
            await updateRunProgress(runId, completedPairs, totalPairs);
          }
        });

      // parallel per provider (per scenario)
      await Promise.allSettled(tasks);
    }

    // finalize run status
    const finalStatus = failedPairs > 0 ? 'completed' : 'completed';
    await db
      .update(evalRuns)
      .set({
        status: finalStatus,
        completedAt: new Date(),
        progress: 100,
      })
      .where(eq(evalRuns.id, runId));

    return {
      runId,
      totalPairs,
      skippedPairs: skippedPairsInitial,
      completedPairs,
      failedPairs,
    };
  }

  private async loadProviderOrThrow(providerId: string): Promise<ProviderEntity> {
    const numericId = Number(providerId);
    if (!Number.isFinite(numericId)) {
      throw new Error(`Invalid providerId (expected numeric string): ${providerId}`);
    }

    const provider = await getProviderRaw(numericId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    return provider;
  }

  private async getTranscript(providerResponse: { transcript?: string; audioBuffer: Buffer; mimeType: string }) {
    if (providerResponse.transcript && providerResponse.transcript.trim().length > 0) {
      return providerResponse.transcript.trim();
    }

    const whisper = getWhisperService();
    const outcome = await whisper.transcribeBuffer(
      providerResponse.audioBuffer,
      providerResponse.mimeType,
      `response.${getExtensionFromMime(providerResponse.mimeType)}`
    );

    if (outcome.success) {
      return outcome.text;
    }

    return null;
  }
}

/**
 * Convenience function.
 */
export async function executeEvalRun(runId: string, options?: EvalEngineOptions) {
  const engine = new EvalEngine(options);
  return engine.execute(runId);
}
