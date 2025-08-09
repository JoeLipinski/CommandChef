/**
 * @file utils/storage.test.ts
 * @description Unit tests for storage utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { storage, saveCommands, loadCommands, saveChains, loadChains } from './storage'

describe('StorageManager', () => {
  beforeEach(() => {
    testUtils.resetAllMocks()
    vi.clearAllTimers()
  })

  describe('setItem', () => {
    it('should store item successfully', () => {
      const testData = { test: 'data' }
      testUtils.mockLocalStorage.setItem.mockImplementation(() => {})
      
      const result = storage.setItem('test-key', testData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
      expect(testUtils.mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData)
      )
    })

    it('should handle storage errors with memory fallback', () => {
      const testData = { test: 'data' }
      testUtils.mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })
      
      const result = storage.setItem('test-key', testData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
      expect(result.fallbackUsed).toBe(true)
      expect(result.error).toContain('Storage failed, using memory fallback')
    })

    it('should validate data when requested', () => {
      const invalidData = null
      
      const result = storage.setItem('cyber-chef-commands', invalidData, { validate: true })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation failed')
    })

    it('should work with sessionStorage', () => {
      const testData = { test: 'data' }
      testUtils.mockSessionStorage.setItem.mockImplementation(() => {})
      
      const result = storage.setItem('test-key', testData, {}, 'sessionStorage')
      
      expect(result.success).toBe(true)
      expect(testUtils.mockSessionStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData)
      )
    })
  })

  describe('getItem', () => {
    it('should retrieve item successfully', () => {
      const testData = { test: 'data' }
      testUtils.mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData))
      
      const result = storage.getItem('test-key')
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
      expect(testUtils.mockLocalStorage.getItem).toHaveBeenCalledWith('test-key')
    })

    it('should return fallback when item not found', () => {
      const fallbackData = { fallback: 'data' }
      testUtils.mockLocalStorage.getItem.mockReturnValue(null)
      
      const result = storage.getItem('test-key', { fallback: fallbackData })
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(fallbackData)
      expect(result.fallbackUsed).toBe(true)
    })

    it('should handle JSON parsing errors', () => {
      testUtils.mockLocalStorage.getItem.mockReturnValue('invalid json')
      
      const result = storage.getItem('test-key')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('storage error')
    })

    it('should use memory fallback when storage fails', () => {
      const testData = { test: 'data' }
      testUtils.mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })
      
      // First store in memory fallback
      storage.setItem('test-key', testData)
      
      const result = storage.getItem('test-key')
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(testData)
      expect(result.fallbackUsed).toBe(true)
    })

    it('should validate retrieved data when requested', () => {
      const invalidData = 'not an array'
      testUtils.mockLocalStorage.getItem.mockReturnValue(JSON.stringify(invalidData))
      
      const result = storage.getItem('cyber-chef-commands', { validate: true })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('validation failed')
    })
  })

  describe('removeItem', () => {
    it('should remove item successfully', () => {
      testUtils.mockLocalStorage.removeItem.mockImplementation(() => {})
      
      const result = storage.removeItem('test-key')
      
      expect(result.success).toBe(true)
      expect(testUtils.mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key')
    })

    it('should handle removal errors gracefully', () => {
      testUtils.mockLocalStorage.removeItem.mockImplementation(() => {
        throw new Error('Removal failed')
      })
      
      const result = storage.removeItem('test-key')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Removal failed')
    })
  })

  describe('clear', () => {
    it('should clear storage successfully', () => {
      testUtils.mockLocalStorage.clear.mockImplementation(() => {})
      
      const result = storage.clear()
      
      expect(result.success).toBe(true)
      expect(testUtils.mockLocalStorage.clear).toHaveBeenCalled()
    })

    it('should handle clear errors gracefully', () => {
      testUtils.mockLocalStorage.clear.mockImplementation(() => {
        throw new Error('Clear failed')
      })
      
      const result = storage.clear()
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Clear failed')
    })
  })

  describe('exportData', () => {
    it('should export specified keys', () => {
      const testData1 = { test: 'data1' }
      const testData2 = { test: 'data2' }
      
      testUtils.mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(testData1))
        .mockReturnValueOnce(JSON.stringify(testData2))
      
      const result = storage.exportData(['key1', 'key2'])
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        key1: testData1,
        key2: testData2
      })
    })

    it('should handle export errors', () => {
      testUtils.mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Export failed')
      })
      
      const result = storage.exportData(['key1'])
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Export failed')
    })
  })

  describe('importData', () => {
    it('should import data successfully', () => {
      const importData = {
        key1: { test: 'data1' },
        key2: { test: 'data2' }
      }
      
      testUtils.mockLocalStorage.setItem.mockImplementation(() => {})
      testUtils.mockLocalStorage.getItem.mockReturnValue(null)
      
      const result = storage.importData(importData)
      
      expect(result.success).toBe(true)
      expect(testUtils.mockLocalStorage.setItem).toHaveBeenCalledTimes(2)
    })

    it('should respect overwrite flag', () => {
      const importData = { key1: { test: 'new data' } }
      
      testUtils.mockLocalStorage.getItem.mockReturnValue(JSON.stringify({ existing: 'data' }))
      
      const result = storage.importData(importData, false)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to import')
    })

    it('should handle import errors', () => {
      const importData = { key1: { test: 'data' } }
      
      testUtils.mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Import failed')
      })
      
      const result = storage.importData(importData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Import failed')
    })
  })

  describe('cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should clean up old data', () => {
      const now = Date.now()
      const oldTime = now - (8 * 24 * 60 * 60 * 1000) // 8 days ago
      
      vi.setSystemTime(now)
      
      const oldErrorReports = [
        { timestamp: oldTime, error: 'old error' },
        { timestamp: now, error: 'recent error' }
      ]
      
      testUtils.mockLocalStorage.getItem.mockReturnValue(JSON.stringify(oldErrorReports))
      testUtils.mockLocalStorage.setItem.mockImplementation(() => {})
      
      // Mock Object.keys to return some temp keys
      const originalKeys = Object.keys
      Object.keys = vi.fn().mockReturnValue(['temp_old', 'cache_old', 'normal_key'])
      
      testUtils.mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(oldErrorReports))
        .mockReturnValueOnce(JSON.stringify({ timestamp: oldTime }))
        .mockReturnValueOnce(JSON.stringify({ timestamp: oldTime }))
      
      const result = storage.cleanup()
      
      expect(result.success).toBe(true)
      
      // Restore Object.keys
      Object.keys = originalKeys
    })
  })
})

describe('Convenience functions', () => {
  beforeEach(() => {
    testUtils.resetAllMocks()
  })

  describe('saveCommands', () => {
    it('should save commands with validation', () => {
      const commands = [
        {
          id: 'test',
          label: 'Test',
          category: 'Test',
          type: 'command',
          template: 'test'
        }
      ]
      
      testUtils.mockLocalStorage.setItem.mockImplementation(() => {})
      
      const result = saveCommands(commands)
      
      expect(result.success).toBe(true)
      expect(testUtils.mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cyber-chef-commands',
        JSON.stringify(commands)
      )
    })
  })

  describe('loadCommands', () => {
    it('should load commands with fallback', () => {
      const fallback = [{ id: 'fallback' }]
      testUtils.mockLocalStorage.getItem.mockReturnValue(null)
      
      const result = loadCommands(fallback)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(fallback)
      expect(result.fallbackUsed).toBe(true)
    })
  })

  describe('saveChains', () => {
    it('should save chains with validation', () => {
      const chains = {
        'test-chain': {
          dropped: [],
          values: {}
        }
      }
      
      testUtils.mockLocalStorage.setItem.mockImplementation(() => {})
      
      const result = saveChains(chains)
      
      expect(result.success).toBe(true)
      expect(testUtils.mockLocalStorage.setItem).toHaveBeenCalledWith(
        'cyber-chef-chains',
        JSON.stringify(chains)
      )
    })
  })

  describe('loadChains', () => {
    it('should load chains with fallback', () => {
      const fallback = { 'fallback-chain': {} }
      testUtils.mockLocalStorage.getItem.mockReturnValue(null)
      
      const result = loadChains(fallback)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(fallback)
      expect(result.fallbackUsed).toBe(true)
    })
  })
})