"use client"

import { useEffect } from "react"
import { Pause, Play, AlertCircle, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Waveform } from "./waveform"
import { useAudioPlayer, type AudioSource } from "@/hooks/use-audio-player"

export interface AudioPlayerProps {
  /** Audio source - URL string or AudioBuffer */
  src?: AudioSource
  /** Called when playback completes */
  onComplete?: () => void
  /** Called when an error occurs */
  onError?: (error: Error) => void
  /** Called when play state changes */
  onPlayStateChange?: (isPlaying: boolean) => void
  /** Number of waveform samples */
  waveformSamples?: number
  /** Whether to show the waveform */
  showWaveform?: boolean
  /** Height of the waveform */
  waveformHeight?: number
  /** Additional class name */
  className?: string
  /** Compact mode - smaller size */
  compact?: boolean
}

/**
 * Format time in seconds to MM:SS or HH:MM:SS format
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00"
  
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

/**
 * Reusable audio player component with waveform visualization.
 * Uses Web Audio API for playback and analysis.
 */
export function AudioPlayer({
  src,
  onComplete,
  onError,
  onPlayStateChange,
  waveformSamples = 100,
  showWaveform = true,
  waveformHeight = 48,
  className,
  compact = false,
}: AudioPlayerProps) {
  const {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    progress,
    waveformData,
    toggle,
    seekPercent,
    load,
    error,
  } = useAudioPlayer(src, {
    onComplete,
    onError,
    waveformSamples,
  })

  // Notify parent of play state changes
  useEffect(() => {
    onPlayStateChange?.(isPlaying)
  }, [isPlaying, onPlayStateChange])

  // Reload when src changes
  useEffect(() => {
    if (src) {
      load(src)
    }
  }, [src, load])

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3",
          className
        )}
        role="alert"
      >
        <AlertCircle className="size-5 text-destructive shrink-0" />
        <span className="text-sm text-destructive">
          Failed to load audio: {error.message}
        </span>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border bg-card p-3",
          compact ? "p-2" : "p-3",
          className
        )}
        aria-label="Loading audio player"
      >
        <Skeleton className={cn("rounded-full", compact ? "size-8" : "size-10")} />
        <div className="flex-1 space-y-2">
          {showWaveform && (
            <Skeleton className="w-full" style={{ height: waveformHeight }} />
          )}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
      </div>
    )
  }

  // No source state
  if (!src && waveformData.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border border-dashed bg-muted/50 p-3",
          compact ? "p-2" : "p-3",
          className
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted",
            compact ? "size-8" : "size-10"
          )}
        >
          <Volume2 className={cn("text-muted-foreground", compact ? "size-4" : "size-5")} />
        </div>
        <span className="text-sm text-muted-foreground">No audio loaded</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card",
        compact ? "p-2" : "p-3",
        className
      )}
      role="region"
      aria-label="Audio player"
    >
      {/* Play/Pause Button */}
      <Button
        variant="default"
        size={compact ? "icon-sm" : "icon"}
        onClick={toggle}
        aria-label={isPlaying ? "Pause" : "Play"}
        className="shrink-0 rounded-full"
      >
        {isPlaying ? (
          <Pause className={compact ? "size-4" : "size-5"} />
        ) : (
          <Play className={cn(compact ? "size-4" : "size-5", "ml-0.5")} />
        )}
      </Button>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Waveform */}
        {showWaveform && (
          <Waveform
            data={waveformData}
            progress={progress}
            onSeek={seekPercent}
            height={waveformHeight}
            className="rounded"
          />
        )}

        {/* Time Display */}
        <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
          <span aria-label="Current time">{formatTime(currentTime)}</span>
          <span aria-label="Duration">{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  )
}

export { type AudioSource }
