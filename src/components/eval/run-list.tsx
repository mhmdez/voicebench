'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, PlayCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RunStatusBadge, type EvalRunStatus } from './run-status-badge';

/** Eval run data type */
export interface EvalRun {
  id: string;
  name: string;
  status: EvalRunStatus;
  providerIds: string[];
  scenarioIds: string[];
  progress: number;
  createdAt: string | Date;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
}

interface RunListProps {
  /** List of evaluation runs */
  runs: EvalRun[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when a new run should be created */
  onCreateRun?: () => void;
}

/**
 * RunList - Displays a table of evaluation runs
 *
 * Features:
 * - Clickable rows navigate to run details
 * - Progress bar for running evaluations
 * - Empty state with CTA
 */
export function RunList({ runs, isLoading, onCreateRun }: RunListProps) {
  const router = useRouter();

  // Format date to relative time
  function formatDate(date: string | Date | null | undefined): string {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  }

  // Navigate to run details
  function handleRowClick(runId: string) {
    router.push(`/eval/${runId}`);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Name</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[140px]">Date</TableHead>
              <TableHead className="w-[100px]">Providers</TableHead>
              <TableHead className="w-[100px]">Scenarios</TableHead>
              <TableHead className="w-[150px]">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                <TableCell><Skeleton className="h-2 w-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <PlayCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-1">No evaluation runs yet</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          Create your first evaluation run to benchmark voice providers across different scenarios.
        </p>
        <Button onClick={onCreateRun}>
          Create First Run
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Name</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead className="w-[100px]">Providers</TableHead>
            <TableHead className="w-[100px]">Scenarios</TableHead>
            <TableHead className="w-[150px]">Progress</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow
              key={run.id}
              onClick={() => handleRowClick(run.id)}
              className="cursor-pointer"
            >
              <TableCell className="font-medium">{run.name}</TableCell>
              <TableCell>
                <RunStatusBadge status={run.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(run.createdAt)}
              </TableCell>
              <TableCell className="text-center">
                {run.providerIds.length}
              </TableCell>
              <TableCell className="text-center">
                {run.scenarioIds.length}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress value={run.progress} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round(run.progress)}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default RunList;
