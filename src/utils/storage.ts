/**
 * @file utils/storage.ts
 * @description Enhanced storage utilities with error handling and fallback mechanisms
 */

import { errorHandler } from './errorHandler';
import { validateStorageData } from './validation';

export interface StorageOptions {
  fallback?: any;
  validate?: boolean;
  compress?: boolean;
  encrypt?: boolean;
}

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  fallbackUsed?: boolean;
}

class StorageManager {
  private static instance: StorageManager;
  private memoryFallback: Map<string, any> = new Map();
  private compressionSupported: boolean = false;

  private constructor() {
    this.checkCompressionSupport();
    this.setupStorageEventListeners();
  }

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  private checkCompressionSupport(): void {
    // Check if compression is supported (would need a compression library in real implementation)
    this.compressionSupported = typeof window !== 'undefined' && 'CompressionStream' in window;
  }

  private setupStorageEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen for storage events from other tabs
    window.addEventListener('storage', (event) => {
      if (event.key && event.newValue !== event.oldValue) {
        console.log(`Storage changed for key: ${event.key}`);
        // Emit custom event for components to listen to
        window.dispatchEvent(new CustomEvent('storage-changed', {
          detail: { key: event.key, newValue: event.newValue, oldValue: event.oldValue }
        }));
      }
    });

