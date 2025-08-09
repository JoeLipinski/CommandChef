/**
 * @file test/utils.ts
 * @description Testing utilities and helpers
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { DndProvider } from 'react-dnd'
import { TestBackend } from 'react-dnd-test-backend'
import { axe, toHaveNoViolations } from 'jest-axe'

// Custom render function with DnD provider
export function renderWithDnd(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <DndProvider backend={TestBackend}>
      {children}
    </DndProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Accessibility testing helper
export async function testAccessibility(container: HTMLElement) {
  const results = await axe(container)
  expect(results).toHaveNoViolations()
}

// Mock command data for testing
export const mockCommand = {
  id: 'test-command',
  label: 'Test Command',
  category: 'Testing',
  type: 'command' as const,
  template: 'test {{target}}',
  description: 'A test command',
  keywords: ['test', 'mock'],
  options: [
    {
      name: 'target',
      label: 'Target',
      type: 'text' as const,
      required: true,
      flag: '-t'
    },
    {
      name: 'verbose',
      label: 'Verbose',
      type: 'checkbox' as const,
      required: false,
      flag: '-v'
    }
  ]
}

export const mockModifier = {
  id: 'test-modifier',
  label: 'Test Modifier',
  category: 'Testing',
  type: 'modifier' as const,
  template: '| grep {{pattern}}',
  description: 'A test modifier',
  keywords: ['grep', 'filter'],
  options: [
    {
      name: 'pattern',
      label: 'Pattern',
      type: 'text' as const,
      required: true
    }
  ]
}

export const mockCommandValue = {
  required: { target: '192.168.1.1' },
  optional: [
    {
      id: 1,
      name: 'verbose',
      label: 'Verbose',
      value: true,
      type: 'checkbox',
      flag: '-v'
    }
  ],
  modifiers: []
}

export const mockChain = {
  dropped: [
    { ...mockCommand, key: 'test-command-1' }
  ],
  values: {
    'test-command-1': mockCommandValue
  }
}

// Performance testing utilities
export function measurePerformance<T>(fn: () => T): { result: T; duration: number } {
  const start = performance.now()
  const result = fn()
  const end = performance.now()
  return { result, duration: end - start }
}

export async function measureAsyncPerformance<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  return { result, duration: end - start }
}

// Memory usage testing
export function getMemoryUsage(): MemoryInfo | null {
  if ('memory' in performance) {
    return (performance as any).memory
  }
  return null
}

// Drag and drop testing utilities
export function createDragDropEvent(type: string, dataTransfer?: Partial<DataTransfer>) {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, 'dataTransfer', {
    value: {
      getData: vi.fn(),
      setData: vi.fn(),
      clearData: vi.fn(),
      setDragImage: vi.fn(),
      files: [],
      items: [],
      types: [],
      dropEffect: 'none',
      effectAllowed: 'all',
      ...dataTransfer
    }
  })
  return event
}

// Form testing utilities
export function fillForm(container: HTMLElement, values: Record<string, string | boolean>) {
  Object.entries(values).forEach(([name, value]) => {
    const input = container.querySelector(`[name="${name}"]`) as HTMLInputElement
    if (input) {
      if (input.type === 'checkbox') {
        input.checked = Boolean(value)
      } else {
        input.value = String(value)
      }
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
}

// Wait for async operations
export function waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    function check() {
      if (condition()) {
        resolve()
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'))
      } else {
        setTimeout(check, 10)
      }
    }
    
    check()
  })
}

// Mock error for testing error handling
export class MockError extends Error {
  code?: string
  recoverable?: boolean
  userMessage?: string
  context?: any

  constructor(message: string, code?: string, recoverable = true) {
    super(message)
    this.name = 'MockError'
    this.code = code
    this.recoverable = recoverable
  }
}

// Storage testing utilities
export function mockStorageSuccess<T>(data: T) {
  return {
    success: true,
    data,
    error: undefined,
    fallbackUsed: false
  }
}

export function mockStorageError(error: string) {
  return {
    success: false,
    data: undefined,
    error,
    fallbackUsed: false
  }
}

export function mockStorageFallback<T>(data: T) {
  return {
    success: true,
    data,
    error: 'Storage failed, using fallback',
    fallbackUsed: true
  }
}