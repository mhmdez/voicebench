"use client"

import * as React from "react"
import { useCallback, useState } from "react"
import { Check, Play, Pause, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AudioPlayer, type AudioSource } from "@/components/audio"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export interface ResponseCardProps {
  /** Label for the response (e.g., 'A' or 'B') */
  label: string
  /** Audio source for the response */
  audioSrc?: AudioSource
  /** Whether this response has been played */
  hasPlayed?: boolean
  /** Callback when playback completes */
  onPlayComplete?: () => void
  /** Callback when play state changes */
  onPlayStateChange?: (isPlaying: boolean) => void
  /** Whether the card is selected/highlighted */
  isSelected?: boolean
  /** Whether voting is allowed (both responses played) */
  canVote?: boolean
  /** Callback when card is clicked for voting */
  onVote?: () => void
  /** Loading state */
  isLoading?: boolean
  /** Whether to show the "played" indicator */
  showPlayedIndicator?: boolean
  /** Revealed provider name (only shown after voting) */
  revealedProvider?: string
  /** Additional class names */
  className?: string
}

/**
 * ResponseCard - Individual response player card for arena comparison
 *
 * Displays a labeled response with audio player and played indicator.
 * Used in blind A/B comparisons.
 */
export function ResponseCard({
  label,
  audioSrc,
  hasPlayed = false,
  onPlayComplete,
  onPlayStateChange,
  isSelected = false,
  canVote = false,
  onVote,
  isLoading = false,
  showPlayedIndicator = true,
  revealedProvider,
  className,
}: ResponseCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayStateChange = useCallback(
    (playing: boolean) => {
      setIsPlaying(playing)
      onPlayStateChange?.(playing)
    },
    [onPlayStateChange]
  )

  const handleComplete = useCallback(() => {
    onPlayComplete?.()
  }, [onPlayComplete])

  // Loading skeleton
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-12 w-full" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-10" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        "w-full transition-all duration-200",
        canVote && "cursor-pointer hover:border-primary/50 hover:shadow-md",
        isSelected && "border-primary ring-2 ring-primary/20",
        className
      )}
      onClick={canVote ? onVote : undefined}
      role={canVote ? "button" : undefined}
      tabIndex={canVote ? 0 : undefined}
      onKeyDown={
        canVote
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onVote?.()
              }
            }
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {/* Response Label Badge */}
            <Badge
              variant={isSelected ? "default" : "secondary"}
              className={cn(
                "size-8 rounded-full text-sm font-bold",
                isPlaying && "animate-pulse"
              )}
            >
              {label}
            </Badge>
            <span className="font-medium">Response {label}</span>
          </CardTitle>

          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            {/* Playing indicator */}
            {isPlaying && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Volume2 className="size-3 animate-pulse" />
                Playing
              </Badge>
            )}

            {/* Played indicator */}
            {showPlayedIndicator && hasPlayed && !isPlaying && (
              <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-600/30">
                <Check className="size-3" />
                Played
              </Badge>
            )}

            {/* Revealed provider (after voting) */}
            {revealedProvider && (
              <Badge variant="secondary" className="text-xs">
                {revealedProvider}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Audio Player */}
        <div onClick={(e) => e.stopPropagation()}>
          <AudioPlayer
            src={audioSrc}
            onComplete={handleComplete}
            onPlayStateChange={handlePlayStateChange}
            waveformHeight={48}
            waveformSamples={60}
          />
        </div>

        {/* Vote hint when can vote */}
        {canVote && !isSelected && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Click to vote for this response
          </p>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-primary">
            <Check className="size-4" />
            Selected
          </div>
        )}
      </CardContent>
    </Card>
  )
}
