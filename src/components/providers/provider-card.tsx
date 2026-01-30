'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { Provider, ProviderType } from '@/types/provider';

/** Health status for a provider */
export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown';

/** Props for ProviderCard component */
export interface ProviderCardProps {
  /** Provider data */
  provider: Provider;
  /** Current health status */
  healthStatus?: HealthStatus;
  /** Current Elo rating (if available) */
  eloRating?: number;
  /** Display variant */
  variant?: 'default' | 'compact';
  /** Show active toggle */
  showToggle?: boolean;
  /** Callback when active state changes */
  onActiveChange?: (isActive: boolean) => void;
  /** Additional class names */
  className?: string;
  /** Click handler for card selection */
  onClick?: () => void;
}

/** Badge variant mapping for provider types */
const providerTypeBadgeVariant: Record<
  ProviderType,
  'default' | 'secondary' | 'outline'
> = {
  openai: 'default',
  gemini: 'secondary',
  elevenlabs: 'outline',
  custom: 'outline',
};

/** Display labels for provider types */
const providerTypeLabels: Record<ProviderType, string> = {
  openai: 'OpenAI',
  gemini: 'Gemini',
  elevenlabs: 'ElevenLabs',
  custom: 'Custom',
};

/** Health status indicator component */
function HealthIndicator({
  status,
  className,
}: {
  status: HealthStatus;
  className?: string;
}) {
  const statusColors: Record<HealthStatus, string> = {
    healthy: 'bg-green-500',
    unhealthy: 'bg-red-500',
    unknown: 'bg-gray-400',
  };

  const statusLabels: Record<HealthStatus, string> = {
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
    unknown: 'Unknown',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full',
          statusColors[status]
        )}
        aria-hidden="true"
      />
      <span className="text-xs text-muted-foreground">
        {statusLabels[status]}
      </span>
    </div>
  );
}

/** Elo rating display component */
function EloDisplay({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="text-xs text-muted-foreground">Elo:</span>
      <span className="text-sm font-semibold tabular-nums">{rating}</span>
    </div>
  );
}

/**
 * ProviderCard - Displays provider information with health status and rating
 *
 * @example
 * ```tsx
 * <ProviderCard
 *   provider={provider}
 *   healthStatus="healthy"
 *   eloRating={1450}
 *   showToggle
 *   onActiveChange={(active) => console.log(active)}
 * />
 * ```
 */
export function ProviderCard({
  provider,
  healthStatus = 'unknown',
  eloRating,
  variant = 'default',
  showToggle = false,
  onActiveChange,
  className,
  onClick,
}: ProviderCardProps) {
  const isCompact = variant === 'compact';

  const handleToggle = (checked: boolean) => {
    onActiveChange?.(checked);
  };

  // Compact variant - inline display
  if (isCompact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border bg-card p-2 px-3',
          onClick && 'cursor-pointer hover:bg-accent/50 transition-colors',
          className
        )}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        {/* Health dot */}
        <span
          className={cn(
            'inline-block h-2 w-2 shrink-0 rounded-full',
            healthStatus === 'healthy' && 'bg-green-500',
            healthStatus === 'unhealthy' && 'bg-red-500',
            healthStatus === 'unknown' && 'bg-gray-400'
          )}
          aria-label={`Health: ${healthStatus}`}
        />

        {/* Name */}
        <span className="font-medium truncate flex-1">{provider.name}</span>

        {/* Type badge */}
        <Badge
          variant={providerTypeBadgeVariant[provider.type]}
          className="text-[10px] px-1.5 py-0"
        >
          {providerTypeLabels[provider.type]}
        </Badge>

        {/* Elo (compact) */}
        {eloRating !== undefined && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {eloRating}
          </span>
        )}

        {/* Toggle */}
        {showToggle && (
          <Checkbox
            checked={provider.isActive}
            onCheckedChange={handleToggle}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Toggle ${provider.name} active`}
          />
        )}
      </div>
    );
  }

  // Default variant - full card
  return (
    <Card
      className={cn(
        onClick && 'cursor-pointer hover:border-primary/50 transition-colors',
        !provider.isActive && 'opacity-60',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <CardTitle className="flex items-center gap-2">
              {provider.name}
              <Badge variant={providerTypeBadgeVariant[provider.type]}>
                {providerTypeLabels[provider.type]}
              </Badge>
            </CardTitle>
            <CardDescription className="flex items-center gap-3">
              <HealthIndicator status={healthStatus} />
              {eloRating !== undefined && <EloDisplay rating={eloRating} />}
            </CardDescription>
          </div>
          {showToggle && (
            <CardAction>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {provider.isActive ? 'Active' : 'Inactive'}
                </span>
                <Checkbox
                  checked={provider.isActive}
                  onCheckedChange={handleToggle}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Toggle ${provider.name} active`}
                />
              </div>
            </CardAction>
          )}
        </div>
      </CardHeader>

      {/* Model info if available */}
      {provider.config.model && (
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Model:</span> {provider.config.model}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default ProviderCard;
