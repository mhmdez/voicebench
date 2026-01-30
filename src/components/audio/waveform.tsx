"use client"

import { useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export interface WaveformProps {
  /** Waveform data normalized to 0-1 range */
  data: number[]
  /** Current progress percentage (0-100) */
  progress?: number
  /** Whether the waveform is in loading state */
  isLoading?: boolean
  /** Called when user clicks to seek */
  onSeek?: (percent: number) => void
  /** Color for played portion */
  playedColor?: string
  /** Color for unplayed portion */
  unplayedColor?: string
  /** Height of the waveform in pixels */
  height?: number
  /** Minimum bar height as fraction of total height (0-1) */
  minBarHeight?: number
  /** Gap between bars in pixels */
  barGap?: number
  /** Border radius of bars in pixels */
  barRadius?: number
  /** Additional class name */
  className?: string
}

/**
 * Waveform visualization component.
 * Displays audio amplitude data as a series of vertical bars.
 */
export function Waveform({
  data,
  progress = 0,
  isLoading = false,
  onSeek,
  playedColor = "hsl(var(--primary))",
  unplayedColor = "hsl(var(--primary) / 0.3)",
  height = 48,
  minBarHeight = 0.1,
  barGap = 2,
  barRadius = 2,
  className,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Draw waveform on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    if (data.length === 0) return

    // Calculate bar dimensions
    const barCount = data.length
    const totalGaps = (barCount - 1) * barGap
    const barWidth = Math.max(1, (rect.width - totalGaps) / barCount)
    const progressX = (progress / 100) * rect.width

    // Draw bars
    data.forEach((amplitude, index) => {
      const x = index * (barWidth + barGap)
      const barHeight = Math.max(
        height * minBarHeight,
        amplitude * height * (1 - minBarHeight) + height * minBarHeight
      )
      const y = (height - barHeight) / 2

      // Determine color based on progress
      const barMidpoint = x + barWidth / 2
      ctx.fillStyle = barMidpoint <= progressX ? playedColor : unplayedColor

      // Draw rounded rectangle
      ctx.beginPath()
      ctx.roundRect(x, y, barWidth, barHeight, barRadius)
      ctx.fill()
    })
  }, [data, progress, playedColor, unplayedColor, height, minBarHeight, barGap, barRadius])

  // Handle click to seek
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
      onSeek(percent)
    },
    [onSeek]
  )

  // Handle keyboard navigation for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!onSeek) return

      let newProgress = progress
      const step = 5 // 5% increments

      switch (e.key) {
        case "ArrowLeft":
          newProgress = Math.max(0, progress - step)
          break
        case "ArrowRight":
          newProgress = Math.min(100, progress + step)
          break
        case "Home":
          newProgress = 0
          break
        case "End":
          newProgress = 100
          break
        default:
          return
      }

      e.preventDefault()
      onSeek(newProgress)
    },
    [onSeek, progress]
  )

  // Redraw on data or progress change
  useEffect(() => {
    if (!isLoading) {
      draw()
    }
  }, [draw, isLoading])

  // Redraw on resize
  useEffect(() => {
    const handleResize = () => draw()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [draw])

  if (isLoading) {
    return (
      <div
        className={cn("relative w-full animate-pulse", className)}
        style={{ height }}
        aria-label="Loading audio waveform"
      >
        <div className="absolute inset-0 flex items-center justify-center gap-0.5">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="bg-primary/20 rounded-full"
              style={{
                width: "3px",
                height: `${20 + Math.random() * 60}%`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full",
        onSeek && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      style={{ height }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onSeek ? 0 : undefined}
      role={onSeek ? "slider" : "img"}
      aria-label="Audio waveform"
      aria-valuemin={onSeek ? 0 : undefined}
      aria-valuemax={onSeek ? 100 : undefined}
      aria-valuenow={onSeek ? Math.round(progress) : undefined}
      aria-valuetext={onSeek ? `${Math.round(progress)}% played` : undefined}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  )
}
