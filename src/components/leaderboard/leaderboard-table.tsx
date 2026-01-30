"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, Trophy, Medal, Award } from "lucide-react";

/**
 * Confidence interval for Elo rating
 */
interface ConfidenceInterval {
  lower: number;
  upper: number;
}

/**
 * Leaderboard entry data
 */
export interface LeaderboardEntry {
  rank: number;
  providerId: number;
  providerName: string;
  elo: number;
  matchCount: number;
  winRate: number;
  confidence: ConfidenceInterval | null;
}

/**
 * Sort direction
 */
type SortDirection = "asc" | "desc";

/**
 * Sortable column keys
 */
type SortKey = "rank" | "providerName" | "elo" | "matchCount" | "winRate";

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  isLoading?: boolean;
}

/**
 * Rank badge component showing trophy/medal for top 3
 */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <span className="font-bold text-yellow-600 dark:text-yellow-400">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center gap-2">
        <Medal className="h-5 w-5 text-gray-400" />
        <span className="font-bold text-gray-500 dark:text-gray-300">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-amber-600" />
        <span className="font-bold text-amber-700 dark:text-amber-500">3</span>
      </div>
    );
  }
  return <span className="text-muted-foreground">{rank}</span>;
}

/**
 * Sortable column header component
 */
function SortableHeader({
  children,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentSortKey === sortKey;

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        "flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer select-none",
        isActive && "text-foreground",
        className
      )}
    >
      {children}
      <span className="flex flex-col -space-y-1">
        <ChevronUp
          className={cn(
            "h-3 w-3 transition-opacity",
            isActive && sortDirection === "asc"
              ? "opacity-100"
              : "opacity-30"
          )}
        />
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-opacity",
            isActive && sortDirection === "desc"
              ? "opacity-100"
              : "opacity-30"
          )}
        />
      </span>
    </button>
  );
}

/**
 * Loading skeleton for the table
 */
function TableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Rank</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead className="text-right">Elo</TableHead>
          <TableHead className="text-right">Matches</TableHead>
          <TableHead className="text-right">Win Rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-5 w-8" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-32" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-5 w-20 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-5 w-12 ml-auto" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="h-5 w-16 ml-auto" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">
        No rankings yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Be the first to contribute! Start comparing providers in the Arena to
        help build the leaderboard.
      </p>
    </div>
  );
}

/**
 * LeaderboardTable - Sortable table displaying provider rankings
 *
 * Features:
 * - Sortable columns by clicking headers
 * - Trophy/medal icons for top 3
 * - Confidence intervals displayed when available
 * - Loading skeleton state
 * - Empty state when no data
 * - Responsive with horizontal scroll on mobile
 */
export function LeaderboardTable({ data, isLoading }: LeaderboardTableProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>("rank");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc");

  // Handle sort toggle
  const handleSort = React.useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        // Toggle direction
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      } else {
        // New column, default to appropriate direction
        setSortKey(key);
        // Rank should default to asc, others to desc
        setSortDirection(key === "rank" || key === "providerName" ? "asc" : "desc");
      }
    },
    [sortKey]
  );

  // Sort data
  const sortedData = React.useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "rank":
          comparison = a.rank - b.rank;
          break;
        case "providerName":
          comparison = a.providerName.localeCompare(b.providerName);
          break;
        case "elo":
          comparison = a.elo - b.elo;
          break;
        case "matchCount":
          comparison = a.matchCount - b.matchCount;
          break;
        case "winRate":
          comparison = a.winRate - b.winRate;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [data, sortKey, sortDirection]);

  // Loading state
  if (isLoading) {
    return <TableSkeleton />;
  }

  // Empty state
  if (!data || data.length === 0) {
    return <EmptyState />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">
            <SortableHeader
              sortKey="rank"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              Rank
            </SortableHeader>
          </TableHead>
          <TableHead>
            <SortableHeader
              sortKey="providerName"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
            >
              Provider
            </SortableHeader>
          </TableHead>
          <TableHead className="text-right">
            <SortableHeader
              sortKey="elo"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="justify-end"
            >
              Elo
            </SortableHeader>
          </TableHead>
          <TableHead className="text-right">
            <SortableHeader
              sortKey="matchCount"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="justify-end"
            >
              Matches
            </SortableHeader>
          </TableHead>
          <TableHead className="text-right">
            <SortableHeader
              sortKey="winRate"
              currentSortKey={sortKey}
              sortDirection={sortDirection}
              onSort={handleSort}
              className="justify-end"
            >
              Win Rate
            </SortableHeader>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((entry) => (
          <TableRow key={entry.providerId}>
            <TableCell>
              <RankBadge rank={entry.rank} />
            </TableCell>
            <TableCell className="font-medium">{entry.providerName}</TableCell>
            <TableCell className="text-right">
              <div className="flex flex-col items-end">
                <span className="font-semibold tabular-nums">{entry.elo}</span>
                {entry.confidence && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ±{Math.round((entry.confidence.upper - entry.confidence.lower) / 2)}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {entry.matchCount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {(entry.winRate * 100).toFixed(1)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
