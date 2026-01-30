'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WizardStepProviders } from './wizard-step-providers';
import { WizardStepScenarios } from './wizard-step-scenarios';
import { WizardStepReview } from './wizard-step-review';
import type { Provider } from '@/types/provider';
import type { Scenario } from '@/types/scenario';

/** Wizard step definitions */
const STEPS = [
  { id: 'providers', label: 'Providers', description: 'Name and select providers' },
  { id: 'scenarios', label: 'Scenarios', description: 'Choose test scenarios' },
  { id: 'review', label: 'Review', description: 'Review and start' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

/** Wizard form state */
export interface WizardFormState {
  runName: string;
  selectedProviderIds: string[];
  selectedScenarioIds: string[];
}

/**
 * RunWizard - Multi-step wizard for creating evaluation runs
 *
 * Manages step navigation, form state, and final submission.
 */
export function RunWizard() {
  const router = useRouter();

  // Current step index
  const [currentStep, setCurrentStep] = React.useState(0);

  // Form state
  const [formState, setFormState] = React.useState<WizardFormState>({
    runName: '',
    selectedProviderIds: [],
    selectedScenarioIds: [],
  });

  // API data
  const [providers, setProviders] = React.useState<Provider[]>([]);
  const [scenarios, setScenarios] = React.useState<Scenario[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // Fetch providers and scenarios on mount
  React.useEffect(() => {
    async function fetchData() {
      try {
        const [providersRes, scenariosRes] = await Promise.all([
          fetch('/api/providers'),
          fetch('/api/scenarios'),
        ]);

        const providersData = await providersRes.json();
        const scenariosData = await scenariosRes.json();

        if (providersData.success) {
          setProviders(providersData.data);
        }
        if (scenariosData.success) {
          setScenarios(scenariosData.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchData();
  }, []);

  // Navigation handlers
  const canGoBack = currentStep > 0;
  const canGoNext = currentStep < STEPS.length - 1;
  const isLastStep = currentStep === STEPS.length - 1;

  function handleBack() {
    if (canGoBack) {
      setCurrentStep((prev) => prev - 1);
    }
  }

  function handleNext() {
    if (canGoNext) {
      setCurrentStep((prev) => prev + 1);
    }
  }

  // Validation for each step
  function isStepValid(stepIndex: number): boolean {
    switch (stepIndex) {
      case 0: // Providers step
        return (
          formState.runName.trim().length > 0 &&
          formState.selectedProviderIds.length > 0
        );
      case 1: // Scenarios step
        return formState.selectedScenarioIds.length > 0;
      case 2: // Review step
        return true;
      default:
        return false;
    }
  }

  // Submit handler
  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/eval/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formState.runName.trim(),
          providerIds: formState.selectedProviderIds,
          scenarioIds: formState.selectedScenarioIds,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create evaluation run');
      }

      // Redirect to the new run's detail page
      router.push(`/eval/${result.data.id}`);
    } catch (error) {
      console.error('Error creating eval run:', error);
      setSubmitError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
      setIsSubmitting(false);
    }
  }

  // Update form state helpers
  function updateRunName(name: string) {
    setFormState((prev) => ({ ...prev, runName: name }));
  }

  function updateSelectedProviders(ids: string[]) {
    setFormState((prev) => ({ ...prev, selectedProviderIds: ids }));
  }

  function updateSelectedScenarios(ids: string[]) {
    setFormState((prev) => ({ ...prev, selectedScenarioIds: ids }));
  }

  // Render step indicator
  function renderStepIndicator() {
    return (
      <nav className="mb-8">
        <ol className="flex items-center justify-center gap-2">
          {STEPS.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <li key={step.id} className="flex items-center">
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    ${isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }
                  `}
                >
                  {index + 1}
                </div>
                <span
                  className={`
                    ml-2 text-sm font-medium hidden sm:inline
                    ${isActive ? 'text-foreground' : 'text-muted-foreground'}
                  `}
                >
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <div className="w-8 sm:w-12 h-px bg-border mx-2 sm:mx-4" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Render current step content
  function renderStepContent() {
    if (isLoadingData) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    switch (currentStep) {
      case 0:
        return (
          <WizardStepProviders
            runName={formState.runName}
            selectedProviderIds={formState.selectedProviderIds}
            providers={providers}
            onRunNameChange={updateRunName}
            onProvidersChange={updateSelectedProviders}
          />
        );
      case 1:
        return (
          <WizardStepScenarios
            selectedScenarioIds={formState.selectedScenarioIds}
            scenarios={scenarios}
            onScenariosChange={updateSelectedScenarios}
          />
        );
      case 2:
        return (
          <WizardStepReview
            formState={formState}
            providers={providers}
            scenarios={scenarios}
            error={submitError}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {renderStepIndicator()}

      <Card>
        <CardContent className="pt-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={!canGoBack || isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {isLastStep ? (
          <Button
            onClick={handleSubmit}
            disabled={!isStepValid(currentStep) || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              'Start Run'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!isStepValid(currentStep)}
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default RunWizard;
