'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Eval run status values */
export type EvalRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

interface RunStatusBadgeProps {
  /** Current status of the run */
  status: EvalRunStatus;
  /** Additional class names */
  className?: string;
}

/**
 * RunStatusBadge - Displays the status of an evaluation run with color coding
 *
 * - Pending: Gray
 * - Running: Blue with pulse animation
 * - Completed: Green
 * - Failed: Red
 * - Cancelled: Gray outline
 */
export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  const statusConfig: Record<EvalRunStatus, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className: 'bg-muted text-muted-foreground',
    },
    running: {
      label: 'Running',
      className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 animate-pulse',
    },
    completed: {
      label: 'Completed',
      className: 'bg-green-500/15 text-green-600 dark:text-green-400',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-500/15 text-red-600 dark:text-red-400',
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-muted text-muted-foreground border border-border',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant="secondary" className={cn(config.className, className)}>
      {status === 'running' && (
        <span className="mr-1.5 relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
      )}
      {config.label}
    </Badge>
  );
}

export default RunStatusBadge;
