/**
 * @file CommandEntry.tsx
 * @description Renders a single command in the command library panel.
 * It displays the main command and can be expanded to show its variants.
 * This component is optimized with React.memo to prevent unnecessary re-renders.
 */

import React, { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { DraggableCommand } from "./DraggableCommand";
import { KEYBOARD_KEYS } from "./utils/accessibility";

/**
 * Props for the CommandEntry component.
 * @property command - The command object to render.
 * @property forcedVariants - An optional array of variants to display. If provided,
 * the entry will be expanded by default to show these specific variants. This is
 * used to highlight matching variants in search results.
 */
interface CommandEntryProps {
  command: any;
  forcedVariants?: any[] | null;
}

/**
 * A component that represents a single, expandable entry in the command library.
 * It contains the main draggable command and a collapsible list of its variants.
 */
export const CommandEntry = React.memo(function CommandEntry({
  command,
  forcedVariants = null,
}: CommandEntryProps) {
  // If forcedVariants is not null, it means we are in a search result context
  // and should expand to show the matching variants by default.
  const [isExpanded, setIsExpanded] = useState(forcedVariants !== null);

  // Determine which variants to show. Use forcedVariants if provided, otherwise use the command's own variants.
  const variantsToShow = forcedVariants || command.variants || [];
  const hasVariants = command.variants && command.variants.length > 0;

  // Effect to automatically expand or collapse the entry if the search context changes.
  useEffect(() => {
    setIsExpanded(forcedVariants !== null);
  }, [forcedVariants]);

  // Only show the variants section if the entry is expanded and there are variants to display.
  const showVariantsSection = isExpanded && variantsToShow.length > 0;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!hasVariants) return;

    switch (event.key) {
      case KEYBOARD_KEYS.ENTER:
      case KEYBOARD_KEYS.SPACE:
        event.preventDefault();
        setIsExpanded(!isExpanded);
        break;
      case KEYBOARD_KEYS.ARROW_RIGHT:
        if (!isExpanded) {
          event.preventDefault();
          setIsExpanded(true);
        }
        break;
      case KEYBOARD_KEYS.ARROW_LEFT:
        if (isExpanded) {
          event.preventDefault();
          setIsExpanded(false);
        }
        break;
    }
  };

  return (
    <div role="group" aria-labelledby={`command-${command.id}-label`}>
      <div
        className="flex items-center hover:bg-gray-100 dark:hover:bg-gray-900 px-4 focus-within:bg-gray-50 dark:focus-within:bg-gray-850"
        onClick={() => hasVariants && setIsExpanded(!isExpanded)}
      >
        {/* Expansion toggle button, only shown if the command has variants */}
        {hasVariants && (
          <button
            className="p-1 rounded-full flex-shrink-0 focus-visible:outline-2 focus-visible:outline-blue-500"
            aria-expanded={isExpanded}
            aria-controls={`variants-for-${command.id}`}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} variants for ${
              command.label
            }`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <ChevronRight
              size={16}
              className={`transition-transform transform ${
                isExpanded ? "rotate-90" : "rotate-0"
              }`}
              aria-hidden="true"
            />
          </button>
        )}
        {/* The main draggable command component */}
        <div className={`flex-1 ${!hasVariants ? " ml-6" : ""}`}>
          <DraggableCommand command={command} />
        </div>
      </div>
      {/* The collapsible section for variants */}
      {showVariantsSection && (
        <div
          id={`variants-for-${command.id}`}
          className="dark:bg-gray-800 bg-white"
          role="group"
          aria-label={`Variants for ${command.label}`}
        >
          {variantsToShow.map((variant, index) => (
            <div
              key={variant.id}
              role="listitem"
              aria-setsize={variantsToShow.length}
              aria-posinset={index + 1}
            >
              <DraggableCommand command={command} variant={variant} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
