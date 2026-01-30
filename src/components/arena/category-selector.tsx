"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/prompt";
import { CategoryPill, categoryLabels } from "./category-pill";

/**
 * All available categories in display order
 */
export const ALL_CATEGORIES: Category[] = [
  "general",
  "customer-support",
  "information-retrieval",
  "creative",
  "multilingual",
];

export interface CategorySelectorProps {
  /** Currently selected category */
  value?: Category;
  /** Callback when selection changes */
  onChange?: (category: Category) => void;
  /** Disable all pills */
  disabled?: boolean;
  /** Size variant for all pills */
  size?: "default" | "sm" | "lg";
  /** Additional class names for the container */
  className?: string;
  /** Accessible label for the group */
  "aria-label"?: string;
}

/**
 * CategorySelector - Group of CategoryPill components with single selection
 *
 * Displays all 5 categories as selectable pills.
 * Supports keyboard navigation within the group.
 */
export function CategorySelector({
  value,
  onChange,
  disabled = false,
  size = "default",
  className,
  "aria-label": ariaLabel = "Select category",
}: CategorySelectorProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !onChange) return;

      const currentIndex = value ? ALL_CATEGORIES.indexOf(value) : -1;
      let newIndex = currentIndex;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          newIndex =
            currentIndex < ALL_CATEGORIES.length - 1 ? currentIndex + 1 : 0;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          newIndex =
            currentIndex > 0 ? currentIndex - 1 : ALL_CATEGORIES.length - 1;
          break;
        case "Home":
          event.preventDefault();
          newIndex = 0;
          break;
        case "End":
          event.preventDefault();
          newIndex = ALL_CATEGORIES.length - 1;
          break;
        default:
          return;
      }

      const newCategory = ALL_CATEGORIES[newIndex];
      onChange(newCategory);

      // Focus the newly selected button
      const buttons = containerRef.current?.querySelectorAll("button");
      buttons?.[newIndex]?.focus();
    },
    [value, onChange, disabled]
  );

  const handleSelect = React.useCallback(
    (category: Category) => {
      if (!disabled && onChange) {
        onChange(category);
      }
    },
    [onChange, disabled]
  );

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {ALL_CATEGORIES.map((category) => (
        <CategoryPill
          key={category}
          category={category}
          selected={value === category}
          disabled={disabled}
          size={size}
          onClick={() => handleSelect(category)}
          tabIndex={value === category || (!value && category === "general") ? 0 : -1}
        />
      ))}
    </div>
  );
}

export { categoryLabels };
