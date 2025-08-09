/**
 * @file utils.ts
 * @description Utility functions for the application
 */

/**
 * Converts a label to a URL-friendly slug
 * @param label - The label to convert
 * @returns A slugified version of the label
 */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

/**
 * Generates a unique ID based on a label with optional fallback
 * @param label - The label to base the ID on
 * @param fallback - Optional fallback string to use if label is empty
 * @returns A unique ID string
 */
export function generateId(label: string, fallback?: string): string {
  const baseLabel = label?.trim() || fallback || '';
  
  if (!baseLabel) {
    // If no label or fallback, use timestamp
    return `item-${Date.now()}`;
  }
  
  const slug = slugify(baseLabel);
  
  if (!slug) {
    // If slugification results in empty string, use timestamp
    return `item-${Date.now()}`;
  }
  
  return slug;
}

/**
 * Generates a unique ID for commands based on label with timestamp fallback
 * @param label - The command label
 * @returns A unique command ID
 */
export function generateCommandId(label: string): string {
  return generateId(label, `command-${Date.now()}`);
}

/**
 * Generates a unique ID for options based on label
 * @param label - The option label
 * @returns A unique option ID
 */
export function generateOptionId(label: string): string {
  return generateId(label, `option-${Date.now()}`);
}

/**
 * Generates a unique ID for variants based on label with index fallback
 * @param label - The variant label
 * @param index - The variant index as fallback
 * @returns A unique variant ID
 */
export function generateVariantId(label: string, index: number): string {
  return generateId(label, `variant-${index}`);
}

// Cache for processed templates to avoid recomputation
const templateCache = new Map<string, string>();

/**
 * Validates template syntax for balanced braces and valid placeholder names
 * @param template - The template string to validate
 * @returns True if template syntax is valid
 */
export function validateTemplateSyntax(template: string): boolean {
  if (!template || typeof template !== 'string') return true;
  
  try {
    // Check for balanced braces
    const openBraces = (template.match(/\{\{/g) || []).length;
    const closeBraces = (template.match(/\}\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      return false;
    }
    
    // Check for valid placeholder names (letters, numbers, underscores, spaces)
    const placeholders = template.match(/\{\{([^}]+)\}\}/g) || [];
    for (const placeholder of placeholders) {
      const name = placeholder.slice(2, -2).trim();
      if (!name || !/^[a-zA-Z][a-zA-Z0-9_\s]*$/.test(name)) {
        return false;
      }
    }
    
    // Check for nested braces (not allowed)
    if (template.includes('{{{') || template.includes('}}}')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Processes a template string by replacing label-based placeholders with values
 * @param template - The template string with {{Label}} placeholders
 * @param options - Array of option definitions with name, label, etc.
 * @param requiredValues - Object with option IDs as keys and values
 * @returns Processed template string
 */
export function processTemplate(
  template: string,
  options: any[],
  requiredValues: Record<string, string>
): string {
  try {
    // Input validation
    if (typeof template !== 'string') {
      throw new Error('Template must be a string');
    }
    
    if (!Array.isArray(options)) {
      throw new Error('Options must be an array');
    }
    
    if (typeof requiredValues !== 'object' || requiredValues === null) {
      throw new Error('Required values must be an object');
    }

    // Create cache key from inputs
    const cacheKey = JSON.stringify({ 
      template, 
      options: options.map(o => ({ 
        name: o?.name, 
        label: o?.label, 
        required: o?.required, 
        flag: o?.flag 
      })), 
      requiredValues 
    });
    
    // Check cache first
    if (templateCache.has(cacheKey)) {
      return templateCache.get(cacheKey)!;
    }
    
    let processedTemplate = template;
    
    // Validate template syntax before processing
    if (!validateTemplateSyntax(template)) {
      throw new Error('Invalid template syntax: unbalanced braces or invalid placeholder names');
    }
    
    // Create a mapping from option labels to their IDs and option details
    const labelToOptionMap = new Map<string, any>();
    const idToOptionMap = new Map<string, any>();
    
    options.forEach((option, index) => {
      try {
        if (option && typeof option === 'object') {
          if (option.label && option.name) {
            labelToOptionMap.set(option.label, option);
            idToOptionMap.set(option.name, option);
          }
        }
      } catch (optionError) {
        console.warn(`Error processing option at index ${index}:`, optionError);
      }
    });
    
    // Replace label-based placeholders with values (including flags for required options)
    labelToOptionMap.forEach((option, optionLabel) => {
      try {
        const value = requiredValues[option.name];
        if (value !== undefined && value !== null) {
          // Escape special regex characters in the label
          const escapedLabel = optionLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const labelPlaceholder = new RegExp(`\\{\\{${escapedLabel}\\}\\}`, "g");
          
          // For required options with flags, prepend the flag to the value
          let replacementValue = String(value);
          if (option.required && option.flag && option.flag.trim() !== "" && value.toString().trim() !== "") {
            replacementValue = `${option.flag} ${value}`;
          }
          
          processedTemplate = processedTemplate.replace(labelPlaceholder, replacementValue);
        }
      } catch (replacementError) {
        console.warn(`Error replacing placeholder for ${optionLabel}:`, replacementError);
      }
    });
    
    // For backward compatibility, also support ID-based placeholders
    Object.entries(requiredValues).forEach(([optionId, value]) => {
      try {
        if (value !== undefined && value !== null) {
          const option = idToOptionMap.get(optionId);
          // Escape special regex characters in the ID
          const escapedId = optionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const idPlaceholder = new RegExp(`\\{\\{${escapedId}\\}\\}`, "g");
          
          // For required options with flags, prepend the flag to the value
          let replacementValue = String(value);
          if (option && option.required && option.flag && option.flag.trim() !== "" && value.toString().trim() !== "") {
            replacementValue = `${option.flag} ${value}`;
          }
          
          processedTemplate = processedTemplate.replace(idPlaceholder, replacementValue);
        }
      } catch (replacementError) {
        console.warn(`Error replacing placeholder for ${optionId}:`, replacementError);
      }
    });
    
    // Cache the result (limit cache size to prevent memory leaks)
    if (templateCache.size > 1000) {
      const firstKey = templateCache.keys().next().value;
      templateCache.delete(firstKey);
    }
    templateCache.set(cacheKey, processedTemplate);
    
    return processedTemplate;
    
  } catch (error) {
    // Import errorHandler dynamically to avoid circular dependencies
    import('./utils/errorHandler').then(({ errorHandler }) => {
      errorHandler.handleTemplateError(template, error as Error);
    }).catch(() => {
      console.error('Template processing error:', error);
    });
    
    // Return original template on error to prevent breaking the UI
    return template;
  }
}

/**
 * Clears the template processing cache
 */
export function clearTemplateCache(): void {
  templateCache.clear();
}