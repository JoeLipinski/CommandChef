/**
 * @file utils/validation.ts
 * @description Comprehensive validation utilities for forms and data
 */

import { ValidationError, ValidationResult } from '../types/errors';

export class Validator {
  private errors: ValidationError[] = [];

  constructor() {
    this.errors = [];
  }

  // Basic validation methods
  required(value: any, field: string, message?: string): this {
    if (value === null || value === undefined || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      this.addError(field, message || `${field} is required`, 'REQUIRED', value);
    }
    return this;
  }

  minLength(value: string, min: number, field: string, message?: string): this {
    if (typeof value === 'string' && value.length < min) {
      this.addError(field, message || `${field} must be at least ${min} characters`, 'MIN_LENGTH', value);
    }
    return this;
  }

  maxLength(value: string, max: number, field: string, message?: string): this {
    if (typeof value === 'string' && value.length > max) {
      this.addError(field, message || `${field} must be no more than ${max} characters`, 'MAX_LENGTH', value);
    }
    return this;
  }

  pattern(value: string, regex: RegExp, field: string, message?: string): this {
    if (typeof value === 'string' && !regex.test(value)) {
      this.addError(field, message || `${field} format is invalid`, 'PATTERN', value);
    }
    return this;
  }

  email(value: string, field: string, message?: string): this {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return this.pattern(value, emailRegex, field, message || `${field} must be a valid email address`);
  }

  url(value: string, field: string, message?: string): this {
    try {
      new URL(value);
    } catch {
      this.addError(field, message || `${field} must be a valid URL`, 'URL', value);
    }
    return this;
  }

  numeric(value: any, field: string, message?: string): this {
    if (value !== '' && value !== null && value !== undefined && isNaN(Number(value))) {
      this.addError(field, message || `${field} must be a number`, 'NUMERIC', value);
    }
    return this;
  }

  integer(value: any, field: string, message?: string): this {
    if (value !== '' && value !== null && value !== undefined && 
        (!Number.isInteger(Number(value)) || Number(value) !== parseInt(String(value), 10))) {
      this.addError(field, message || `${field} must be an integer`, 'INTEGER', value);
    }
    return this;
  }

  min(value: number, min: number, field: string, message?: string): this {
    if (typeof value === 'number' && value < min) {
      this.addError(field, message || `${field} must be at least ${min}`, 'MIN_VALUE', value);
    }
    return this;
  }

  max(value: number, max: number, field: string, message?: string): this {
    if (typeof value === 'number' && value > max) {
      this.addError(field, message || `${field} must be no more than ${max}`, 'MAX_VALUE', value);
    }
    return this;
  }

  oneOf(value: any, options: any[], field: string, message?: string): this {
    if (!options.includes(value)) {
      this.addError(field, message || `${field} must be one of: ${options.join(', ')}`, 'ONE_OF', value);
    }
    return this;
  }

  custom(predicate: (value: any) => boolean, field: string, message: string, value?: any): this {
    if (!predicate(value)) {
      this.addError(field, message, 'CUSTOM', value);
    }
    return this;
  }

  // Array validation
  arrayMinLength(value: any[], min: number, field: string, message?: string): this {
    if (Array.isArray(value) && value.length < min) {
      this.addError(field, message || `${field} must have at least ${min} items`, 'ARRAY_MIN_LENGTH', value);
    }
    return this;
  }

  arrayMaxLength(value: any[], max: number, field: string, message?: string): this {
    if (Array.isArray(value) && value.length > max) {
      this.addError(field, message || `${field} must have no more than ${max} items`, 'ARRAY_MAX_LENGTH', value);
    }
    return this;
  }

  // Object validation
  hasProperty(obj: any, property: string, field: string, message?: string): this {
    if (typeof obj === 'object' && obj !== null && !(property in obj)) {
      this.addError(field, message || `${field} must have property ${property}`, 'MISSING_PROPERTY', obj);
    }
    return this;
  }

  private addError(field: string, message: string, code: string, value?: any): void {
    this.errors.push({ field, message, code, value });
  }

  getResult(): ValidationResult {
    const result = {
      isValid: this.errors.length === 0,
      errors: [...this.errors]
    };
    this.errors = []; // Reset for next validation
    return result;
  }

