/**
 * @file utils/errorHandler.test.ts
 * @description Unit tests for error handler utilities
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { errorHandler } from './errorHandler'
import { AppError } from '../types/errors'

// Mock console methods
const mockConsoleError = vi.fn()
const mockConsoleLog = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  console.error = mockConsoleError
  console.log = mockConsoleLog
  
  // Clear error reports
  errorHandler.clearErrorReports()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorHandler', () => {
  describe('createAppError', () => {
    it('should create AppError from Error object', () => {
      const originalError = new Error('Test error')
      const appError = errorHandler.createAppError(
        originalError,
        'TEST_ERROR',
        { component: 'Test' },
        'User message',
        false
      )

      expect(appError.message).toBe('Test error')
      expect(appError.code).toBe('TEST_ERROR')
      expect(appError.recoverable).toBe(false)
      expect(appError.userMessage).toBe('User message')
      expect(appError.context?.component).toBe('Test')
      expect(appError.context?.timestamp).toBeDefined()
    })

    it('should create AppError from string', () => {
      const appError = errorHandler.createAppError(
        'String error',
        'STRING_ERROR'
      )

      expect(appError.message).toBe('String error')
      expect(appError.code).toBe('STRING_ERROR')
      expect(appError.recoverable).toBe(true) // default
    })
  })

  describe('handleError', () => {
    it('should handle error and return error ID', () => {
      const error = errorHandler.createAppError(
        new Error('Test error'),
        'TEST_ERROR'
      )

      const errorId = errorHandler.handleError(error, 'medium')

      expect(errorId).toMatch(/^err_\d+_[a-z0-9]+$/)
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('[MEDIUM] Error'),
        error
      )
    })

    it('should store error report', () => {
      const error = errorHandler.createAppError(
        new Error('Test error'),
        'TEST_ERROR'
      )

      const errorId = errorHandler.handleError(error, 'high')
      const report = errorHandler.getErrorReport(errorId)

      expect(report).toBeDefined()
      expect(report?.error).toBe(error)
      expect(report?.severity).toBe('high')
      expect(report?.resolved).toBe(false)
    })

    it('should notify error listeners', () => {
      const listener = vi.fn()
      const unsubscribe = errorHandler.onError(listener)

      const error = errorHandler.createAppError(
        new Error('Test error'),
        'TEST_ERROR'
      )

      errorHandler.handleError(error)

      expect(listener).toHaveBeenCalledWith(error)
      unsubscribe()
    })

    it('should notify notification listeners', () => {
      const listener = vi.fn()
      const unsubscribe = errorHandler.onNotification(listener)

      const error = errorHandler.createAppError(
        new Error('Test error'),
        'TEST_ERROR',
        undefined,
        'User friendly message'
      )

      errorHandler.handleError(error, 'critical')

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Critical Error',
          message: 'User friendly message'
        })
      )
      unsubscribe()
    })

    it('should handle listener errors gracefully', () => {
      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      
      errorHandler.onError(faultyListener)

      const error = errorHandler.createAppError(
        new Error('Test error'),
        'TEST_ERROR'
      )

      // Should not throw
      expect(() => errorHandler.handleError(error)).not.toThrow()
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error in error listener:',
        expect.any(Error)
      )
    })
  })

  describe('utility error handlers', () => {
    it('should handle storage errors', () => {
      const originalError = new Error('Storage failed')
      const errorId = errorHandler.handleStorageError('setItem', originalError)

      const report = errorHandler.getErrorReport(errorId)
      expect(report?.error.code).toBe('STORAGE_ERROR')
      expect(report?.error.context?.component).toBe('Storage')
      expect(report?.error.context?.action).toBe('setItem')
    })

    it('should handle validation errors', () => {
      const errorId = errorHandler.handleValidationError(
        'email',
        'Invalid email format',
        'invalid-email'
      )

      const report = errorHandler.getErrorReport(errorId)
      expect(report?.error.code).toBe('VALIDATION_ERROR')
      expect(report?.error.context?.component).toBe('Validation')
      expect(report?.error.context?.data?.field).toBe('email')
    })

    it('should handle network errors', () => {
      const originalError = new Error('Network timeout')
      const errorId = errorHandler.handleNetworkError('fetch', originalError)

      const report = errorHandler.getErrorReport(errorId)
      expect(report?.error.code).toBe('NETWORK_ERROR')
      expect(report?.error.context?.component).toBe('Network')
    })

    it('should handle drag drop errors', () => {
      const originalError = new Error('Drop failed')
      const errorId = errorHandler.handleDragDropError('drop', originalError)

      const report = errorHandler.getErrorReport(errorId)
      expect(report?.error.code).toBe('DRAG_DROP_ERROR')
      expect(report?.error.context?.component).toBe('DragDrop')
    })

    it('should handle template errors', () => {
      const originalError = new Error('Invalid template')
      const errorId = errorHandler.handleTemplateError('{{invalid', originalError)

      const report = errorHandler.getErrorReport(errorId)
      expect(report?.error.code).toBe('TEMPLATE_PROCESSING_ERROR')
      expect(report?.error.context?.data?.template).toBe('{{invalid')
    })

    it('should handle command generation errors', () => {
      const originalError = new Error('Generation failed')
      const command = { id: 'test', label: 'Test' }
      const errorId = errorHandler.handleCommandGenerationError(command, originalError)

      const report = errorHandler.getErrorReport(errorId)
      expect(report?.error.code).toBe('COMMAND_GENERATION_ERROR')
      expect(report?.error.context?.data?.command).toBe(command)
    })

    it('should handle import/export errors', () => {
      const originalError = new Error('Import failed')
      const data = { test: 'data' }
      const errorId = errorHandler.handleImportExportError('import', originalError, data)

      const report = errorHandler.getErrorReport(errorId)
      expect(report?.error.code).toBe('IMPORT_EXPORT_ERROR')
      expect(report?.error.context?.data).toBe(data)
    })
  })

  describe('error report management', () => {
    it('should get all error reports', () => {
      const error1 = errorHandler.createAppError(new Error('Error 1'), 'ERROR_1')
      const error2 = errorHandler.createAppError(new Error('Error 2'), 'ERROR_2')

      errorHandler.handleError(error1)
      errorHandler.handleError(error2)

      const reports = errorHandler.getAllErrorReports()
      expect(reports).toHaveLength(2)
    })

    it('should clear error reports', () => {
      const error = errorHandler.createAppError(new Error('Test'), 'TEST')
      errorHandler.handleError(error)

      expect(errorHandler.getAllErrorReports()).toHaveLength(1)

      errorHandler.clearErrorReports()
      expect(errorHandler.getAllErrorReports()).toHaveLength(0)
    })

    it('should limit error reports to 100', () => {
      // Create 101 errors
      for (let i = 0; i < 101; i++) {
        const error = errorHandler.createAppError(
          new Error(`Error ${i}`),
          'TEST_ERROR'
        )
        errorHandler.handleError(error)
      }

      const reports = errorHandler.getAllErrorReports()
      expect(reports.length).toBeLessThanOrEqual(100)
    })
  })

  describe('notification generation', () => {
    it('should generate appropriate notifications for different severities', () => {
      const listener = vi.fn()
      errorHandler.onNotification(listener)

      const criticalError = errorHandler.createAppError(
        new Error('Critical'),
        'CRITICAL_ERROR'
      )
      errorHandler.handleError(criticalError, 'critical')

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Critical Error',
          dismissible: true,
          autoHide: false
        })
      )

      listener.mockClear()

      const lowError = errorHandler.createAppError(
        new Error('Low'),
        'LOW_ERROR'
      )
      errorHandler.handleError(lowError, 'low')

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          title: 'Minor Issue',
          autoHide: true,
          duration: 5000
        })
      )
    })

    it('should provide appropriate error actions', () => {
      const listener = vi.fn()
      errorHandler.onNotification(listener)

      const recoverableError = errorHandler.createAppError(
        new Error('Recoverable'),
        'RECOVERABLE_ERROR',
        { action: 'test-action' },
        undefined,
        true
      )
      errorHandler.handleError(recoverableError, 'medium')

      const notification = listener.mock.calls[0][0]
      expect(notification.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Retry' }),
          expect.objectContaining({ label: 'Report Issue' })
        ])
      )
    })

    it('should provide refresh action for critical errors', () => {
      const listener = vi.fn()
      errorHandler.onNotification(listener)

      const criticalError = errorHandler.createAppError(
        new Error('Critical'),
        'CRITICAL_ERROR'
      )
      errorHandler.handleError(criticalError, 'critical')

      const notification = listener.mock.calls[0][0]
      expect(notification.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Refresh Page' })
        ])
      )
    })
  })

  describe('default error messages', () => {
    it('should provide appropriate default messages for different error codes', () => {
      const testCases = [
        { code: 'VALIDATION_ERROR', expected: 'Please check your input' },
        { code: 'STORAGE_ERROR', expected: 'Unable to save data' },
        { code: 'NETWORK_ERROR', expected: 'Network connection issue' },
        { code: 'DRAG_DROP_ERROR', expected: 'Drag and drop operation failed' },
        { code: 'TEMPLATE_PROCESSING_ERROR', expected: 'Error processing command template' },
        { code: 'COMMAND_GENERATION_ERROR', expected: 'Unable to generate command' },
        { code: 'IMPORT_EXPORT_ERROR', expected: 'Error importing or exporting data' }
      ]

      const listener = vi.fn()
      errorHandler.onNotification(listener)

      testCases.forEach(({ code, expected }) => {
        listener.mockClear()
        
        const error = errorHandler.createAppError(
          new Error('Test'),
          code
        )
        errorHandler.handleError(error, 'medium')

        const notification = listener.mock.calls[0][0]
        expect(notification.message).toContain(expected)
      })
    })
  })
})

describe('Global error handlers', () => {
  it('should handle unhandled promise rejections', () => {
    const listener = vi.fn()
    errorHandler.onError(listener)

    // Simulate unhandled promise rejection
    const rejectionEvent = new Event('unhandledrejection') as any
    rejectionEvent.reason = new Error('Unhandled rejection')
    rejectionEvent.preventDefault = vi.fn()

    window.dispatchEvent(rejectionEvent)

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UNHANDLED_PROMISE_REJECTION'
      })
    )
    expect(rejectionEvent.preventDefault).toHaveBeenCalled()
  })

  it('should handle global JavaScript errors', () => {
    const listener = vi.fn()
    errorHandler.onError(listener)

    // Simulate global error
    const errorEvent = new ErrorEvent('error', {
      error: new Error('Global error'),
      message: 'Global error',
      filename: 'test.js',
      lineno: 10,
      colno: 5
    })

    window.dispatchEvent(errorEvent)

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'GLOBAL_ERROR',
        context: expect.objectContaining({
          data: expect.objectContaining({
            filename: 'test.js',
            lineno: 10,
            colno: 5
          })
        })
      })
    )
  })
})