/**
 * @file useDebounce.ts
 * @description A custom hook for debouncing values to improve performance
 * by reducing the frequency of expensive operations like search filtering.
 */

import { useState, useEffect } from 'react';

/**
 * Debounces a value by delaying updates until after the specified delay
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}