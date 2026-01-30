'use client';

import * as React from 'react';
import { AlertCircle, CheckCircle2, Clock, Cpu, FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { WizardFormState } from './run-wizard';
import type { Provider } from '@/types/provider';
import type { Scenario } from '@/types/scenario';

interface WizardStepReviewProps {
  /** Current form state */
  formState: WizardFormState;
  /** Available providers */
  providers: Provider[];
  /** Available scenarios */
  scenarios: Scenario[];
  /** Error message if submission failed */
  error?: string | null;
}

/** Average time per scenario-provider combination in seconds */
const AVG_TIME_PER_EVAL = 15;

/**
 * WizardStepReview - Step 3 of the eval run wizard
 *
 * Displays:
 * - Summary of selected run name, providers, and scenarios
 * - Estimated time to completion
 * - Error message if submission failed
 */
export function WizardStepReview({
  formState,
  providers,
  scenarios,
  error,
}: WizardStepReviewProps) {
  // Get selected provider objects
  const selectedProviders = providers.filter((p) =>
    formState.selectedProviderIds.includes(String(p.id))
  );

  // Get selected scenario objects
  const selectedScenarios = scenarios.filter((s) =>
    formState.selectedScenarioIds.includes(s.id)
  );

  // Calculate total evaluations
  const totalEvaluations =
    formState.selectedProviderIds.length * formState.selectedScenarioIds.length;

  // Calculate estimated time
  const estimatedSeconds = totalEvaluations * AVG_TIME_PER_EVAL;
  const estimatedMinutes = Math.ceil(estimatedSeconds / 60);

  // Format time display
  function formatTime(minutes: number): string {
    if (minutes < 60) {
      return `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `~${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `~${hours}h ${remainingMinutes}m`;
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to create evaluation run</p>
            <p className="mt-1 text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* Run Name */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          Run Name
        </div>
        <p className="text-lg font-semibold">{formState.runName}</p>
      </div>

      {/* Selected Providers */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Cpu className="h-4 w-4" />
          Providers ({selectedProviders.length})
        </div>
        <div className="grid gap-2">
          {selectedProviders.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{provider.name}</span>
              <Badge variant="secondary" className="text-xs">
                {provider.type}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Scenarios */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <FileText className="h-4 w-4" />
          Scenarios ({selectedScenarios.length})
        </div>
        <div className="rounded-md border bg-muted/30 p-3 max-h-[200px] overflow-y-auto">
          <div className="grid gap-1.5">
            {selectedScenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="flex items-center gap-2 text-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{scenario.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {scenario.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="font-medium mb-3">Run Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Evaluations</p>
            <p className="text-2xl font-bold">{totalEvaluations}</p>
            <p className="text-xs text-muted-foreground">
              {formState.selectedProviderIds.length} providers × {formState.selectedScenarioIds.length} scenarios
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Estimated Time</p>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <p className="text-2xl font-bold">{formatTime(estimatedMinutes)}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Based on ~{AVG_TIME_PER_EVAL}s per evaluation
            </p>
          </div>
        </div>
      </div>

      {/* Ready to Start */}
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
        <p>
          Ready to start! Click <span className="font-medium">"Start Run"</span> to begin the evaluation.
          You can monitor progress on the run detail page.
        </p>
      </div>
    </div>
  );
}

export default WizardStepReview;
