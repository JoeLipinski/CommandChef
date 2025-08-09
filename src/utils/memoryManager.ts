/**
 * @file memoryManager.ts
 * @description Memory management utilities for optimizing memory usage in long-running sessions
 */

/**
 * Memory management utility class
 */
export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupTasks: (() => void)[] = [];
  private memoryCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Register a cleanup task to be executed during memory cleanup
   */
  registerCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  /**
   * Start monitoring memory usage
   */
  private startMemoryMonitoring(): void {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      this.memoryCheckInterval = setInterval(() => {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
        
        // If memory usage exceeds 80% of limit, trigger cleanup
        if (usedMB / limitMB > 0.8) {
          console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`);
          this.performCleanup();
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Perform memory cleanup
   */
  performCleanup(): void {
    console.log('Performing memory cleanup...');
    
    // Execute registered cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Error during cleanup task:', error);
      }
    });

    // Force garbage collection if available (Chrome DevTools)
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * Get current memory usage information
   */
  getMemoryInfo(): { used: number; limit: number; percentage: number } | null {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize / 1024 / 1024;
      const limit = memory.jsHeapSizeLimit / 1024 / 1024;
      return {
        used,
        limit,
        percentage: (used / limit) * 100
      };
    }
    return null;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    this.cleanupTasks = [];
  }
}