"use client";

import { BarChart, Card, Title, Text } from "@tremor/react";
import { cn } from "@/lib/utils";

interface MetricData {
  provider: string;
  [metricName: string]: string | number;
}

interface MetricsBarProps {
  data: MetricData[];
  metrics: string[];
  title?: string;
  description?: string;
  className?: string;
  layout?: "vertical" | "horizontal";
  showLegend?: boolean;
  showGridLines?: boolean;
  yAxisWidth?: number;
  colors?: string[];
}

const TREMOR_COLORS: (
  | "blue"
  | "cyan"
  | "sky"
  | "teal"
  | "emerald"
  | "green"
  | "lime"
  | "yellow"
  | "amber"
  | "orange"
  | "red"
  | "rose"
  | "pink"
  | "fuchsia"
  | "purple"
  | "violet"
  | "indigo"
  | "slate"
  | "gray"
  | "zinc"
  | "neutral"
  | "stone"
)[] = ["blue", "emerald", "violet", "amber", "rose"];

/**
 * Bar chart component for comparing metrics across providers.
 * Built on Tremor's BarChart with shadcn theme integration.
 */
export function MetricsBar({
  data,
  metrics,
  title,
  description,
  className,
  layout = "vertical",
  showLegend = true,
  showGridLines = true,
  yAxisWidth = 56,
  colors = TREMOR_COLORS,
}: MetricsBarProps) {
  if (!data.length || !metrics.length) {
    return (
      <Card className={cn("p-4", className)}>
        <Text>No data available</Text>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      {title && <Title className="mb-1">{title}</Title>}
      {description && (
        <Text className="mb-4 text-muted-foreground">{description}</Text>
      )}

      <div
        className="w-full"
        role="figure"
        aria-label={`Bar chart comparing ${metrics.join(", ")} across ${data.map((d) => d.provider).join(", ")}`}
      >
        <BarChart
          data={data}
          index="provider"
          categories={metrics}
          colors={colors}
          layout={layout}
          showLegend={showLegend}
          showGridLines={showGridLines}
          yAxisWidth={yAxisWidth}
          className="h-72"
          showAnimation
          animationDuration={500}
        />
      </div>

      {/* Accessible data table (hidden visually, available to screen readers) */}
      <table className="sr-only">
        <caption>
          {title || "Metrics comparison"} data table
        </caption>
        <thead>
          <tr>
            <th scope="col">Provider</th>
            {metrics.map((metric) => (
              <th key={metric} scope="col">
                {metric}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.provider}>
              <td>{row.provider}</td>
              {metrics.map((metric) => (
                <td key={metric}>{row[metric]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export type { MetricsBarProps, MetricData };