    // Listen for storage quota exceeded
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('QuotaExceededError')) {
        this.handleQuotaExceeded();
      }
    });
  }

  private handleQuotaExceeded(): void {
    console.warn('Storage quota exceeded, attempting cleanup...');
    
    try {
      // Try to free up space by removing old error reports
      const errorReports = localStorage.getItem('errorBoundaryErrors');
      if (errorReports) {
        localStorage.removeItem('errorBoundaryErrors');
      }

      // Remove temporary data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });

      errorHandler.handleError(
        errorHandler.createAppError(
          new Error('Storage quota exceeded'),
          'STORAGE_QUOTA_EXCEEDED',
          { component: 'Storage', action: 'Cleanup' },
          'Storage space is full. Some temporary data has been cleared.',
          true
        ),
        'medium'
      );
    } catch (cleanupError) {
      console.error('Failed to cleanup storage:', cleanupError);
    }
  }

  private isStorageAvailable(type: 'localStorage' | 'sessionStorage'): boolean {
    try {
      const storage = window[type];
      const testKey = '__storage_test__';
      storage.setItem(testKey, 'test');
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private compressData(data: string): string {
    // In a real implementation, this would use a compression library
    // For now, just return the original data
    return data;
  }

  private decompressData(data: string): string {
    // In a real implementation, this would decompress the data
    // For now, just return the original data
    return data;
  }

  private encryptData(data: string): string {
    // In a real implementation, this would encrypt the data
    // For now, just return the original data (NOT SECURE)
    return data;
  }

  private decryptData(data: string): string {
    // In a real implementation, this would decrypt the data
    // For now, just return the original data
    return data;
  }

  setItem<T>(
    key: string, 
    value: T, 
    options: StorageOptions = {},
    storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
  ): StorageResult<T> {
    try {
      // Validate data if requested
      if (options.validate) {
        const validationType = this.getValidationType(key);
        if (validationType) {
          const validation = validateStorageData(value, validationType);
          if (!validation.isValid) {
            const errorMessage = `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`;
            errorHandler.handleValidationError(key, errorMessage, value);
            return { success: false, error: errorMessage };
          }
        }
      }

      let serializedValue = JSON.stringify(value);

      // Apply compression if requested and supported
      if (options.compress && this.compressionSupported) {
        serializedValue = this.compressData(serializedValue);
      }

      // Apply encryption if requested
      if (options.encrypt) {
        serializedValue = this.encryptData(serializedValue);
      }

      // Try to store in the requested storage
      if (this.isStorageAvailable(storageType)) {
        window[storageType].setItem(key, serializedValue);
        return { success: true, data: value };
      } else {
        throw new Error(`${storageType} is not available`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
      
      // Try fallback to memory storage
      try {
        this.memoryFallback.set(key, value);
        
        errorHandler.handleStorageError(`setItem(${key})`, error as Error);
        
        return { 
          success: true, 
          data: value, 
          fallbackUsed: true,
          error: `Storage failed, using memory fallback: ${errorMessage}`
        };
      } catch (fallbackError) {
        errorHandler.handleStorageError(`setItem(${key}) - fallback failed`, fallbackError as Error);
        return { 
          success: false, 
          error: `Storage and fallback failed: ${errorMessage}`
        };
      }
    }
  }

  getItem<T>(
    key: string, 
    options: StorageOptions = {},
    storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
  ): StorageResult<T> {
    try {
      let value: T | undefined;
      let fallbackUsed = false;

      // Try to get from requested storage first
      if (this.isStorageAvailable(storageType)) {
        const storedValue = window[storageType].getItem(key);
        if (storedValue !== null) {
          let processedValue = storedValue;

          // Apply decryption if needed
          if (options.encrypt) {
            processedValue = this.decryptData(processedValue);
          }

          // Apply decompression if needed
          if (options.compress && this.compressionSupported) {
            processedValue = this.decompressData(processedValue);
          }

          value = JSON.parse(processedValue);
        }
      }

      // Try memory fallback if not found in storage
      if (value === undefined && this.memoryFallback.has(key)) {
        value = this.memoryFallback.get(key);
        fallbackUsed = true;
      }

      // Use provided fallback if still not found
      if (value === undefined && options.fallback !== undefined) {
        value = options.fallback;
        fallbackUsed = true;
      }

      if (value === undefined) {
        return { success: false, error: `Item not found: ${key}` };
      }

      // Validate data if requested
      if (options.validate && value !== undefined) {
        const validationType = this.getValidationType(key);
        if (validationType) {
          const validation = validateStorageData(value, validationType);
          if (!validation.isValid) {
            const errorMessage = `Stored data validation failed: ${validation.errors.map(e => e.message).join(', ')}`;
            errorHandler.handleValidationError(key, errorMessage, value);
            
            // Return fallback if validation fails
            if (options.fallback !== undefined) {
              return { success: true, data: options.fallback, fallbackUsed: true };
            }
            return { success: false, error: errorMessage };
          }
        }
      }

      return { success: true, data: value, fallbackUsed };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
      errorHandler.handleStorageError(`getItem(${key})`, error as Error);

      // Return fallback on error
      if (options.fallback !== undefined) {
        return { success: true, data: options.fallback, fallbackUsed: true };
      }

      return { success: false, error: errorMessage };
    }
  }

  removeItem(
    key: string, 
    storageType: 'localStorage' | 'sessionStorage' = 'localStorage'
  ): StorageResult<void> {
    try {
      // Remove from requested storage
      if (this.isStorageAvailable(storageType)) {
        window[storageType].removeItem(key);
      }

      // Remove from memory fallback
      this.memoryFallback.delete(key);

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
      errorHandler.handleStorageError(`removeItem(${key})`, error as Error);
      return { success: false, error: errorMessage };
    }
  }

  clear(storageType: 'localStorage' | 'sessionStorage' = 'localStorage'): StorageResult<void> {
    try {
      if (this.isStorageAvailable(storageType)) {
        window[storageType].clear();
      }
      
      this.memoryFallback.clear();
      
      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
      errorHandler.handleStorageError('clear', error as Error);
      return { success: false, error: errorMessage };
    }
  }

  getStorageInfo(): {
    localStorage: { available: boolean; used?: number; total?: number };
    sessionStorage: { available: boolean; used?: number; total?: number };
    memoryFallback: { itemCount: number };
  } {
    const info = {
      localStorage: { available: this.isStorageAvailable('localStorage') },
      sessionStorage: { available: this.isStorageAvailable('sessionStorage') },
      memoryFallback: { itemCount: this.memoryFallback.size }
    };

    // Try to get storage usage info
    try {
      if (info.localStorage.available && 'estimate' in navigator.storage) {
        navigator.storage.estimate().then(estimate => {
          if (estimate.usage && estimate.quota) {
            info.localStorage.used = estimate.usage;
            info.localStorage.total = estimate.quota;
          }
        }).catch(() => {
          // Ignore errors in storage estimation
        });
      }
    } catch {
      // Ignore errors in storage info gathering
    }

    return info;
  }

  private getValidationType(key: string): 'commands' | 'chains' | null {
    if (key.includes('commands')) return 'commands';
    if (key.includes('chains')) return 'chains';
    return null;
  }

  // Utility methods for common storage operations
  exportData(keys?: string[]): StorageResult<Record<string, any>> {
    try {
      const data: Record<string, any> = {};
      const keysToExport = keys || Object.keys(localStorage);

      for (const key of keysToExport) {
        const result = this.getItem(key);
        if (result.success && result.data !== undefined) {
          data[key] = result.data;
        }
      }

      return { success: true, data };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Export failed';
      errorHandler.handleImportExportError('export', error as Error, { keys });
      return { success: false, error: errorMessage };
    }
  }

  importData(data: Record<string, any>, overwrite: boolean = false): StorageResult<void> {
    try {
      const results: Array<{ key: string; success: boolean; error?: string }> = [];

      for (const [key, value] of Object.entries(data)) {
        // Check if key exists and overwrite is false
        if (!overwrite) {
          const existing = this.getItem(key);
          if (existing.success && existing.data !== undefined) {
            results.push({ key, success: false, error: 'Key exists and overwrite is false' });
            continue;
          }
        }

        const result = this.setItem(key, value, { validate: true });
        results.push({ 
          key, 
          success: result.success, 
          error: result.error 
        });
      }

      const failedImports = results.filter(r => !r.success);
      if (failedImports.length > 0) {
        const errorMessage = `Failed to import ${failedImports.length} items: ${failedImports.map(f => `${f.key} (${f.error})`).join(', ')}`;
        return { success: false, error: errorMessage };
      }

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      errorHandler.handleImportExportError('import', error as Error, { data, overwrite });
      return { success: false, error: errorMessage };
    }
  }

  // Cleanup old or temporary data
  cleanup(): StorageResult<void> {
    try {
      const now = Date.now();
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

      // Clean up old error reports
      const errorReports = this.getItem('errorBoundaryErrors');
      if (errorReports.success && Array.isArray(errorReports.data)) {
        const recentErrors = errorReports.data.filter((error: any) => 
          error.timestamp && error.timestamp > oneWeekAgo
        );
        this.setItem('errorBoundaryErrors', recentErrors);
      }

      // Clean up temporary keys
      if (this.isStorageAvailable('localStorage')) {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('temp_') || key.startsWith('cache_')) {
            try {
              const item = localStorage.getItem(key);
              if (item) {
                const parsed = JSON.parse(item);
                if (parsed.timestamp && parsed.timestamp < oneWeekAgo) {
                  localStorage.removeItem(key);
                }
              }
            } catch {
              // Remove invalid items
              localStorage.removeItem(key);
            }
          }
        });
      }

      return { success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cleanup failed';
      errorHandler.handleStorageError('cleanup', error as Error);
      return { success: false, error: errorMessage };
    }
  }
}

// Export singleton instance
export const storage = StorageManager.getInstance();

// Convenience functions for common operations
export function saveCommands(commands: any[]): StorageResult<any[]> {
  return storage.setItem('cyber-chef-commands', commands, { validate: true });
}

export function loadCommands(fallback: any[] = []): StorageResult<any[]> {
  return storage.getItem('cyber-chef-commands', { fallback, validate: true });
}

export function saveChains(chains: Record<string, any>): StorageResult<Record<string, any>> {
  return storage.setItem('cyber-chef-chains', chains, { validate: true });
}

export function loadChains(fallback: Record<string, any> = {}): StorageResult<Record<string, any>> {
  return storage.getItem('cyber-chef-chains', { fallback, validate: true });
}

export function exportAllData(): StorageResult<Record<string, any>> {
  return storage.exportData(['cyber-chef-commands', 'cyber-chef-chains']);
}

export function importAllData(data: Record<string, any>, overwrite: boolean = false): StorageResult<void> {
  return storage.importData(data, overwrite);
}