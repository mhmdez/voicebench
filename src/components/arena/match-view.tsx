"use client"

import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useArenaStore, type CurrentMatch } from "@/stores/arena-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PromptPlayer } from "./prompt-player"
import { ResponseCard } from "./response-card"

export interface MatchViewProps {
  /** Callback when a vote is submitted */
  onVoteSubmit?: (winnerId: string | null) => void
  /** Callback to generate a new match */
  onGenerateMatch?: () => Promise<void>
  /** Additional class names */
  className?: string
}

/**
 * MatchView - Main match comparison component for the arena
 *
 * Orchestrates the prompt player, response cards, and voting flow.
 * Ensures both responses are played before voting is enabled.
 */
export function MatchView({
  onVoteSubmit,
  onGenerateMatch,
  className,
}: MatchViewProps) {
  const {
    currentMatch,
    votingState,
    isLoading,
    error,
    setVotingState,
    submitVote,
    setLoading,
    setError,
  } = useArenaStore()

  // Track which responses have been played
  const [playedA, setPlayedA] = useState(false)
  const [playedB, setPlayedB] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<"A" | "B" | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Both responses must be played before voting
  const canVote = playedA && playedB && votingState !== "voted" && votingState !== "revealed"

  // Reset played state when match changes
  useEffect(() => {
    setPlayedA(false)
    setPlayedB(false)
    setSelectedResponse(null)
  }, [currentMatch?.id])

  // Update voting state when both responses are played
  useEffect(() => {
    if (playedA && playedB && votingState === "idle") {
      setVotingState("voting")
    }
  }, [playedA, playedB, votingState, setVotingState])

  // Handle response A playback complete
  const handlePlayCompleteA = useCallback(() => {
    setPlayedA(true)
  }, [])

  // Handle response B playback complete
  const handlePlayCompleteB = useCallback(() => {
    setPlayedB(true)
  }, [])

  // Handle response selection
  const handleSelectA = useCallback(() => {
    if (canVote) {
      setSelectedResponse("A")
    }
  }, [canVote])

  const handleSelectB = useCallback(() => {
    if (canVote) {
      setSelectedResponse("B")
    }
  }, [canVote])

  // Handle vote submission
  const handleSubmitVote = useCallback(async () => {
    if (!currentMatch || !selectedResponse) return

    const winnerId =
      selectedResponse === "A"
        ? currentMatch.modelA.id
        : currentMatch.modelB.id

    submitVote(winnerId)
    onVoteSubmit?.(winnerId)
  }, [currentMatch, selectedResponse, submitVote, onVoteSubmit])

  // Handle tie vote
  const handleTieVote = useCallback(() => {
    submitVote(null)
    onVoteSubmit?.(null)
  }, [submitVote, onVoteSubmit])

  // Handle generate new match
  const handleGenerateMatch = useCallback(async () => {
    if (!onGenerateMatch) return

    setIsGenerating(true)
    setError(null)

    try {
      await onGenerateMatch()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate match"
      setError(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }, [onGenerateMatch, setError])

  // Loading state
  if (isLoading || isGenerating) {
    return (
      <div className={cn("w-full space-y-6", className)}>
        {/* Loading Prompt */}
        <PromptPlayer isLoading />

        {/* Loading Responses */}
        <div className="grid gap-4 md:grid-cols-2">
          <ResponseCard label="A" isLoading />
          <ResponseCard label="B" isLoading />
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Generating match...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertCircle className="size-12 text-destructive" />
          <div className="text-center">
            <h3 className="font-semibold text-destructive">Error</h3>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={handleGenerateMatch} variant="outline">
            <RefreshCw className="size-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  // No match state - show prompt to generate
  if (!currentMatch) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold">Ready to Compare?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate a match to start comparing voice AI responses
            </p>
          </div>
          <Button onClick={handleGenerateMatch} size="lg">
            Generate Match
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Main match view
  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Prompt Section */}
      <PromptPlayer
        audioSrc={currentMatch.audioUrlA ? undefined : undefined} // TODO: Add prompt audio URL to match
        promptText={currentMatch.promptText}
        showTextToggle={!!currentMatch.promptText}
      />

      {/* Instructions */}
      <div className="text-center">
        {!canVote && (
          <p className="text-sm text-muted-foreground">
            {!playedA && !playedB && "Listen to both responses before voting"}
            {playedA && !playedB && "Now listen to Response B"}
            {!playedA && playedB && "Now listen to Response A"}
          </p>
        )}
        {canVote && !selectedResponse && (
          <p className="text-sm text-muted-foreground">
            Select the better response or vote for a tie
          </p>
        )}
        {selectedResponse && votingState !== "voted" && (
          <p className="text-sm text-primary font-medium">
            Response {selectedResponse} selected — confirm your vote below
          </p>
        )}
      </div>

      {/* Response Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <ResponseCard
          label="A"
          audioSrc={currentMatch.audioUrlA}
          hasPlayed={playedA}
          onPlayComplete={handlePlayCompleteA}
          isSelected={selectedResponse === "A"}
          canVote={canVote}
          onVote={handleSelectA}
          revealedProvider={
            votingState === "revealed" ? currentMatch.modelA.name : undefined
          }
        />
        <ResponseCard
          label="B"
          audioSrc={currentMatch.audioUrlB}
          hasPlayed={playedB}
          onPlayComplete={handlePlayCompleteB}
          isSelected={selectedResponse === "B"}
          canVote={canVote}
          onVote={handleSelectB}
          revealedProvider={
            votingState === "revealed" ? currentMatch.modelB.name : undefined
          }
        />
      </div>

      {/* Voting Actions */}
      {canVote && (
        <div className="flex flex-col items-center gap-3 pt-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={handleSubmitVote}
              disabled={!selectedResponse}
              size="lg"
              className="min-w-[140px]"
            >
              {selectedResponse
                ? `Vote for ${selectedResponse}`
                : "Select a Response"}
            </Button>
            <Button
              onClick={handleTieVote}
              variant="outline"
              size="lg"
            >
              It's a Tie
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your vote helps improve voice AI rankings
          </p>
        </div>
      )}

      {/* After voting - show results and next match */}
      {votingState === "voted" && (
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="text-center">
            <p className="text-sm font-medium text-green-600">
              Vote recorded! Thank you for your feedback.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setVotingState("revealed")}
              variant="outline"
            >
              Reveal Models
            </Button>
            <Button onClick={handleGenerateMatch}>
              Next Match
            </Button>
          </div>
        </div>
      )}

      {/* After reveal - show next match option */}
      {votingState === "revealed" && (
        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Response A: <span className="font-medium text-foreground">{currentMatch.modelA.name}</span>
              {" · "}
              Response B: <span className="font-medium text-foreground">{currentMatch.modelB.name}</span>
            </p>
          </div>
          <Button onClick={handleGenerateMatch} size="lg">
            <RefreshCw className="size-4 mr-2" />
            Next Match
          </Button>
        </div>
      )}
    </div>
  )
}
