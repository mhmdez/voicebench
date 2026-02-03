"use client"

import * as React from "react"
import Link from "next/link"
import { RefreshCw } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProviderCard } from "@/components/providers/provider-card"
import { EloChangeStatic } from "@/components/arena/elo-change"
import type { CurrentMatch } from "@/stores/arena-store"
import type { Provider, ProviderType } from "@/types/provider"

export interface ArenaVoteResult {
  success: true
  voteId: string
  matchId: string
  winner: "A" | "B" | "tie"
  providerA: {
    name: string
    oldElo: number
    newElo: number
  }
  providerB: {
    name: string
    oldElo: number
    newElo: number
  }
  category: string
}

export interface RevealViewProps {
  match: CurrentMatch
  result: ArenaVoteResult
  onPlayAnother?: () => void | Promise<void>
  className?: string
}

function toProviderType(value: string | undefined): ProviderType {
  if (value === "openai" || value === "gemini" || value === "elevenlabs" || value === "retell" || value === "custom") {
    return value
  }
  return "custom"
}

function toProvider(matchSide: CurrentMatch["modelA"], nameOverride?: string): Provider {
  const idNum = Number(matchSide.id)
  return {
    id: Number.isFinite(idNum) ? idNum : 0,
    name: nameOverride ?? matchSide.name,
    type: toProviderType(matchSide.provider),
    config: {
      model: matchSide.name,
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export function RevealView({ match, result, onPlayAnother, className }: RevealViewProps) {
  const providerA = React.useMemo(
    () => toProvider(match.modelA, result.providerA.name),
    [match.modelA, result.providerA.name]
  )
  const providerB = React.useMemo(
    () => toProvider(match.modelB, result.providerB.name),
    [match.modelB, result.providerB.name]
  )

  const winnerLabel =
    result.winner === "tie"
      ? "Tie"
      : result.winner === "A"
        ? "A"
        : "B"

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-center">Reveal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Winner</p>
          <p className="mt-1 text-base font-semibold">{winnerLabel}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Response A</p>
              <EloChangeStatic previousElo={result.providerA.oldElo} newElo={result.providerA.newElo} />
            </div>
            <ProviderCard provider={providerA} eloRating={result.providerA.newElo} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Response B</p>
              <EloChangeStatic previousElo={result.providerB.oldElo} newElo={result.providerB.newElo} />
            </div>
            <ProviderCard provider={providerB} eloRating={result.providerB.newElo} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button size="lg" onClick={() => void onPlayAnother?.()} className="min-w-[200px]">
            <RefreshCw className="mr-2 size-4" />
            Play Another
          </Button>
          <Button asChild variant="outline" size="lg" className="min-w-[200px]">
            <Link href="/leaderboard">View Leaderboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
