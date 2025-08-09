/**
 * @file test/performance.bench.ts
 * @description Performance benchmark tests
 */

import { bench, describe } from 'vitest'
import { processTemplate, slugify, generateId } from '../utils'
import { validateCommand, validateStorageData } from '../utils/validation'
import { storage } from '../utils/storage'

describe('Performance Benchmarks', () => {
  describe('Template Processing', () => {
    const mockOptions = [
      { name: 'target', label: 'Target', required: true, flag: '-t' },
      { name: 'port', label: 'Port', required: true, flag: '-p' },
      { name: 'verbose', label: 'Verbose', required: false, flag: '-v' }
    ]

    bench('processTemplate - simple template', () => {
      processTemplate('nmap {{Target}}', mockOptions, { target: '192.168.1.1' })
    })

    bench('processTemplate - complex template', () => {
      processTemplate(
        'nmap {{Target}} -p {{Port}} {{Verbose}}',
        mockOptions,
        { target: '192.168.1.1', port: '80', verbose: '-v' }
      )
    })

    bench('processTemplate - large template', () => {
      const largeTemplate = Array.from({ length: 100 }, (_, i) => `{{param${i}}}`).join(' ')
      const largeOptions = Array.from({ length: 100 }, (_, i) => ({
        name: `param${i}`,
        label: `Param ${i}`,
        required: true
      }))
      const largeValues = Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`param${i}`, `value${i}`])
      )
      
      processTemplate(largeTemplate, largeOptions, largeValues)
    })
  })

  describe('ID Generation', () => {
    bench('slugify - short string', () => {
      slugify('Test Command')
    })

    bench('slugify - long string', () => {
      slugify('This is a very long command name with many words and special characters!')
    })

    bench('generateId - with label', () => {
      generateId('Test Command')
    })

    bench('generateId - with fallback', () => {
      generateId('', 'fallback')
    })

    bench('generateId - timestamp fallback', () => {
      generateId('')
    })
  })

  describe('Validation', () => {
    const validCommand = {
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

    bench('validateCommand - valid command', () => {
      validateCommand(validCommand)
    })

    bench('validateCommand - invalid command', () => {
      validateCommand({ ...validCommand, label: '' })
    })

    bench('validateStorageData - commands', () => {
      const commands = Array.from({ length: 100 }, (_, i) => ({
        ...validCommand,
        id: `cmd-${i}`,
        label: `Command ${i}`
      }))
      
      validateStorageData(commands, 'commands')
    })
  })

  describe('Storage Operations', () => {
    const testData = { test: 'data', number: 123, array: [1, 2, 3] }
    const largeData = {
      commands: Array.from({ length: 1000 }, (_, i) => ({
        id: `cmd-${i}`,
        label: `Command ${i}`,
        category: 'Test',
        type: 'command'
      }))
    }

    bench('storage.setItem - small data', () => {
      storage.setItem('test-key', testData)
    })

    bench('storage.getItem - small data', () => {
      storage.setItem('test-key', testData)
      storage.getItem('test-key')
    })

    bench('storage.setItem - large data', () => {
      storage.setItem('large-key', largeData)
    })

    bench('storage.getItem - large data', () => {
      storage.setItem('large-key', largeData)
      storage.getItem('large-key')
    })

    bench('storage.setItem - with validation', () => {
      storage.setItem('test-key', testData, { validate: true })
    })
  })

  describe('Search and Filtering', () => {
    const commands = Array.from({ length: 1000 }, (_, i) => ({
      id: `cmd-${i}`,
      label: `Command ${i}`,
      category: i % 10 === 0 ? 'Network' : 'Web',
      keywords: [`keyword${i}`, `tag${i % 5}`],
      type: 'command'
    }))

    bench('filter commands by label', () => {
      commands.filter(cmd => cmd.label.toLowerCase().includes('command 5'))
    })

    bench('filter commands by category', () => {
      commands.filter(cmd => cmd.category === 'Network')
    })

    bench('filter commands by keywords', () => {
      commands.filter(cmd => 
        cmd.keywords.some(kw => kw.toLowerCase().includes('tag1'))
      )
    })

    bench('complex search filter', () => {
      const searchTerm = 'network'
      commands.filter(cmd => 
        cmd.label.toLowerCase().includes(searchTerm) ||
        cmd.category.toLowerCase().includes(searchTerm) ||
        cmd.keywords.some(kw => kw.toLowerCase().includes(searchTerm))
      )
    })
  })

  describe('Command Generation', () => {
    const mockCommand = {
      id: 'nmap',
      label: 'Nmap',
      template: 'nmap {{Target}} -p {{Port}}',
      options: [
        { name: 'target', label: 'Target', required: true, flag: '-t' },
        { name: 'port', label: 'Port', required: true, flag: '-p' }
      ]
    }

    const mockValues = {
      required: { target: '192.168.1.1', port: '80' },
      optional: [],
      modifiers: []
    }

    bench('generate single command', () => {
      processTemplate(
        mockCommand.template,
        mockCommand.options,
        mockValues.required
      )
    })

    bench('generate command with modifiers', () => {
      const valuesWithModifiers = {
        ...mockValues,
        modifiers: [
          {
            key: 'grep-1',
            id: 'grep',
            required: { pattern: 'open' },
            parameters: []
          }
        ]
      }
      
      // Simulate command generation with modifiers
      let commandString = processTemplate(
        mockCommand.template,
        mockCommand.options,
        valuesWithModifiers.required
      )
      
      valuesWithModifiers.modifiers.forEach(mod => {
        commandString += ` | grep ${mod.required.pattern}`
      })
    })

    bench('generate command chain', () => {
      const commands = Array.from({ length: 10 }, (_, i) => ({
        ...mockCommand,
        id: `cmd-${i}`,
        key: `key-${i}`
      }))
      
      const values = Object.fromEntries(
        commands.map(cmd => [cmd.key, mockValues])
      )
      
      commands.map(cmd => {
        const cmdValues = values[cmd.key]
        return processTemplate(
          cmd.template,
          cmd.options,
          cmdValues.required
        )
      })
    })
  })

  describe('Memory Usage', () => {
    bench('create large object', () => {
      const largeObject = {
        commands: Array.from({ length: 10000 }, (_, i) => ({
          id: `cmd-${i}`,
          label: `Command ${i}`,
          category: `Category ${i % 10}`,
          keywords: Array.from({ length: 5 }, (_, j) => `keyword-${i}-${j}`),
          options: Array.from({ length: 3 }, (_, k) => ({
            name: `option-${k}`,
            label: `Option ${k}`,
            type: 'text'
          }))
        }))
      }
      
      // Simulate cleanup
      largeObject.commands = []
    })

    bench('JSON serialization - large data', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: Array.from({ length: 10 }, (_, j) => `data-${j}`)
      }))
      
      JSON.stringify(data)
    })

    bench('JSON deserialization - large data', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: Array.from({ length: 10 }, (_, j) => `data-${j}`)
      }))
      
      const serialized = JSON.stringify(data)
      JSON.parse(serialized)
    })
  })
})