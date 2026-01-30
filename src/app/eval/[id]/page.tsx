'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Download, FileJson, FileSpreadsheet, BarChart3, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, Title, Text } from '@tremor/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { RunHeader } from '@/components/eval/run-header';
import { ResultsTable, type ResultWithScenario } from '@/components/eval/results-table';
import { MetricsBar } from '@/components/charts';
import type { EvalRun, EvalResult } from '@/types';

/** API response type for run details */
interface RunDetailResponse {
  success: boolean;
  data?: {
    run: EvalRun;
    results: EvalResult[];
    aggregates: {
      overall: AggregateMetrics;
      byProvider: Record<string, AggregateMetrics>;
    };
  };
  error?: string;
}

/** Aggregate metrics structure */
interface AggregateMetrics {
  ttfb: MetricStats;
  totalResponseTime: MetricStats;
  wer: MetricStats;
  accuracyScore: MetricStats;
  helpfulnessScore: MetricStats;
  naturalnessScore: MetricStats;
  efficiencyScore: MetricStats;
  taskCompletion: {
    completed: number;
    total: number;
    rate: number | null;
  };
}

/** Stats for a single metric */
interface MetricStats {
  mean: number | null;
  median: number | null;
  p95: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

/** Fetcher function for SWR */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * EvalRunDetailPage - Shows detailed results for a single evaluation run
 *
 * Features:
 * - Header with run info + progress
 * - Results table with expandable rows
 * - Aggregate stats section by provider
 * - Export button (JSON/CSV dropdown)
 * - Real-time progress updates for running evals
 */
export default function EvalRunDetailPage() {
  const params = useParams();
  const runId = params.id as string;

  // Fetch run details with SWR for automatic revalidation
  const { data, error, isLoading, mutate } = useSWR<RunDetailResponse>(
    `/api/eval/runs/${runId}`,
    fetcher,
    {
      // Refresh every 5 seconds if the run is still running
      refreshInterval: (data) =>
        data?.data?.run.status === 'running' ? 5000 : 0,
      revalidateOnFocus: true,
    }
  );

  const run = data?.data?.run;
  const results = data?.data?.results || [];
  const aggregates = data?.data?.aggregates;

  // Map results with provider/scenario names (would need additional API calls for full names)
  const resultsWithInfo: ResultWithScenario[] = results.map((r) => ({
    ...r,
    // In a real app, you'd fetch provider/scenario names from their respective endpoints
    providerName: r.providerId,
    scenarioName: r.scenarioId,
  }));

  // Calculate completed count
  const completedCount = results.filter(
    (r) => r.taskCompleted !== null || r.judgeReasoning !== null
  ).length;
  const totalCount = run ? run.providerIds.length * run.scenarioIds.length : 0;

  // Handle export
  async function handleExport(format: 'json' | 'csv') {
    const url = `/api/eval/runs/${runId}/export?format=${format}`;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const filename = response.headers
        .get('Content-Disposition')
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || `eval-run-${runId}.${format}`;
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }

  // Prepare chart data for aggregate stats by provider
  const providerChartData = React.useMemo(() => {
    if (!aggregates?.byProvider) return [];
    
    return Object.entries(aggregates.byProvider).map(([providerId, stats]) => ({
      provider: providerId,
      Accuracy: stats.accuracyScore.mean ?? 0,
      Helpfulness: stats.helpfulnessScore.mean ?? 0,
      Naturalness: stats.naturalnessScore.mean ?? 0,
      Efficiency: stats.efficiencyScore.mean ?? 0,
    }));
  }, [aggregates]);

  const latencyChartData = React.useMemo(() => {
    if (!aggregates?.byProvider) return [];
    
    return Object.entries(aggregates.byProvider).map(([providerId, stats]) => ({
      provider: providerId,
      'TTFB (ms)': stats.ttfb.mean ?? 0,
      'Total Response (ms)': stats.totalResponseTime.mean ?? 0,
    }));
  }, [aggregates]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-24" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error || !run) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error Loading Run</h1>
          <p className="text-muted-foreground">
            {data?.error || 'Failed to load evaluation run details'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Evaluation Details</h1>
          </div>
          
          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="h-4 w-4 mr-2" />
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Run header with progress */}
        <RunHeader
          run={run}
          completedCount={completedCount}
          totalCount={totalCount}
        />

        {/* Aggregate Stats by Provider */}
        {providerChartData.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Provider Comparison</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MetricsBar
                data={providerChartData}
                metrics={['Accuracy', 'Helpfulness', 'Naturalness', 'Efficiency']}
                title="Quality Scores"
                description="Mean scores by provider (0-100)"
              />
              <MetricsBar
                data={latencyChartData}
                metrics={['TTFB (ms)', 'Total Response (ms)']}
                title="Latency Metrics"
                description="Mean response times by provider"
                colors={['cyan', 'violet']}
              />
            </div>
          </section>
        )}

        {/* Aggregate Stats Cards */}
        {aggregates && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Overall Statistics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              <StatCard
                label="Accuracy"
                value={aggregates.overall.accuracyScore.mean}
                suffix="/100"
              />
              <StatCard
                label="Helpfulness"
                value={aggregates.overall.helpfulnessScore.mean}
                suffix="/100"
              />
              <StatCard
                label="Naturalness"
                value={aggregates.overall.naturalnessScore.mean}
                suffix="/100"
              />
              <StatCard
                label="Efficiency"
                value={aggregates.overall.efficiencyScore.mean}
                suffix="/100"
              />
              <StatCard
                label="Avg TTFB"
                value={aggregates.overall.ttfb.mean}
                suffix="ms"
              />
              <StatCard
                label="Avg Response"
                value={aggregates.overall.totalResponseTime.mean}
                suffix="ms"
              />
              <StatCard
                label="Avg WER"
                value={aggregates.overall.wer.mean ? aggregates.overall.wer.mean * 100 : null}
                suffix="%"
              />
              <StatCard
                label="Task Pass Rate"
                value={aggregates.overall.taskCompletion.rate}
                suffix="%"
              />
            </div>
          </section>
        )}

        {/* Results Table */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Individual Results</h2>
          <ResultsTable results={resultsWithInfo} isLoading={false} />
        </section>

        {/* Running indicator */}
        {run.status === 'running' && (
          <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg border bg-card px-4 py-2 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm">Evaluation in progress...</span>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Small statistic card component
 */
function StatCard({
  label,
  value,
  suffix = '',
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  const displayValue = value !== null && value !== undefined
    ? `${value.toFixed(1)}${suffix}`
    : '—';

  return (
    <Card className="p-3">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <Title className="text-lg font-semibold mt-1 tabular-nums">{displayValue}</Title>
    </Card>
  );
}