  static validate(callback: (validator: Validator) => void): ValidationResult {
    const validator = new Validator();
    callback(validator);
    return validator.getResult();
  }
}

// Specific validation functions for the application

export function validateCommand(command: any): ValidationResult {
  return Validator.validate(v => {
    v.required(command.label, 'label', 'Command name is required')
     .minLength(command.label, 1, 'label', 'Command name cannot be empty')
     .maxLength(command.label, 100, 'label', 'Command name is too long');

    v.required(command.category, 'category', 'Category is required')
     .minLength(command.category, 1, 'category', 'Category cannot be empty')
     .maxLength(command.category, 50, 'category', 'Category name is too long');

    v.oneOf(command.type, ['command', 'modifier'], 'type', 'Type must be either "command" or "modifier"');

    if (command.template) {
      v.maxLength(command.template, 1000, 'template', 'Template is too long');
      // Validate template syntax
      v.custom(
        (template) => validateTemplateSyntax(template),
        'template',
        'Template contains invalid placeholder syntax',
        command.template
      );
    }

    if (command.description) {
      v.maxLength(command.description, 500, 'description', 'Description is too long');
    }

    if (command.docsUrl) {
      v.url(command.docsUrl, 'docsUrl', 'Documentation URL must be valid');
    }

    if (command.keywords && Array.isArray(command.keywords)) {
      v.arrayMaxLength(command.keywords, 20, 'keywords', 'Too many keywords (max 20)');
      command.keywords.forEach((keyword: string, index: number) => {
        v.maxLength(keyword, 50, `keywords[${index}]`, `Keyword ${index + 1} is too long`);
      });
    }

    if (command.options && Array.isArray(command.options)) {
      command.options.forEach((option: any, index: number) => {
        validateOption(option, `options[${index}]`, v);
      });
    }

    if (command.variants && Array.isArray(command.variants)) {
      command.variants.forEach((variant: any, index: number) => {
        validateVariant(variant, `variants[${index}]`, v);
      });
    }
  });
}

export function validateOption(option: any, fieldPrefix: string = 'option', validator?: Validator): ValidationResult {
  const v = validator || new Validator();
  
  v.required(option.label, `${fieldPrefix}.label`, 'Option label is required')
   .minLength(option.label, 1, `${fieldPrefix}.label`, 'Option label cannot be empty')
   .maxLength(option.label, 100, `${fieldPrefix}.label`, 'Option label is too long');

  if (option.name) {
    v.pattern(option.name, /^[a-zA-Z][a-zA-Z0-9_-]*$/, `${fieldPrefix}.name`, 'Option name must start with a letter and contain only letters, numbers, hyphens, and underscores');
  }

  if (option.type) {
    v.oneOf(option.type, ['text', 'select', 'checkbox', 'regex'], `${fieldPrefix}.type`, 'Option type must be text, select, checkbox, or regex');
  }

  if (option.description) {
    v.maxLength(option.description, 200, `${fieldPrefix}.description`, 'Option description is too long');
  }

  if (option.flag) {
    v.pattern(option.flag, /^-{1,2}[a-zA-Z0-9][a-zA-Z0-9-]*$/, `${fieldPrefix}.flag`, 'Flag must start with - or -- followed by alphanumeric characters');
  }

  if (option.type === 'select' && option.choices) {
    v.arrayMinLength(option.choices, 1, `${fieldPrefix}.choices`, 'Select options must have at least one choice');
    v.arrayMaxLength(option.choices, 50, `${fieldPrefix}.choices`, 'Too many choices (max 50)');
    
    option.choices.forEach((choice: any, index: number) => {
      if (typeof choice === 'string') {
        v.minLength(choice, 1, `${fieldPrefix}.choices[${index}]`, `Choice ${index + 1} cannot be empty`);
      } else if (typeof choice === 'object' && choice !== null) {
        v.required(choice.label, `${fieldPrefix}.choices[${index}].label`, `Choice ${index + 1} label is required`);
        v.required(choice.value, `${fieldPrefix}.choices[${index}].value`, `Choice ${index + 1} value is required`);
      }
    });
  }

  return validator ? { isValid: true, errors: [] } : v.getResult();
}

