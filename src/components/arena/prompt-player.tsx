"use client"

import * as React from "react"
import { useState } from "react"
import { ChevronDown, ChevronUp, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { AudioPlayer, type AudioSource } from "@/components/audio"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface PromptPlayerProps {
  /** Audio source for the prompt */
  audioSrc?: AudioSource
  /** Optional text content of the prompt */
  promptText?: string
  /** Whether to show the text toggle */
  showTextToggle?: boolean
  /** Loading state */
  isLoading?: boolean
  /** Additional class names */
  className?: string
}

/**
 * PromptPlayer - Audio player for the arena prompt
 *
 * Displays the prompt audio with an optional collapsible text section.
 */
export function PromptPlayer({
  audioSrc,
  promptText,
  showTextToggle = true,
  isLoading = false,
  className,
}: PromptPlayerProps) {
  const [showText, setShowText] = useState(false)

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="size-4 text-primary" />
            Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3 animate-pulse">
            <div className="size-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-12 w-full bg-muted rounded" />
              <div className="flex justify-between">
                <div className="h-3 w-10 bg-muted rounded" />
                <div className="h-3 w-10 bg-muted rounded" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mic className="size-4 text-primary" />
          Prompt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Audio Player */}
        <AudioPlayer
          src={audioSrc}
          waveformHeight={40}
          waveformSamples={80}
        />

        {/* Text Toggle */}
        {showTextToggle && promptText && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowText(!showText)}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {showText ? (
                <>
                  <ChevronUp className="size-3 mr-1" />
                  Hide transcript
                </>
              ) : (
                <>
                  <ChevronDown className="size-3 mr-1" />
                  Show transcript
                </>
              )}
            </Button>

            {showText && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                {promptText}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
