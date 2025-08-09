/**
 * @file LazyCommandCategory.tsx
 * @description A lazy-loaded component for command categories to improve initial load performance
 */

import React, { useState, useEffect, useMemo } from "react";
import { CommandEntry } from "./CommandEntry";

interface LazyCommandCategoryProps {
  categoryName: string;
  commands: any[];
  isCollapsed: boolean;
  onToggle: () => void;
  searchResults?: any;
  isVisible: boolean; // Whether this category is in viewport
}

/**
 * Lazy-loaded command category component that only renders when visible
 */
export const LazyCommandCategory = React.memo(function LazyCommandCategory({
  categoryName,
  commands,
  isCollapsed,
  onToggle,
  searchResults,
  isVisible,
}: LazyCommandCategoryProps) {
  const [hasRendered, setHasRendered] = useState(false);

  // Once visible, mark as rendered to prevent re-lazy loading
  useEffect(() => {
    if (isVisible && !hasRendered) {
      setHasRendered(true);
    }
  }, [isVisible, hasRendered]);

  // Memoize filtered commands to prevent recalculation
  const filteredCommands = useMemo(() => {
    if (searchResults && searchResults[categoryName]) {
      return searchResults[categoryName].commands;
    }
    return commands.filter((cmd) => cmd.category === categoryName);
  }, [commands, categoryName, searchResults]);

  // Don't render content until visible or previously rendered
  if (!isVisible && !hasRendered) {
    return (
      <div className="h-12 flex items-center justify-center text-gray-400">
        Loading {categoryName}...
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="w-full text-left p-2 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
      >
        <div className="flex items-center justify-between">
          <span>{categoryName}</span>
          <span className="text-sm text-gray-500">
            {filteredCommands.length} commands
          </span>
        </div>
      </button>

      {!isCollapsed && (
        <div className="mt-2 space-y-1">
          {filteredCommands.map((command) => (
            <CommandEntry
              key={command.id}
              command={command}
              forcedVariants={
                searchResults?.[categoryName]?.commands.find(
                  (c) => c.id === command.id
                )?._forcedVariants
              }
            />
          ))}
        </div>
      )}
    </div>
  );
});
