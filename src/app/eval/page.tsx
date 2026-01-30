'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FlaskConical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { RunList, type EvalRun } from '@/components/eval/run-list';

/**
 * EvalPage - Evaluation runs list page
 *
 * Displays all evaluation runs with ability to create new ones
 * and navigate to individual run details.
 */
export default function EvalPage() {
  const router = useRouter();
  const [runs, setRuns] = React.useState<EvalRun[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch evaluation runs
  const fetchRuns = React.useCallback(async () => {
    try {
      const response = await fetch('/api/eval/runs');
      const result = await response.json();

      if (result.success && result.data) {
        setRuns(result.data);
      }
    } catch (error) {
      console.error('Error fetching eval runs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load runs on mount
  React.useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Navigate to create new run
  function handleCreateRun() {
    router.push('/eval/new');
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <FlaskConical className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Evaluations</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Evaluation Runs</h2>
              <p className="text-muted-foreground">
                Benchmark voice providers with structured evaluation scenarios
              </p>
            </div>
            <Button onClick={handleCreateRun}>
              <Plus className="h-4 w-4" />
              New Run
            </Button>
          </div>

          <RunList
            runs={runs}
            isLoading={isLoading}
            onCreateRun={handleCreateRun}
          />
        </section>
      </main>
    </div>
  );
}
