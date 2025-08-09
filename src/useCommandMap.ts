/**
 * @file useCommandMap.ts
 * @description A custom React hook that transforms an array of commands into a key-value map.
 * This provides an efficient O(1) lookup for command definitions by their ID,
 * which is more performant than repeatedly searching through the array.
 */

import { useMemo } from "react";

/**
 * Creates a memoized map of command IDs to command objects.
 * @param cmds - The array of command definitions.
 * @returns A memoized object where keys are command IDs and values are the command objects.
 */
export function useCommandMap(cmds: any[]) {
  return useMemo(
    () => {
      // Use Map for better performance with large datasets
      const map = new Map();
      cmds.forEach(cmd => map.set(cmd.id, cmd));
      // Convert back to object for backward compatibility
      return Object.fromEntries(map);
    },
    [cmds]
  );
}