export function validateVariant(variant: any, fieldPrefix: string = 'variant', validator?: Validator): ValidationResult {
  const v = validator || new Validator();
  
  v.required(variant.label, `${fieldPrefix}.label`, 'Variant label is required')
   .minLength(variant.label, 1, `${fieldPrefix}.label`, 'Variant label cannot be empty')
   .maxLength(variant.label, 100, `${fieldPrefix}.label`, 'Variant label is too long');

  if (variant.id) {
    v.pattern(variant.id, /^[a-zA-Z][a-zA-Z0-9_-]*$/, `${fieldPrefix}.id`, 'Variant ID must start with a letter and contain only letters, numbers, hyphens, and underscores');
  }

  return validator ? { isValid: true, errors: [] } : v.getResult();
}

export function validateCommandChain(chain: any): ValidationResult {
  return Validator.validate(v => {
    v.required(chain, 'chain', 'Command chain is required');
    
    if (chain && typeof chain === 'object') {
      v.required(chain.dropped, 'chain.dropped', 'Chain must have dropped commands');
      v.required(chain.values, 'chain.values', 'Chain must have command values');
      
      if (Array.isArray(chain.dropped)) {
        v.arrayMinLength(chain.dropped, 1, 'chain.dropped', 'Chain must have at least one command');
        
        chain.dropped.forEach((command: any, index: number) => {
          v.required(command.id, `chain.dropped[${index}].id`, `Command ${index + 1} must have an ID`);
          v.required(command.key, `chain.dropped[${index}].key`, `Command ${index + 1} must have a key`);
        });
      }
      
      if (chain.values && typeof chain.values === 'object') {
        Object.entries(chain.values).forEach(([key, value]: [string, any]) => {
          if (value && typeof value === 'object') {
            v.hasProperty(value, 'required', `chain.values[${key}]`, `Command values for ${key} must have required properties`);
            v.hasProperty(value, 'optional', `chain.values[${key}]`, `Command values for ${key} must have optional properties`);
            v.hasProperty(value, 'modifiers', `chain.values[${key}]`, `Command values for ${key} must have modifiers properties`);
          }
        });
      }
    }
  });
}

export function validateTemplateSyntax(template: string): boolean {
  if (!template) return true;
  
  try {
    // Check for balanced braces
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      return false;
    }
    
    // Check for valid placeholder names (letters, numbers, underscores)
    const placeholders = template.match(/\{\{([^}]+)\}\}/g) || [];
    for (const placeholder of placeholders) {
      const name = placeholder.slice(2, -2).trim();
      if (!name || !/^[a-zA-Z][a-zA-Z0-9_\s]*$/.test(name)) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

export function validateStorageData(data: any, type: 'commands' | 'chains'): ValidationResult {
  return Validator.validate(v => {
    v.required(data, 'data', 'Data is required');
    
    if (type === 'commands') {
      if (Array.isArray(data)) {
        data.forEach((command: any, index: number) => {
          const commandValidation = validateCommand(command);
          commandValidation.errors.forEach(error => {
            v.custom(() => false, `commands[${index}].${error.field}`, error.message);
          });
        });
      } else {
        v.custom(() => false, 'data', 'Commands data must be an array');
      }
    } else if (type === 'chains') {
      if (typeof data === 'object' && data !== null) {
        Object.entries(data).forEach(([name, chain]: [string, any]) => {
          v.minLength(name, 1, `chains.${name}`, 'Chain name cannot be empty');
          const chainValidation = validateCommandChain(chain);
          chainValidation.errors.forEach(error => {
            v.custom(() => false, `chains.${name}.${error.field}`, error.message);
          });
        });
      } else {
        v.custom(() => false, 'data', 'Chains data must be an object');
      }
    }
  });
}

// Export commonly used validation patterns
export const ValidationPatterns = {
  COMMAND_ID: /^[a-zA-Z][a-zA-Z0-9_-]*$/,
  FLAG: /^-{1,2}[a-zA-Z0-9][a-zA-Z0-9-]*$/,
  PLACEHOLDER: /^\{\{[a-zA-Z][a-zA-Z0-9_\s]*\}\}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/.+/
} as const;