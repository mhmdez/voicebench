'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Provider } from '@/types/provider';

interface WizardStepProvidersProps {
  /** Current run name */
  runName: string;
  /** Currently selected provider IDs */
  selectedProviderIds: string[];
  /** Available providers */
  providers: Provider[];
  /** Callback when run name changes */
  onRunNameChange: (name: string) => void;
  /** Callback when selected providers change */
  onProvidersChange: (ids: string[]) => void;
}

/**
 * WizardStepProviders - Step 1 of the eval run wizard
 *
 * Allows user to:
 * - Enter a name for the evaluation run
 * - Select one or more providers to evaluate
 */
export function WizardStepProviders({
  runName,
  selectedProviderIds,
  providers,
  onRunNameChange,
  onProvidersChange,
}: WizardStepProvidersProps) {
  // Toggle a provider selection
  function toggleProvider(providerId: string) {
    if (selectedProviderIds.includes(providerId)) {
      onProvidersChange(selectedProviderIds.filter((id) => id !== providerId));
    } else {
      onProvidersChange([...selectedProviderIds, providerId]);
    }
  }

  // Select/deselect all providers
  function toggleAll() {
    if (selectedProviderIds.length === activeProviders.length) {
      onProvidersChange([]);
    } else {
      onProvidersChange(activeProviders.map((p) => String(p.id)));
    }
  }

  // Filter to only active providers
  const activeProviders = providers.filter((p) => p.isActive);

  return (
    <div className="space-y-6">
      {/* Run Name Input */}
      <div className="space-y-2">
        <Label htmlFor="runName">Run Name</Label>
        <Input
          id="runName"
          placeholder="e.g., Q1 2024 Provider Comparison"
          value={runName}
          onChange={(e) => onRunNameChange(e.target.value)}
          maxLength={255}
        />
        <p className="text-xs text-muted-foreground">
          Give this evaluation run a descriptive name for easy identification.
        </p>
      </div>

      {/* Provider Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Select Providers</Label>
          {activeProviders.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-sm text-primary hover:underline"
            >
              {selectedProviderIds.length === activeProviders.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          )}
        </div>

        {activeProviders.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No active providers found. Please configure providers first.</span>
          </div>
        ) : (
          <div className="grid gap-3">
            {activeProviders.map((provider) => {
              const providerId = String(provider.id);
              const isSelected = selectedProviderIds.includes(providerId);

              return (
                <label
                  key={provider.id}
                  className={`
                    flex items-center gap-3 rounded-lg border p-4 cursor-pointer
                    transition-colors hover:bg-accent/50
                    ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}
                  `}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleProvider(providerId)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{provider.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {provider.type}
                      </Badge>
                    </div>
                    {provider.config?.model && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Model: {provider.config.model}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {selectedProviderIds.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {selectedProviderIds.length} provider{selectedProviderIds.length !== 1 && 's'} selected
          </p>
        )}
      </div>
    </div>
  );
}

export default WizardStepProviders;
