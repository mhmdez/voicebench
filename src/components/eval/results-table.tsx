'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ResultDetail } from './result-detail';
import type { EvalResult } from '@/types';

/** Extended result with scenario info */
export interface ResultWithScenario extends EvalResult {
  scenarioName?: string;
  scenarioType?: string;
  providerName?: string;
}

interface ResultsTableProps {
  /** List of evaluation results */
  results: ResultWithScenario[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Format a score value for display
 */
function formatScore(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(0);
}

/**
 * Get color class based on score value
 */
function getScoreColor(value: number | null): string {
  if (value === null || value === undefined) return 'text-muted-foreground';
  if (value >= 80) return 'text-green-600 dark:text-green-400';
  if (value >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get scenario type badge variant
 */
function getScenarioTypeBadge(type?: string): { label: string; className: string } {
  switch (type) {
    case 'task-completion':
      return { label: 'Task', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' };
    case 'information-retrieval':
      return { label: 'Info', className: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' };
    case 'conversation-flow':
      return { label: 'Flow', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
    default:
      return { label: type || 'Unknown', className: 'bg-muted text-muted-foreground' };
  }
}

/**
 * ResultsTable - Expandable results table with scores and metrics
 *
 * Columns:
 * - Scenario (name + type badge)
 * - Provider
 * - Scores (Accuracy, Helpfulness, Naturalness, Efficiency)
 * - Metrics (TTFB, Response Time, WER)
 * - Actions (expand/collapse)
 *
 * Features:
 * - Expandable rows showing detailed result info
 * - Color-coded scores
 * - Task completion badges
 * - Responsive design
 */
export function ResultsTable({ results, isLoading, className }: ResultsTableProps) {
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());

  // Toggle row expansion
  function toggleRow(resultId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }
      return next;
    });
  }

  // Expand/collapse all
  function expandAll() {
    setExpandedRows(new Set(results.map((r) => r.id)));
  }

  function collapseAll() {
    setExpandedRows(new Set());
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead className="w-[200px]">Scenario</TableHead>
              <TableHead className="w-[150px]">Provider</TableHead>
              <TableHead className="w-[250px]">Scores</TableHead>
              <TableHead className="w-[200px]">Metrics</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center', className)}>
        <p className="text-muted-foreground">No results yet</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Expand/Collapse controls */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]" />
              <TableHead className="w-[200px]">Scenario</TableHead>
              <TableHead className="w-[150px]">Provider</TableHead>
              <TableHead className="w-[250px]">Scores</TableHead>
              <TableHead className="w-[200px]">Metrics</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => {
              const isExpanded = expandedRows.has(result.id);
              const scenarioType = getScenarioTypeBadge(result.scenarioType);
              
              return (
                <React.Fragment key={result.id}>
                  {/* Main row */}
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(result.id)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" className="h-6 w-6">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-sm">
                          {result.scenarioName || result.scenarioId}
                        </span>
                        <Badge variant="secondary" className={cn('w-fit text-xs', scenarioType.className)}>
                          {scenarioType.label}
                        </Badge>
                      </div>
                    </TableCell>
                    
                    <TableCell className="font-medium">
                      {result.providerName || result.providerId}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm tabular-nums">
                        <ScoreChip label="Acc" value={result.accuracyScore} />
                        <ScoreChip label="Help" value={result.helpfulnessScore} />
                        <ScoreChip label="Nat" value={result.naturalnessScore} />
                        <ScoreChip label="Eff" value={result.efficiencyScore} />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground tabular-nums">
                        <span>TTFB: {result.ttfb !== null ? `${result.ttfb}ms` : '—'}</span>
                        <span>Total: {result.totalResponseTime !== null ? `${result.totalResponseTime}ms` : '—'}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {result.taskCompleted === true && (
                        <Badge variant="secondary" className="bg-green-500/15 text-green-600 dark:text-green-400">
                          ✓ Pass
                        </Badge>
                      )}
                      {result.taskCompleted === false && (
                        <Badge variant="secondary" className="bg-red-500/15 text-red-600 dark:text-red-400">
                          ✗ Fail
                        </Badge>
                      )}
                      {result.taskCompleted === null && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded detail row */}
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <ResultDetail
                          result={result}
                          scenarioName={result.scenarioName}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Small score chip component
 */
function ScoreChip({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn('font-medium', getScoreColor(value))}>
        {formatScore(value)}
      </span>
    </div>
  );
}

export default ResultsTable;
