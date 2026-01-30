"use client";

import { Card, Title, Text } from "@tremor/react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface ScoreDimension {
  dimension: string;
  score: number;
  maxScore?: number;
}

interface ProviderScores {
  provider: string;
  dimensions: ScoreDimension[];
  color?: string;
}

interface ScoreRadarProps {
  data: ProviderScores[];
  title?: string;
  description?: string;
  className?: string;
}

const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/**
 * Radar chart component for displaying multi-dimension scores across providers.
 * Uses SVG for custom radar visualization with shadcn theme colors.
 */
export function ScoreRadar({
  data,
  title,
  description,
  className,
}: ScoreRadarProps) {
  const dimensions = useMemo(() => {
    if (!data.length) return [];
    return data[0].dimensions.map((d) => d.dimension);
  }, [data]);

  const numDimensions = dimensions.length;

  // Calculate radar polygon points
  const getPolygonPoints = (
    scores: ScoreDimension[],
    centerX: number,
    centerY: number,
    radius: number
  ): string => {
    return scores
      .map((score, i) => {
        const angle = (Math.PI * 2 * i) / numDimensions - Math.PI / 2;
        const normalizedScore = score.score / (score.maxScore || 100);
        const x = centerX + Math.cos(angle) * radius * normalizedScore;
        const y = centerY + Math.sin(angle) * radius * normalizedScore;
        return `${x},${y}`;
      })
      .join(" ");
  };

  // Grid lines for reference
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const centerX = 150;
  const centerY = 150;
  const radius = 100;

  if (!data.length || !numDimensions) {
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

      <div className="flex flex-col lg:flex-row items-center gap-4">
        <svg
          viewBox="0 0 300 300"
          className="w-full max-w-[300px] h-auto"
          role="img"
          aria-label={`Radar chart showing scores for ${data.map((d) => d.provider).join(", ")}`}
        >
          {/* Grid circles */}
          {gridLevels.map((level) => (
            <circle
              key={level}
              cx={centerX}
              cy={centerY}
              r={radius * level}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              className="text-border"
            />
          ))}

          {/* Axis lines */}
          {dimensions.map((_, i) => {
            const angle = (Math.PI * 2 * i) / numDimensions - Math.PI / 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={x}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                className="text-border"
              />
            );
          })}

          {/* Dimension labels */}
          {dimensions.map((dim, i) => {
            const angle = (Math.PI * 2 * i) / numDimensions - Math.PI / 2;
            const labelRadius = radius + 25;
            const x = centerX + Math.cos(angle) * labelRadius;
            const y = centerY + Math.sin(angle) * labelRadius;
            return (
              <text
                key={dim}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs"
                fontSize="11"
              >
                {dim}
              </text>
            );
          })}

          {/* Data polygons */}
          {data.map((provider, idx) => {
            const color = provider.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            return (
              <polygon
                key={provider.provider}
                points={getPolygonPoints(
                  provider.dimensions,
                  centerX,
                  centerY,
                  radius
                )}
                fill={color}
                fillOpacity={0.2}
                stroke={color}
                strokeWidth={2}
                className="transition-all duration-300 hover:fill-opacity-30"
              />
            );
          })}

          {/* Data points */}
          {data.map((provider, providerIdx) => {
            const color =
              provider.color || DEFAULT_COLORS[providerIdx % DEFAULT_COLORS.length];
            return provider.dimensions.map((score, i) => {
              const angle = (Math.PI * 2 * i) / numDimensions - Math.PI / 2;
              const normalizedScore = score.score / (score.maxScore || 100);
              const x = centerX + Math.cos(angle) * radius * normalizedScore;
              const y = centerY + Math.sin(angle) * radius * normalizedScore;
              return (
                <circle
                  key={`${provider.provider}-${i}`}
                  cx={x}
                  cy={y}
                  r={4}
                  fill={color}
                  className="transition-all duration-200"
                >
                  <title>
                    {provider.provider} - {score.dimension}: {score.score}
                  </title>
                </circle>
              );
            });
          })}
        </svg>

        {/* Legend */}
        <div
          className="flex flex-wrap lg:flex-col gap-2"
          role="list"
          aria-label="Chart legend"
        >
          {data.map((provider, idx) => {
            const color =
              provider.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            return (
              <div
                key={provider.provider}
                className="flex items-center gap-2"
                role="listitem"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <Text className="text-sm">{provider.provider}</Text>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export type { ScoreRadarProps, ProviderScores, ScoreDimension };
