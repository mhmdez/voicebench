"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ArenaHeroProps {
  /** Callback when "Start Comparing" is clicked */
  onStartComparing?: () => void;
  /** Disable the button */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * ArenaHero - Hero section for the Arena page
 *
 * Displays the project tagline and a call-to-action button.
 */
export function ArenaHero({
  onStartComparing,
  disabled = false,
  className,
}: ArenaHeroProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center gap-6 px-4 py-12 text-center md:py-16 lg:py-20",
        className
      )}
    >
      {/* Main Tagline */}
      <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
        Voice AI Arena
      </h1>

      {/* Subtitle */}
      <p className="max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl">
        Blind comparison of speech-to-speech models
      </p>

      {/* CTA Button */}
      <Button
        size="lg"
        onClick={onStartComparing}
        disabled={disabled}
        className="mt-4 px-8"
      >
        Start Comparing
      </Button>
    </section>
  );
}
