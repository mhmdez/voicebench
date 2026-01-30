"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertCircle, Loader2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useArenaStore } from "@/stores/arena-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { PromptPlayer } from "./prompt-player"
import { ResponseCard } from "./response-card"
import { VoteButtons, type ArenaVoteWinner } from "./vote-buttons"
import { RevealView, type ArenaVoteResult } from "./reveal-view"

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
 * Requirements:
 * - vote buttons disabled until both responses played
 * - keyboard shortcuts: ArrowLeft=A, ArrowDown=tie, ArrowRight=B when voting enabled
 * - on vote: POST /api/arena/vote, toast, then show reveal view (ProviderCard + Elo deltas)
 */
export function MatchView({ onVoteSubmit, onGenerateMatch, className }: MatchViewProps) {
  const {
    currentMatch,
    votingState,
    isLoading,
    error,
    setVotingState,
    submitVote,
    setError,
  } = useArenaStore()

  const [playedA, setPlayedA] = useState(false)
  const [playedB, setPlayedB] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSubmittingVote, setIsSubmittingVote] = useState(false)
  const [voteResult, setVoteResult] = useState<ArenaVoteResult | null>(null)

  const canVote = useMemo(
    () => playedA && playedB && !voteResult && votingState !== "revealed" && !isSubmittingVote,
    [playedA, playedB, voteResult, votingState, isSubmittingVote]
  )

  // Reset per-match state
  useEffect(() => {
    setPlayedA(false)
    setPlayedB(false)
    setVoteResult(null)
    setIsSubmittingVote(false)
  }, [currentMatch?.id])

  // Promote to voting state when ready
  useEffect(() => {
    if (playedA && playedB && votingState === "idle") {
      setVotingState("voting")
    }
  }, [playedA, playedB, votingState, setVotingState])

  const handleGenerateMatch = useCallback(async () => {
    if (!onGenerateMatch) return

    setIsGenerating(true)
    setError(null)

    try {
      await onGenerateMatch()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate match"
      setError(msg)
    } finally {
      setIsGenerating(false)
    }
  }, [onGenerateMatch, setError])

  const handleVote = useCallback(
    async (winner: ArenaVoteWinner) => {
      if (!currentMatch || !canVote) return

      setIsSubmittingVote(true)
      const toastId = toast.loading("Submitting vote...")

      try {
        const res = await fetch("/api/arena/vote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId: currentMatch.id,
            winner,
          }),
        })

        const data = (await res.json()) as ArenaVoteResult | { error?: string; details?: string }

        if (!res.ok || !(data as ArenaVoteResult).success) {
          const msg = (data as any)?.error || (data as any)?.details || `Vote failed (${res.status})`
          toast.error(msg, { id: toastId })
          return
        }

        const result = data as ArenaVoteResult
        setVoteResult(result)

        // Record in local store history
        const winnerId =
          result.winner === "A"
            ? currentMatch.modelA.id
            : result.winner === "B"
              ? currentMatch.modelB.id
              : null

        submitVote(winnerId)
        onVoteSubmit?.(winnerId)

        // Immediately show reveal view
        setVotingState("revealed")

        toast.success("Vote recorded", { id: toastId })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to submit vote", { id: toastId })
      } finally {
        setIsSubmittingVote(false)
      }
    },
    [canVote, currentMatch, onVoteSubmit, setVotingState, submitVote]
  )

  if (isLoading || isGenerating) {
    return (
      <div className={cn("w-full space-y-6", className)}>
        <PromptPlayer isLoading />
        <div className="grid gap-4 md:grid-cols-2">
          <ResponseCard label="A" isLoading />
          <ResponseCard label="B" isLoading />
        </div>
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Generating match...</p>
        </div>
      </div>
    )
  }

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
            <RefreshCw className="mr-2 size-4" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

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

  return (
    <div className={cn("w-full space-y-6", className)}>
      <PromptPlayer
        audioSrc={undefined}
        promptText={currentMatch.promptText}
        showTextToggle={!!currentMatch.promptText}
      />

      <div className="text-center">
        {!playedA && !playedB && (
          <p className="text-sm text-muted-foreground">Listen to both responses before voting</p>
        )}
        {playedA && !playedB && (
          <p className="text-sm text-muted-foreground">Now listen to Response B</p>
        )}
        {!playedA && playedB && (
          <p className="text-sm text-muted-foreground">Now listen to Response A</p>
        )}
        {playedA && playedB && !voteResult && (
          <p className="text-sm text-muted-foreground">Vote below (or use the arrow keys)</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ResponseCard
          label="A"
          audioSrc={currentMatch.audioUrlA}
          hasPlayed={playedA}
          onPlayComplete={() => setPlayedA(true)}
          revealedProvider={voteResult ? voteResult.providerA.name : undefined}
        />
        <ResponseCard
          label="B"
          audioSrc={currentMatch.audioUrlB}
          hasPlayed={playedB}
          onPlayComplete={() => setPlayedB(true)}
          revealedProvider={voteResult ? voteResult.providerB.name : undefined}
        />
      </div>

      {voteResult ? (
        <RevealView match={currentMatch} result={voteResult} onPlayAnother={handleGenerateMatch} />
      ) : (
        <div className="pt-4">
          <VoteButtons enabled={canVote} submitting={isSubmittingVote} onVote={handleVote} />
        </div>
      )}
    </div>
  )
}
