"use client";

import * as React from "react";
import { useArenaStore } from "@/stores";
import { ArenaHero } from "@/components/arena/arena-hero";
import { CategorySelector } from "@/components/arena/category-selector";
import { MatchView } from "@/components/arena/match-view";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@/types/prompt";
import type { CurrentMatch } from "@/stores/arena-store";

/**
 * ArenaPage - Main Arena page with hero, category selection, and match comparison
 *
 * Flow:
 * 1. Hero section with "Start Comparing" CTA
 * 2. Category selector for filtering prompts
 * 3. On start: POST /api/arena/match → populate store → render MatchView
 */
export default function ArenaPage() {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [matchStarted, setMatchStarted] = React.useState(false);

  const {
    category,
    setCategory,
    isLoading,
    currentMatch,
    startNewMatch,
    clearMatch,
    setLoading,
    setError,
  } = useArenaStore();

  // Hydration delay
  React.useEffect(() => {
    const timer = setTimeout(() => setIsInitialized(true), 100);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Fetch a new match from the API and populate the arena store
   */
  const generateMatch = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/arena/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details || `Match generation failed (${res.status})`);
      }

      // Map API response to CurrentMatch shape
      const isMock = !!(data as { isMock?: boolean }).isMock;
      const match: CurrentMatch = {
        id: data.matchId,
        isMock,
        modelA: {
          id: isMock ? "mock-a" : data.matchId + "-a",
          name: isMock ? (data as { mockProviderA?: string }).mockProviderA ?? "Provider A" : "Provider A",
          provider: "custom",
        },
        modelB: {
          id: isMock ? "mock-b" : data.matchId + "-b",
          name: isMock ? (data as { mockProviderB?: string }).mockProviderB ?? "Provider B" : "Provider B",
          provider: "custom",
        },
        promptId: data.prompt.id,
        promptText: data.prompt.text,
        promptAudioUrl: data.prompt.audioUrl ?? null,
        audioUrlA: data.responseA.url,
        audioUrlB: data.responseB.url,
      };

      startNewMatch(match);
      setMatchStarted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate match";
      setError(msg);
      setMatchStarted(true); // Show MatchView so it can display the error
    } finally {
      setLoading(false);
    }
  }, [category, setLoading, setError, startNewMatch]);

  const handleStartComparing = React.useCallback(() => {
    void generateMatch();
  }, [generateMatch]);

  const handleCategoryChange = React.useCallback(
    (newCategory: Category) => {
      setCategory(newCategory);
    },
    [setCategory]
  );

  const handleGenerateNewMatch = React.useCallback(async () => {
    clearMatch();
    await generateMatch();
  }, [clearMatch, generateMatch]);

  // Loading skeleton
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex flex-1 flex-col items-center px-4 py-8">
          <div className="flex flex-col items-center gap-6 py-12 md:py-16 lg:py-20">
            <Skeleton className="h-12 w-64 sm:h-14 sm:w-80 md:h-16 md:w-96" />
            <Skeleton className="h-6 w-48 sm:w-64 md:w-80" />
            <Skeleton className="mt-4 h-10 w-40" />
          </div>
          <div className="mt-8 flex flex-col items-center gap-4">
            <Skeleton className="h-6 w-32" />
            <div className="flex flex-wrap justify-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-28" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Once a match has been initiated, show the MatchView
  if (matchStarted) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex flex-1 flex-col items-center px-4 py-8">
          <div className="w-full max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Voice AI Arena</h1>
              <CategorySelector
                value={category as Category}
                onChange={handleCategoryChange}
                disabled={isLoading}
                size="sm"
                className="justify-end"
              />
            </div>

            <MatchView
              onGenerateMatch={handleGenerateNewMatch}
              onVoteSubmit={(winnerId) => {
                console.log("Vote submitted:", winnerId);
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  // Initial state: Hero + Category selection
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 flex-col items-center px-4 py-8">
        {/* Hero Section */}
        <ArenaHero
          onStartComparing={handleStartComparing}
          disabled={isLoading}
        />

        {/* Category Selection */}
        <section className="mt-8 flex w-full max-w-2xl flex-col items-center gap-4">
          <h2 className="text-lg font-medium text-foreground">
            Select a Category
          </h2>
          <CategorySelector
            value={category as Category}
            onChange={handleCategoryChange}
            disabled={isLoading}
            size="default"
            aria-label="Select prompt category"
            className="justify-center"
          />
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a category to focus your comparisons
          </p>
        </section>
      </main>
    </div>
  );
}
