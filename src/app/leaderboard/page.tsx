"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeaderboardTable, type LeaderboardEntry } from "@/components/leaderboard/leaderboard-table";
import { Trophy } from "lucide-react";

/**
 * Category configuration with labels
 */
const CATEGORIES = [
  { value: "overall", label: "All" },
  { value: "general", label: "General" },
  { value: "customer-support", label: "Customer Support" },
  { value: "information-retrieval", label: "Info Retrieval" },
  { value: "creative", label: "Creative" },
  { value: "multilingual", label: "Multilingual" },
] as const;

type CategoryValue = (typeof CATEGORIES)[number]["value"];

/**
 * Leaderboard API response
 */
interface LeaderboardResponse {
  rankings: LeaderboardEntry[];
  error?: string;
}

/**
 * LeaderboardPage - Public page showing provider rankings
 *
 * Features:
 * - Category tabs at top for filtering
 * - Sortable rankings table
 * - Loading and empty states
 * - Caches data per category
 */
export default function LeaderboardPage() {
  const [category, setCategory] = React.useState<CategoryValue>("overall");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<LeaderboardEntry[]>([]);

  // Cache for fetched data
  const cache = React.useRef<Map<CategoryValue, LeaderboardEntry[]>>(new Map());

  // Fetch leaderboard data
  const fetchLeaderboard = React.useCallback(async (cat: CategoryValue) => {
    // Check cache first
    if (cache.current.has(cat)) {
      setData(cache.current.get(cat)!);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (cat !== "overall") {
        params.set("category", cat);
      }

      const url = `/api/arena/leaderboard${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.status}`);
      }

      const result: LeaderboardResponse = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Update cache and state
      cache.current.set(cat, result.rankings);
      setData(result.rankings);
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and category change
  React.useEffect(() => {
    fetchLeaderboard(category);
  }, [category, fetchLeaderboard]);

  // Handle tab change
  const handleCategoryChange = React.useCallback((value: string) => {
    setCategory(value as CategoryValue);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-1 flex-col items-center px-4 py-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 py-8 md:py-12">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500 md:h-10 md:w-10" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Leaderboard
            </h1>
          </div>
          <p className="max-w-lg text-center text-muted-foreground">
            Provider rankings based on community votes. Elo ratings are
            calculated from head-to-head comparisons in the Arena.
          </p>
        </div>

        {/* Category Tabs */}
        <div className="w-full max-w-4xl">
          <Tabs
            value={category}
            onValueChange={handleCategoryChange}
            className="w-full"
          >
            <div className="mb-6 flex justify-center">
              <TabsList className="h-auto flex-wrap gap-1 bg-muted/50 p-1">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger
                    key={cat.value}
                    value={cat.value}
                    className="px-3 py-1.5 text-sm data-[state=active]:bg-background"
                  >
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Table Content - shared across all tabs */}
            {CATEGORIES.map((cat) => (
              <TabsContent key={cat.value} value={cat.value} className="mt-0">
                {error ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-destructive mb-4">{error}</p>
                    <button
                      onClick={() => fetchLeaderboard(category)}
                      className="text-sm text-primary hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg border bg-card">
                    <LeaderboardTable data={data} isLoading={isLoading} />
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          {/* Footer info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Rankings update in real-time as matches are completed. Confidence
              intervals shown after 30+ matches.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
