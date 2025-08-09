/**
 * @file utils/validation.test.ts
 * @description Unit tests for validation utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  Validator,
  validateCommand,
  validateOption,
  validateVariant,
  validateCommandChain,
  validateTemplateSyntax,
  validateStorageData,
  ValidationPatterns
} from './validation'

describe('Validator', () => {
  let validator: Validator

  beforeEach(() => {
    validator = new Validator()
  })

  describe('required', () => {
    it('should pass for valid values', () => {
      const result = validator.required('test', 'field').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for null values', () => {
      const result = validator.required(null, 'field').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('REQUIRED')
    })

    it('should fail for empty strings', () => {
      const result = validator.required('', 'field').getResult()
      expect(result.isValid).toBe(false)
    })

    it('should fail for empty arrays', () => {
      const result = validator.required([], 'field').getResult()
      expect(result.isValid).toBe(false)
    })
  })

  describe('minLength', () => {
    it('should pass for strings meeting minimum length', () => {
      const result = validator.minLength('hello', 3, 'field').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for strings below minimum length', () => {
      const result = validator.minLength('hi', 5, 'field').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('MIN_LENGTH')
    })
  })

  describe('maxLength', () => {
    it('should pass for strings within maximum length', () => {
      const result = validator.maxLength('hello', 10, 'field').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for strings exceeding maximum length', () => {
      const result = validator.maxLength('hello world', 5, 'field').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('MAX_LENGTH')
    })
  })

  describe('pattern', () => {
    it('should pass for matching patterns', () => {
      const result = validator.pattern('test123', /^[a-z]+\d+$/, 'field').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for non-matching patterns', () => {
      const result = validator.pattern('TEST123', /^[a-z]+\d+$/, 'field').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('PATTERN')
    })
  })

  describe('email', () => {
    it('should pass for valid email addresses', () => {
      const result = validator.email('test@example.com', 'email').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for invalid email addresses', () => {
      const result = validator.email('invalid-email', 'email').getResult()
      expect(result.isValid).toBe(false)
    })
  })

  describe('url', () => {
    it('should pass for valid URLs', () => {
      const result = validator.url('https://example.com', 'url').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for invalid URLs', () => {
      const result = validator.url('not-a-url', 'url').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('URL')
    })
  })

  describe('numeric', () => {
    it('should pass for numeric values', () => {
      const result = validator.numeric('123', 'field').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should pass for decimal numbers', () => {
      const result = validator.numeric('123.45', 'field').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for non-numeric values', () => {
      const result = validator.numeric('abc', 'field').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('NUMERIC')
    })
  })

  describe('integer', () => {
    it('should pass for integer values', () => {
      const result = validator.integer('123', 'field').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for decimal numbers', () => {
      const result = validator.integer('123.45', 'field').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('INTEGER')
    })
  })

  describe('min and max', () => {
    it('should validate minimum values', () => {
      const result = validator.min(5, 3, 'field').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for values below minimum', () => {
      const result = validator.min(2, 5, 'field').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('MIN_VALUE')
    })

    it('should validate maximum values', () => {
      const result = validator.max(5, 10, 'field').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for values above maximum', () => {
      const result = validator.max(15, 10, 'field').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('MAX_VALUE')
    })
  })

  describe('oneOf', () => {
    it('should pass for values in the allowed list', () => {
      const result = validator.oneOf('red', ['red', 'green', 'blue'], 'color').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for values not in the allowed list', () => {
      const result = validator.oneOf('yellow', ['red', 'green', 'blue'], 'color').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('ONE_OF')
    })
  })

  describe('custom', () => {
    it('should pass for custom validation that returns true', () => {
      const result = validator.custom((value) => value > 5, 'field', 'Must be greater than 5', 10).getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for custom validation that returns false', () => {
      const result = validator.custom((value) => value > 5, 'field', 'Must be greater than 5', 3).getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('CUSTOM')
    })
  })

  describe('array validation', () => {
    it('should validate array minimum length', () => {
      const result = validator.arrayMinLength([1, 2, 3], 2, 'array').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for arrays below minimum length', () => {
      const result = validator.arrayMinLength([1], 3, 'array').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('ARRAY_MIN_LENGTH')
    })

    it('should validate array maximum length', () => {
      const result = validator.arrayMaxLength([1, 2], 5, 'array').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail for arrays above maximum length', () => {
      const result = validator.arrayMaxLength([1, 2, 3, 4, 5, 6], 5, 'array').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('ARRAY_MAX_LENGTH')
    })
  })

  describe('object validation', () => {
    it('should pass when object has required property', () => {
      const result = validator.hasProperty({ name: 'test' }, 'name', 'obj').getResult()
      expect(result.isValid).toBe(true)
    })

    it('should fail when object lacks required property', () => {
      const result = validator.hasProperty({}, 'name', 'obj').getResult()
      expect(result.isValid).toBe(false)
      expect(result.errors[0].code).toBe('MISSING_PROPERTY')
    })
  })

  describe('static validate method', () => {
    it('should provide a convenient way to run validation', () => {
      const result = Validator.validate(v => {
        v.required('test', 'field')
        v.minLength('test', 2, 'field')
      })
      
      expect(result.isValid).toBe(true)
    })
  })
})

describe('validateCommand', () => {
  it('should validate a correct command', () => {
    const command = {
      id: 'test-cmd',
      label: 'Test Command',
      category: 'Testing',
      type: 'command',
      template: 'test {{target}}',
      description: 'A test command',
      keywords: ['test'],
      options: [
        {
          name: 'target',
          label: 'Target',
          type: 'text',
          required: true
        }
      ]
    }

    const result = validateCommand(command)
    expect(result.isValid).toBe(true)
  })

  it('should fail for command without required fields', () => {
    const command = {
      id: 'test-cmd'
      // Missing label, category, type
    }

    const result = validateCommand(command)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'label')).toBe(true)
    expect(result.errors.some(e => e.field === 'category')).toBe(true)
  })

  it('should fail for invalid command type', () => {
    const command = {
      label: 'Test',
      category: 'Test',
      type: 'invalid-type'
    }

    const result = validateCommand(command)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'type')).toBe(true)
  })

  it('should validate template syntax', () => {
    const command = {
      label: 'Test',
      category: 'Test',
      type: 'command',
      template: 'test {{invalid'
    }

    const result = validateCommand(command)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'template')).toBe(true)
  })

  it('should validate options array', () => {
    const command = {
      label: 'Test',
      category: 'Test',
      type: 'command',
      options: [
        {
          // Missing required label
          name: 'test'
        }
      ]
    }

    const result = validateCommand(command)
    expect(result.isValid).toBe(false)
  })
})

describe('validateOption', () => {
  it('should validate a correct option', () => {
    const option = {
      name: 'target',
      label: 'Target',
      type: 'text',
      required: true,
      flag: '-t'
    }

    const result = validateOption(option)
    expect(result.isValid).toBe(true)
  })

  it('should fail for option without label', () => {
    const option = {
      name: 'target',
      type: 'text'
    }

    const result = validateOption(option)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'option.label')).toBe(true)
  })

  it('should validate option name pattern', () => {
    const option = {
      name: '123invalid',
      label: 'Test',
      type: 'text'
    }

    const result = validateOption(option)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'option.name')).toBe(true)
  })

  it('should validate flag pattern', () => {
    const option = {
      label: 'Test',
      flag: 'invalid-flag'
    }

    const result = validateOption(option)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'option.flag')).toBe(true)
  })

  it('should validate select option choices', () => {
    const option = {
      label: 'Test',
      type: 'select',
      choices: []
    }

    const result = validateOption(option)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'option.choices')).toBe(true)
  })
})

describe('validateVariant', () => {
  it('should validate a correct variant', () => {
    const variant = {
      id: 'test-variant',
      label: 'Test Variant'
    }

    const result = validateVariant(variant)
    expect(result.isValid).toBe(true)
  })

  it('should fail for variant without label', () => {
    const variant = {
      id: 'test-variant'
    }

    const result = validateVariant(variant)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'variant.label')).toBe(true)
  })
})

describe('validateCommandChain', () => {
  it('should validate a correct command chain', () => {
    const chain = {
      dropped: [
        { id: 'cmd1', key: 'cmd1-key' }
      ],
      values: {
        'cmd1-key': {
          required: {},
          optional: [],
          modifiers: []
        }
      }
    }

    const result = validateCommandChain(chain)
    expect(result.isValid).toBe(true)
  })

  it('should fail for chain without dropped commands', () => {
    const chain = {
      values: {}
    }

    const result = validateCommandChain(chain)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'chain.dropped')).toBe(true)
  })

  it('should fail for empty command chain', () => {
    const chain = {
      dropped: [],
      values: {}
    }

    const result = validateCommandChain(chain)
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.field === 'chain.dropped')).toBe(true)
  })
})

describe('validateTemplateSyntax', () => {
  it('should validate correct template syntax', () => {
    expect(validateTemplateSyntax('Hello {{name}}')).toBe(true)
  })

  it('should handle empty templates', () => {
    expect(validateTemplateSyntax('')).toBe(true)
  })

  it('should reject unbalanced braces', () => {
    expect(validateTemplateSyntax('Hello {{name}')).toBe(false)
  })

  it('should reject invalid placeholder names', () => {
    expect(validateTemplateSyntax('Hello {{123}}')).toBe(false)
  })
})

describe('validateStorageData', () => {
  it('should validate commands data', () => {
    const commands = [
      {
        id: 'test',
        label: 'Test',
        category: 'Test',
        type: 'command'
      }
    ]

    const result = validateStorageData(commands, 'commands')
    expect(result.isValid).toBe(true)
  })

  it('should validate chains data', () => {
    const chains = {
      'test-chain': {
        dropped: [{ id: 'cmd1', key: 'key1' }],
        values: {
          'key1': {
            required: {},
            optional: [],
            modifiers: []
          }
        }
      }
    }

    const result = validateStorageData(chains, 'chains')
    expect(result.isValid).toBe(true)
  })

  it('should fail for invalid commands data structure', () => {
    const result = validateStorageData('not an array', 'commands')
    expect(result.isValid).toBe(false)
  })

  it('should fail for invalid chains data structure', () => {
    const result = validateStorageData('not an object', 'chains')
    expect(result.isValid).toBe(false)
  })
})

describe('ValidationPatterns', () => {
  it('should provide correct regex patterns', () => {
    expect(ValidationPatterns.COMMAND_ID.test('valid-command-id')).toBe(true)
    expect(ValidationPatterns.COMMAND_ID.test('123invalid')).toBe(false)
    
    expect(ValidationPatterns.FLAG.test('-v')).toBe(true)
    expect(ValidationPatterns.FLAG.test('--verbose')).toBe(true)
    expect(ValidationPatterns.FLAG.test('invalid')).toBe(false)
    
    expect(ValidationPatterns.EMAIL.test('test@example.com')).toBe(true)
    expect(ValidationPatterns.EMAIL.test('invalid-email')).toBe(false)
    
    expect(ValidationPatterns.URL.test('https://example.com')).toBe(true)
    expect(ValidationPatterns.URL.test('ftp://example.com')).toBe(false)
  })
})