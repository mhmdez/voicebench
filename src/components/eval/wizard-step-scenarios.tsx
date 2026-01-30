'use client';

import * as React from 'react';
import { AlertCircle, Filter, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Scenario } from '@/types/scenario';

interface WizardStepScenariosProps {
  /** Currently selected scenario IDs */
  selectedScenarioIds: string[];
  /** Available scenarios */
  scenarios: Scenario[];
  /** Callback when selected scenarios change */
  onScenariosChange: (ids: string[]) => void;
}

/**
 * WizardStepScenarios - Step 2 of the eval run wizard
 *
 * Allows user to:
 * - Select individual scenarios
 * - Filter scenarios by tag
 * - Select all visible scenarios
 */
export function WizardStepScenarios({
  selectedScenarioIds,
  scenarios,
  onScenariosChange,
}: WizardStepScenariosProps) {
  // Filter state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);

  // Extract unique tags from all scenarios
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    scenarios.forEach((s) => s.tags?.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [scenarios]);

  // Filter scenarios based on search and tags
  const filteredScenarios = React.useMemo(() => {
    return scenarios.filter((scenario) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = scenario.name.toLowerCase().includes(query);
        const matchesPrompt = scenario.prompt.toLowerCase().includes(query);
        if (!matchesName && !matchesPrompt) return false;
      }

      // Tag filter
      if (selectedTags.length > 0) {
        const scenarioTags = scenario.tags || [];
        const hasMatchingTag = selectedTags.some((tag) =>
          scenarioTags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }

      return true;
    });
  }, [scenarios, searchQuery, selectedTags]);

  // Toggle a scenario selection
  function toggleScenario(scenarioId: string) {
    if (selectedScenarioIds.includes(scenarioId)) {
      onScenariosChange(selectedScenarioIds.filter((id) => id !== scenarioId));
    } else {
      onScenariosChange([...selectedScenarioIds, scenarioId]);
    }
  }

  // Toggle a tag filter
  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  }

  // Clear all filters
  function clearFilters() {
    setSearchQuery('');
    setSelectedTags([]);
  }

  // Select all visible scenarios
  function selectAllVisible() {
    const visibleIds = filteredScenarios.map((s) => s.id);
    const newSelection = new Set([...selectedScenarioIds, ...visibleIds]);
    onScenariosChange(Array.from(newSelection));
  }

  // Deselect all visible scenarios
  function deselectAllVisible() {
    const visibleIds = new Set(filteredScenarios.map((s) => s.id));
    onScenariosChange(selectedScenarioIds.filter((id) => !visibleIds.has(id)));
  }

  // Check if all visible scenarios are selected
  const allVisibleSelected =
    filteredScenarios.length > 0 &&
    filteredScenarios.every((s) => selectedScenarioIds.includes(s.id));

  // Check if any filters are active
  const hasActiveFilters = searchQuery.length > 0 || selectedTags.length > 0;

  // Get difficulty badge variant
  function getDifficultyVariant(difficulty: string): 'default' | 'secondary' | 'destructive' {
    switch (difficulty) {
      case 'easy':
        return 'secondary';
      case 'hard':
        return 'destructive';
      default:
        return 'default';
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              placeholder="Search scenarios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="shrink-0"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between border-b pb-3">
        <Label className="text-sm text-muted-foreground">
          Showing {filteredScenarios.length} of {scenarios.length} scenarios
        </Label>
        {filteredScenarios.length > 0 && (
          <button
            type="button"
            onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
            className="text-sm text-primary hover:underline"
          >
            {allVisibleSelected ? 'Deselect All Visible' : 'Select All Visible'}
          </button>
        )}
      </div>

      {/* Scenarios List */}
      {scenarios.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>No scenarios found. Please import scenarios first.</span>
        </div>
      ) : filteredScenarios.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>No scenarios match your filters.</span>
          <button
            type="button"
            onClick={clearFilters}
            className="text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2">
          {filteredScenarios.map((scenario) => {
            const isSelected = selectedScenarioIds.includes(scenario.id);

            return (
              <label
                key={scenario.id}
                className={`
                  flex items-start gap-3 rounded-lg border p-3 cursor-pointer
                  transition-colors hover:bg-accent/50
                  ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}
                `}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleScenario(scenario.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{scenario.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {scenario.type}
                    </Badge>
                    <Badge
                      variant={getDifficultyVariant(scenario.difficulty)}
                      className="text-xs"
                    >
                      {scenario.difficulty}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {scenario.prompt}
                  </p>
                  {scenario.tags && scenario.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {scenario.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Selection Summary */}
      {selectedScenarioIds.length > 0 && (
        <p className="text-sm text-muted-foreground pt-2 border-t">
          {selectedScenarioIds.length} scenario{selectedScenarioIds.length !== 1 && 's'} selected
        </p>
      )}
    </div>
  );
}

export default WizardStepScenarios;
