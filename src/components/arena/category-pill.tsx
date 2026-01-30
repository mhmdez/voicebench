"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/prompt";

const categoryPillVariants = cva(
  "inline-flex items-center justify-center rounded-full text-sm font-medium transition-all cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-8 px-4 py-1",
        sm: "h-7 px-3 text-xs",
        lg: "h-9 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Display labels for each category
 */
export const categoryLabels: Record<Category, string> = {
  general: "General",
  "customer-support": "Customer Support",
  "information-retrieval": "Information Retrieval",
  creative: "Creative",
  multilingual: "Multilingual",
};

export interface CategoryPillProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange">,
    VariantProps<typeof categoryPillVariants> {
  /** The category this pill represents */
  category: Category;
  /** Whether this pill is currently selected */
  selected?: boolean;
  /** Custom label override (defaults to categoryLabels mapping) */
  label?: string;
}

/**
 * CategoryPill - Individual selectable pill button for a category
 *
 * Displays filled when selected, outline when not.
 * Keyboard accessible with proper focus states.
 */
const CategoryPill = React.forwardRef<HTMLButtonElement, CategoryPillProps>(
  (
    { className, category, selected = false, label, size, disabled, ...props },
    ref
  ) => {
    const displayLabel = label ?? categoryLabels[category];
    const variant = selected ? "default" : "outline";

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={`Select ${displayLabel} category`}
        disabled={disabled}
        className={cn(categoryPillVariants({ variant, size }), className)}
        {...props}
      >
        {displayLabel}
      </button>
    );
  }
);

CategoryPill.displayName = "CategoryPill";

export { CategoryPill, categoryPillVariants };
