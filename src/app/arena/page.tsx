"use client";

import * as React from "react";
import { useArenaStore } from "@/stores";
import { ArenaHero } from "@/components/arena/arena-hero";
import { CategorySelector } from "@/components/arena/category-selector";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@/types/prompt";

/**
 * ArenaPage - Main Arena page with hero section and category selection
 *
 * Features:
 * - Hero section with project tagline
 * - Category selector for filtering prompts
 * - Responsive layout
 * - Loading skeleton while initializing
 */
export default function ArenaPage() {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const { category, setCategory, isLoading } = useArenaStore();

  // Simulate initialization (hydration)
  React.useEffect(() => {
    // Small delay to handle hydration
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleCategoryChange = React.useCallback(
    (newCategory: Category) => {
      setCategory(newCategory);
    },
    [setCategory]
  );

  const handleStartComparing = React.useCallback(() => {
    // TODO: Navigate to comparison view or start a new match
    console.log("Start comparing with category:", category);
  }, [category]);

  // Loading skeleton
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <main className="flex flex-1 flex-col items-center px-4 py-8">
          {/* Hero skeleton */}
          <div className="flex flex-col items-center gap-6 py-12 md:py-16 lg:py-20">
            <Skeleton className="h-12 w-64 sm:h-14 sm:w-80 md:h-16 md:w-96" />
            <Skeleton className="h-6 w-48 sm:w-64 md:w-80" />
            <Skeleton className="mt-4 h-10 w-40" />
          </div>

          {/* Category selector skeleton */}
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
