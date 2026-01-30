'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Calendar, Timer } from 'lucide-react';
import { formatDistanceToNow, format, differenceInSeconds } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RunStatusBadge, type EvalRunStatus } from './run-status-badge';
import type { EvalRun } from '@/types';

interface RunHeaderProps {
  /** The evaluation run data */
  run: EvalRun;
  /** Number of completed results */
  completedCount: number;
  /** Total expected results */
  totalCount: number;
  /** Additional class names */
  className?: string;
}

/**
 * Format duration between two dates
 */
function formatDuration(startDate: Date | null, endDate: Date | null): string {
  if (!startDate) return '—';
  
  const end = endDate || new Date();
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const endParsed = typeof end === 'string' ? new Date(end) : end;
  
  const seconds = differenceInSeconds(endParsed, start);
  
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  }
}

/**
 * RunHeader - Displays run name, status, progress bar, and duration
 *
 * Features:
 * - Back navigation
 * - Status badge with color coding
 * - Progress bar (for running evals)
 * - Duration display
 * - Created/completed timestamps
 */
export function RunHeader({ run, completedCount, totalCount, className }: RunHeaderProps) {
  const router = useRouter();
  
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : run.progress;
  const startedAt = run.startedAt ? new Date(run.startedAt) : null;
  const completedAt = run.completedAt ? new Date(run.completedAt) : null;
  const createdAt = new Date(run.createdAt);

  return (
    <div className={className}>
      {/* Back button and title row */}
      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/eval')}
          aria-label="Back to evaluations"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{run.name}</h1>
            <RunStatusBadge status={run.status as EvalRunStatus} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {run.providerIds.length} provider{run.providerIds.length !== 1 ? 's' : ''} × {run.scenarioIds.length} scenario{run.scenarioIds.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Progress section */}
      <div className="rounded-lg border bg-card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Created {formatDistanceToNow(createdAt, { addSuffix: true })}</span>
            </div>
            
            {startedAt && (
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span>
                  Duration: {formatDuration(startedAt, completedAt)}
                  {run.status === 'running' && ' (running)'}
                </span>
              </div>
            )}
            
            {completedAt && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Completed {format(completedAt, 'MMM d, yyyy h:mm a')}</span>
              </div>
            )}
          </div>
          
          <span className="text-sm font-medium">
            {completedCount} / {totalCount} completed
          </span>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}

export default RunHeader;
