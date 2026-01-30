'use client';

import * as React from 'react';
import { MessageSquare, Brain, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

import { AudioPlayer } from '@/components/audio/audio-player';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EvalResult } from '@/types';

interface ResultDetailProps {
  /** The evaluation result data */
  result: EvalResult;
  /** Scenario name for display */
  scenarioName?: string;
  /** Additional class names */
  className?: string;
}

/**
 * Format a metric value with appropriate precision
 */
function formatMetric(value: number | null, suffix: string = '', precision: number = 1): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(precision)}${suffix}`;
}

/**
 * ResultDetail - Expanded row showing audio player, transcript, and judge reasoning
 *
 * Features:
 * - Response audio player with waveform
 * - Transcript display
 * - LLM judge reasoning
 * - Detailed metrics breakdown
 * - Task completion status
 */
export function ResultDetail({ result, scenarioName, className }: ResultDetailProps) {
  const hasAudio = !!result.audioUrl;
  const hasTranscript = !!result.transcript;
  const hasReasoning = !!result.judgeReasoning;
  
  // Determine task completion status
  const taskStatus = result.taskCompleted === null 
    ? 'unknown' 
    : result.taskCompleted 
      ? 'completed' 
      : 'failed';

  return (
    <div className={cn('p-4 space-y-4 bg-muted/30', className)}>
      {/* Audio and Transcript row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Audio Player */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            Response Audio
          </h4>
          {hasAudio ? (
            <AudioPlayer src={result.audioUrl!} compact />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border border-dashed p-3">
              <AlertCircle className="h-4 w-4" />
              <span>No audio available</span>
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Transcript
          </h4>
          {hasTranscript ? (
            <div className="rounded-lg border bg-card p-3 text-sm max-h-32 overflow-y-auto">
              {result.transcript}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border border-dashed p-3">
              <AlertCircle className="h-4 w-4" />
              <span>No transcript available</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics breakdown */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Detailed Metrics</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard label="TTFB" value={formatMetric(result.ttfb, 'ms', 0)} />
          <MetricCard label="Response Time" value={formatMetric(result.totalResponseTime, 'ms', 0)} />
          <MetricCard label="WER" value={formatMetric(result.wer ? result.wer * 100 : null, '%')} />
          <MetricCard label="Accuracy" value={formatMetric(result.accuracyScore, '/100', 0)} />
          <MetricCard label="Helpfulness" value={formatMetric(result.helpfulnessScore, '/100', 0)} />
          <MetricCard label="Naturalness" value={formatMetric(result.naturalnessScore, '/100', 0)} />
          <MetricCard label="Efficiency" value={formatMetric(result.efficiencyScore, '/100', 0)} />
        </div>
      </div>

      {/* Task completion status */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Task Completion:</span>
        {taskStatus === 'completed' && (
          <Badge variant="secondary" className="bg-green-500/15 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        )}
        {taskStatus === 'failed' && (
          <Badge variant="secondary" className="bg-red-500/15 text-red-600 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )}
        {taskStatus === 'unknown' && (
          <Badge variant="secondary" className="bg-muted text-muted-foreground">
            <AlertCircle className="h-3 w-3 mr-1" />
            Unknown
          </Badge>
        )}
      </div>

      {/* Judge reasoning */}
      {hasReasoning && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Judge Reasoning
          </h4>
          <div className="rounded-lg border bg-card p-4 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
            {result.judgeReasoning}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Small metric card component
 */
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-2 text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

export default ResultDetail;
