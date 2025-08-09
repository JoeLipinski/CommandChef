/**
 * @file utils.test.ts
 * @description Unit tests for utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  slugify,
  generateId,
  generateCommandId,
  generateOptionId,
  generateVariantId,
  validateTemplateSyntax,
  processTemplate,
  clearTemplateCache
} from './utils'

describe('slugify', () => {
  it('should convert text to lowercase slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('should remove special characters', () => {
    expect(slugify('Hello@World!')).toBe('helloworld')
  })

  it('should replace spaces with hyphens', () => {
    expect(slugify('Hello   World')).toBe('hello-world')
  })

  it('should handle empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('should remove leading and trailing hyphens', () => {
    expect(slugify('  -Hello World-  ')).toBe('hello-world')
  })

  it('should handle underscores', () => {
    expect(slugify('hello_world')).toBe('hello-world')
  })
})

describe('generateId', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should generate ID from label', () => {
    expect(generateId('Test Label')).toBe('test-label')
  })

  it('should use fallback when label is empty', () => {
    expect(generateId('', 'fallback')).toBe('fallback')
  })

  it('should use timestamp when no label or fallback', () => {
    const mockTime = 1234567890
    vi.setSystemTime(mockTime)
    expect(generateId('')).toBe(`item-${mockTime}`)
  })

  it('should use timestamp when slugification results in empty string', () => {
    const mockTime = 1234567890
    vi.setSystemTime(mockTime)
    expect(generateId('!@#$%')).toBe(`item-${mockTime}`)
  })
})

describe('generateCommandId', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should generate command ID from label', () => {
    expect(generateCommandId('Test Command')).toBe('test-command')
  })

  it('should use timestamp fallback for empty label', () => {
    const mockTime = 1234567890
    vi.setSystemTime(mockTime)
    expect(generateCommandId('')).toBe(`command-${mockTime}`)
  })
})

describe('generateOptionId', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should generate option ID from label', () => {
    expect(generateOptionId('Test Option')).toBe('test-option')
  })

  it('should use timestamp fallback for empty label', () => {
    const mockTime = 1234567890
    vi.setSystemTime(mockTime)
    expect(generateOptionId('')).toBe(`option-${mockTime}`)
  })
})

describe('generateVariantId', () => {
  it('should generate variant ID from label', () => {
    expect(generateVariantId('Test Variant', 0)).toBe('test-variant')
  })

  it('should use index fallback for empty label', () => {
    expect(generateVariantId('', 2)).toBe('variant-2')
  })
})

describe('validateTemplateSyntax', () => {
  it('should validate correct template syntax', () => {
    expect(validateTemplateSyntax('Hello {{name}}')).toBe(true)
  })

  it('should validate empty template', () => {
    expect(validateTemplateSyntax('')).toBe(true)
  })

  it('should validate null template', () => {
    expect(validateTemplateSyntax(null as any)).toBe(true)
  })

  it('should reject unbalanced braces', () => {
    expect(validateTemplateSyntax('Hello {{name}')).toBe(false)
    expect(validateTemplateSyntax('Hello name}}')).toBe(false)
  })

  it('should reject invalid placeholder names', () => {
    expect(validateTemplateSyntax('Hello {{123}}')).toBe(false)
    expect(validateTemplateSyntax('Hello {{-name}}')).toBe(false)
  })

  it('should reject nested braces', () => {
    expect(validateTemplateSyntax('Hello {{{name}}}')).toBe(false)
  })

  it('should accept valid placeholder names with spaces', () => {
    expect(validateTemplateSyntax('Hello {{User Name}}')).toBe(true)
  })

  it('should accept valid placeholder names with underscores', () => {
    expect(validateTemplateSyntax('Hello {{user_name}}')).toBe(true)
  })
})

describe('processTemplate', () => {
  const mockOptions = [
    {
      name: 'target',
      label: 'Target',
      required: true,
      flag: '-t'
    },
    {
      name: 'port',
      label: 'Port',
      required: true,
      flag: '-p'
    },
    {
      name: 'verbose',
      label: 'Verbose',
      required: false,
      flag: '-v'
    }
  ]

  beforeEach(() => {
    clearTemplateCache()
  })

  it('should process template with label-based placeholders', () => {
    const template = 'nmap {{Target}} {{Port}}'
    const values = { target: '192.168.1.1', port: '80' }
    const result = processTemplate(template, mockOptions, values)
    expect(result).toBe('nmap -t 192.168.1.1 -p 80')
  })

  it('should process template with ID-based placeholders for backward compatibility', () => {
    const template = 'nmap {{target}} {{port}}'
    const values = { target: '192.168.1.1', port: '80' }
    const result = processTemplate(template, mockOptions, values)
    expect(result).toBe('nmap -t 192.168.1.1 -p 80')
  })

  it('should handle templates without flags', () => {
    const optionsWithoutFlags = [
      { name: 'target', label: 'Target', required: true }
    ]
    const template = 'ping {{Target}}'
    const values = { target: '192.168.1.1' }
    const result = processTemplate(template, optionsWithoutFlags, values)
    expect(result).toBe('ping 192.168.1.1')
  })

  it('should handle empty values', () => {
    const template = 'nmap {{Target}}'
    const values = { target: '' }
    const result = processTemplate(template, mockOptions, values)
    expect(result).toBe('nmap ')
  })

  it('should handle missing values', () => {
    const template = 'nmap {{Target}} {{Missing}}'
    const values = { target: '192.168.1.1' }
    const result = processTemplate(template, mockOptions, values)
    expect(result).toBe('nmap -t 192.168.1.1 {{Missing}}')
  })

  it('should handle invalid template syntax gracefully', () => {
    const template = 'nmap {{Target'
    const values = { target: '192.168.1.1' }
    const result = processTemplate(template, mockOptions, values)
    expect(result).toBe(template) // Should return original template on error
  })

  it('should handle invalid input types gracefully', () => {
    expect(processTemplate(null as any, mockOptions, {})).toBe(null)
    expect(processTemplate('test', null as any, {})).toBe('test')
    expect(processTemplate('test', mockOptions, null as any)).toBe('test')
  })

  it('should cache processed templates', () => {
    const template = 'nmap {{Target}}'
    const values = { target: '192.168.1.1' }
    
    // Process twice
    const result1 = processTemplate(template, mockOptions, values)
    const result2 = processTemplate(template, mockOptions, values)
    
    expect(result1).toBe(result2)
    expect(result1).toBe('nmap -t 192.168.1.1')
  })

  it('should handle options with empty flags', () => {
    const optionsWithEmptyFlag = [
      { name: 'target', label: 'Target', required: true, flag: '' }
    ]
    const template = 'ping {{Target}}'
    const values = { target: '192.168.1.1' }
    const result = processTemplate(template, optionsWithEmptyFlag, values)
    expect(result).toBe('ping 192.168.1.1')
  })

  it('should handle special characters in values', () => {
    const template = 'echo {{Target}}'
    const values = { target: 'hello world & test' }
    const result = processTemplate(template, mockOptions, values)
    expect(result).toBe('echo -t hello world & test')
  })
})

describe('clearTemplateCache', () => {
  it('should clear the template cache', () => {
    const template = 'test {{Target}}'
    const options = [{ name: 'target', label: 'Target', required: true }]
    const values = { target: 'value' }
    
    // Process template to populate cache
    processTemplate(template, options, values)
    
    // Clear cache
    clearTemplateCache()
    
    // Should still work after clearing cache
    const result = processTemplate(template, options, values)
    expect(result).toBe('test value')
  })
})