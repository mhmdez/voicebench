"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface EloChangeProps {
  /** Previous Elo rating (used with newElo to calculate delta) */
  previousElo?: number
  /** New Elo rating (used with previousElo to calculate delta) */
  newElo?: number
  /** Direct delta value (alternative to previousElo/newElo) */
  delta?: number
  /** Animation duration in milliseconds */
  duration?: number
  /** Additional CSS classes */
  className?: string
  /** Show the absolute value without +/- prefix */
  showAbsolute?: boolean
  /** Size variant */
  size?: "sm" | "md" | "lg"
}

/**
 * Animated Elo rating change display component.
 * 
 * Shows positive changes in green with + prefix,
 * negative changes in red with - prefix.
 * Features entrance animation (fade in + slide up)
 * and animated number counting.
 */
export function EloChange({
  previousElo,
  newElo,
  delta: directDelta,
  duration = 800,
  className,
  showAbsolute = false,
  size = "md",
}: EloChangeProps) {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [isAnimating, setIsAnimating] = React.useState(true)

  // Calculate delta from props
  const delta = React.useMemo(() => {
    if (directDelta !== undefined) return directDelta
    if (previousElo !== undefined && newElo !== undefined) {
      return newElo - previousElo
    }
    return 0
  }, [directDelta, previousElo, newElo])

  // Animate the number counting
  React.useEffect(() => {
    if (delta === 0) {
      setDisplayValue(0)
      setIsAnimating(false)
      return
    }

    const startTime = performance.now()
    const startValue = 0
    const endValue = Math.abs(delta)

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      const currentValue = Math.round(startValue + (endValue - startValue) * easeOut)
      setDisplayValue(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    setIsAnimating(true)
    requestAnimationFrame(animate)
  }, [delta, duration])

  if (delta === 0) {
    return null
  }

  const isPositive = delta > 0
  const prefix = showAbsolute ? "" : isPositive ? "+" : "-"

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-semibold",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono tabular-nums",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        sizeClasses[size],
        isPositive 
          ? "text-emerald-600 dark:text-emerald-400" 
          : "text-red-600 dark:text-red-400",
        className
      )}
      role="status"
      aria-label={`Elo ${isPositive ? "increased" : "decreased"} by ${Math.abs(delta)}`}
    >
      <span className={cn(
        "transition-transform duration-200",
        isAnimating && (isPositive ? "animate-bounce-subtle" : "")
      )}>
        {isPositive ? (
          <svg
            className="size-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            className="size-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </span>
      <span>
        {prefix}{displayValue}
      </span>
    </span>
  )
}

/**
 * Static variant without counting animation - useful for lists
 */
export function EloChangeStatic({
  delta,
  previousElo,
  newElo,
  className,
  size = "md",
  showAbsolute = false,
}: Omit<EloChangeProps, "duration">) {
  const computedDelta = React.useMemo(() => {
    if (delta !== undefined) return delta
    if (previousElo !== undefined && newElo !== undefined) {
      return newElo - previousElo
    }
    return 0
  }, [delta, previousElo, newElo])

  if (computedDelta === 0) {
    return null
  }

  const isPositive = computedDelta > 0
  const prefix = showAbsolute ? "" : isPositive ? "+" : "-"

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-semibold",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono tabular-nums",
        sizeClasses[size],
        isPositive 
          ? "text-emerald-600 dark:text-emerald-400" 
          : "text-red-600 dark:text-red-400",
        className
      )}
      role="status"
      aria-label={`Elo ${isPositive ? "increased" : "decreased"} by ${Math.abs(computedDelta)}`}
    >
      {isPositive ? (
        <svg
          className="size-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          className="size-3.5"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span>
        {prefix}{Math.abs(computedDelta)}
      </span>
    </span>
  )
}
