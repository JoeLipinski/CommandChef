/**
 * @file usePerformanceMonitor.ts
 * @description A custom hook for monitoring performance metrics and key user interactions
 */

import { useCallback, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
}

/**
 * Hook for monitoring performance metrics
 */
export function usePerformanceMonitor() {
  const metricsRef = useRef<Map<string, PerformanceMetrics>>(new Map());
  const timersRef = useRef<Map<string, number>>(new Map());

  const startTimer = useCallback((key: string) => {
    timersRef.current.set(key, performance.now());
  }, []);

  const endTimer = useCallback((key: string, type: 'render' | 'interaction' = 'interaction') => {
    const startTime = timersRef.current.get(key);
    if (startTime) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const existing = metricsRef.current.get(key) || { renderTime: 0, interactionTime: 0 };
      const updated = {
        ...existing,
        [type === 'render' ? 'renderTime' : 'interactionTime']: duration,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || undefined
      };
      
      metricsRef.current.set(key, updated);
      timersRef.current.delete(key);
      
      // Log performance warnings for slow operations
      if (duration > 100) {
        console.warn(`Slow ${type} detected for ${key}: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    return 0;
  }, []);

  const getMetrics = useCallback(() => {
    return Object.fromEntries(metricsRef.current);
  }, []);

  const clearMetrics = useCallback(() => {
    metricsRef.current.clear();
    timersRef.current.clear();
  }, []);

  return {
    startTimer,
    endTimer,
    getMetrics,
    clearMetrics
  };
}