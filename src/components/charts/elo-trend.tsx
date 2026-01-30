"use client";

import { SparkAreaChart, Card, Text, Metric, Flex } from "@tremor/react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface EloDataPoint {
  date: string;
  elo: number;
}

interface EloTrendProps {
  data: EloDataPoint[];
  currentElo?: number;
  title?: string;
  className?: string;
  showChange?: boolean;
  color?: "emerald" | "blue" | "violet" | "amber" | "red" | "rose";
}

/**
 * Sparkline chart for displaying 7-day Elo rating trends.
 * Shows current Elo, optional trend indicator, and a compact area chart.
 */
export function EloTrend({
  data,
  currentElo,
  title = "Elo Rating",
  className,
  showChange = true,
  color = "blue",
}: EloTrendProps) {
  const { change, changePercent, isPositive, displayElo } = useMemo(() => {
    if (!data.length) {
      return {
        change: 0,
        changePercent: 0,
        isPositive: true,
        displayElo: currentElo ?? 0,
      };
    }

    const latestElo = currentElo ?? data[data.length - 1].elo;
    const firstElo = data[0].elo;
    const diff = latestElo - firstElo;
    const percent = firstElo > 0 ? (diff / firstElo) * 100 : 0;

    return {
      change: diff,
      changePercent: percent,
      isPositive: diff >= 0,
      displayElo: latestElo,
    };
  }, [data, currentElo]);

  if (!data.length) {
    return (
      <Card className={cn("p-4", className)}>
        <Text>{title}</Text>
        <Text className="text-muted-foreground">No data available</Text>
      </Card>
    );
  }

  return (
    <Card
      className={cn("p-4", className)}
      role="figure"
      aria-label={`${title}: ${displayElo}${showChange ? `, ${isPositive ? "up" : "down"} ${Math.abs(change).toFixed(0)} points` : ""}`}
    >
      <Flex alignItems="start" className="gap-4">
        <div className="flex-1">
          <Text className="text-muted-foreground">{title}</Text>
          <Metric className="mt-1">{displayElo.toFixed(0)}</Metric>
          {showChange && (
            <Flex className="mt-1 gap-1" justifyContent="start">
              <Text
                className={cn(
                  "text-sm font-medium",
                  isPositive ? "text-emerald-600" : "text-red-600"
                )}
              >
                {isPositive ? "+" : ""}
                {change.toFixed(0)}
              </Text>
              <Text className="text-sm text-muted-foreground">
                ({isPositive ? "+" : ""}
                {changePercent.toFixed(1)}%)
              </Text>
            </Flex>
          )}
        </div>

        <div className="w-24 h-12 flex-shrink-0">
          <SparkAreaChart
            data={data}
            categories={["elo"]}
            index="date"
            colors={[isPositive ? "emerald" : "red"]}
            className="h-12 w-24"
            curveType="monotone"
          />
        </div>
      </Flex>

      {/* Accessible data (hidden visually) */}
      <div className="sr-only">
        <h3>{title} trend data</h3>
        <ul>
          {data.map((point) => (
            <li key={point.date}>
              {point.date}: {point.elo}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export type { EloTrendProps, EloDataPoint };
