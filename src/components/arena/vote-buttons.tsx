"use client"

import * as React from "react"
import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export type ArenaVoteWinner = "A" | "B" | "tie"

export interface VoteButtonsProps {
  enabled: boolean
  onVote: (winner: ArenaVoteWinner) => void | Promise<void>
  submitting?: boolean
  className?: string
}

/**
 * VoteButtons
 *
 * Keyboard shortcuts (when enabled):
 * - ArrowLeft => A
 * - ArrowDown => tie
 * - ArrowRight => B
 */
export function VoteButtons({
  enabled,
  onVote,
  submitting = false,
  className,
}: VoteButtonsProps) {
  const isDisabled = !enabled || submitting

  useEffect(() => {
    if (!enabled || submitting) return

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return

      if (e.key === "ArrowLeft") {
        e.preventDefault()
        void onVote("A")
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        void onVote("tie")
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        void onVote("B")
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [enabled, submitting, onVote])

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          className="min-w-[140px]"
          disabled={isDisabled}
          onClick={() => void onVote("A")}
          aria-keyshortcuts="ArrowLeft"
        >
          Vote A
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={isDisabled}
          onClick={() => void onVote("tie")}
          aria-keyshortcuts="ArrowDown"
        >
          Tie
        </Button>
        <Button
          size="lg"
          className="min-w-[140px]"
          disabled={isDisabled}
          onClick={() => void onVote("B")}
          aria-keyshortcuts="ArrowRight"
        >
          Vote B
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Keyboard: ArrowLeft = A · ArrowDown = Tie · ArrowRight = B
      </p>
    </div>
  )
}
