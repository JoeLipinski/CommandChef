/**
 * @file CommandForm.tsx
 * @description A comprehensive form for creating and editing command definitions.
 * It manages the state for a command's basic info, template, options, and variants.
 */

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  X,
  Edit,
  Regex,
  AlertTriangle,
} from "lucide-react";
import {
  generateCommandId,
  generateOptionId,
  generateVariantId,
} from "./utils";
import { validateCommand, ValidationResult } from "./utils/validation";
import { errorHandler } from "./utils/errorHandler";
import { useAccessibleForm, useScreenReader } from "./hooks/useAccessibility";
import { KEYBOARD_KEYS } from "./utils/accessibility";
import { AccessibleTooltip } from "./AccessibleTooltip";

/**
 * Props for the CommandForm component.
 * @property initialCommand - The command object to edit, or a template for a new command.
 * @property onSave - Callback function to save the command.
 * @property onCancel - Callback function to cancel editing and close the form.
 * @property allCategories - An array of all existing category names for the datalist.
 */
interface CommandFormProps {
  initialCommand: any;
  onSave: (command: any) => void;
  onCancel: () => void;
  allCategories: string[];
}

/**
 * A form component for creating or editing a command in the library.
 */
export function CommandForm({
  initialCommand,
  onSave,
  onCancel,
  allCategories,
}: CommandFormProps) {
  /**
   * State for the command object being edited.
   * We initialize it with a deep copy of the initial command and ensure
   * that nested arrays/objects exist to prevent runtime errors.
   */
  const [command, setCommand] = useState(() => {
    const cmd = JSON.parse(JSON.stringify(initialCommand));

    // Ensure command has an ID, generate one if missing
    if (!cmd.id && cmd.label) {
      cmd.id = generateCommandId(cmd.label);
    }

    // Ensure `variants` is always an array.
    if (!Array.isArray(cmd.variants)) {
      cmd.variants = [];
    }
    // Ensure options is always an array and each option has an ID
    if (!Array.isArray(cmd.options)) {
      cmd.options = [];
    }
    cmd.options.forEach((option, index) => {
      // Generate ID if missing
      if (!option.name && option.label) {
        option.name = generateOptionId(option.label);
      }
    });

    // Ensure each variant has a `prefilled` object and ID.
    cmd.variants.forEach((v, index) => {
      if (!v.prefilled) {
        v.prefilled = { required: {}, optional: [], modifiers: [] };
      }
      // Generate ID if missing
      if (!v.id) {
        v.id = generateVariantId(v.label || "", index);
      }
    });
    // Ensure keywords is always an array
    if (!Array.isArray(cmd.keywords)) {
      cmd.keywords = [];
    }
    return cmd;
  });

  /** State to track which variant's details are currently being edited. */
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(
    null
  );

  /** State to manage visibility of category suggestions dropdown. */
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  /** State to manage template autocomplete functionality. */
  const [showTemplateAutocomplete, setShowTemplateAutocomplete] =
    useState(false);
  const [templateCursorPosition, setTemplateCursorPosition] = useState(0);
  const [templateAutocompletePosition, setTemplateAutocompletePosition] =
    useState({ top: 0, left: 0 });
  const [templateFilterText, setTemplateFilterText] = useState("");

  // Local state for keywords input string
  const [keywordsInput, setKeywordsInput] = useState(
    Array.isArray(initialCommand.keywords)
      ? initialCommand.keywords.join(", ")
      : ""
  );

  // Local state for choices input strings (one per option)
  const [choicesInputs, setChoicesInputs] = useState<Record<number, string>>(
    () => {
      const inputs: Record<number, string> = {};
      initialCommand.options?.forEach((opt: any, index: number) => {
        if (opt.type === "select" && Array.isArray(opt.choices)) {
          inputs[index] = opt.choices
            .map((choice: any) =>
              typeof choice === "string"
                ? choice
                : `${choice.label}:${choice.value}`
            )
            .join(", ");
        }
      });
      return inputs;
    }
  );

  // Validation state
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
  });
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  /**
   * A generic handler to update top-level fields of the command state.
   * @param field - The name of the command property to update.
   * @param value - The new value.
   */
  const handleInputChange = (field: string, value: any) => {
    setCommand((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-generate command ID when label changes
      if (field === "label" && value) {
        updated.id = generateCommandId(value);
      }

      return updated;
    });
  };

  /**
   * Handles changes to a specific field within a command's option.
   * @param index - The index of the option being changed.
   * @param field - The name of the option property to update.
   * @param value - The new value.
   */
  const handleOptionChange = (index: number, field: string, value: any) => {
    const newOptions = [...command.options];
    let option = { ...newOptions[index], [field]: value };

    // Auto-generate option ID when label changes
    if (field === "label" && value) {
      option.name = generateOptionId(value);
    }

    // Handle special cases for certain field changes.
    if (field === "type" && value !== "select") {
      // Clear choices if type is no longer 'select'.
      delete option.choices;
      // Clear the choices input for this option
      setChoicesInputs((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
    } else if (field === "type" && value === "select" && !option.choices) {
      // Initialize choices input when type changes to select
      setChoicesInputs((prev) => ({
        ...prev,
        [index]: "",
      }));
    }
    if (field === "choices" && typeof value === "string") {
      // Convert comma-separated string to an array for 'select' choices.
      // Support both simple strings and "label:value" format
      option.choices = value
        .split(",")
        .map((s) => {
          const trimmed = s.trim();
          if (trimmed.includes(":")) {
            const [label, val] = trimmed.split(":");
            return { label: label.trim(), value: val.trim() };
          }
          return { label: trimmed, value: trimmed };
        })
        .filter((choice) => choice.label); // Remove empty choices
    }

    newOptions[index] = option;
    handleInputChange("options", newOptions);
  };

  /** Adds a new, empty option to the command's option list. */
  const addOption = () => {
    handleInputChange("options", [
      ...command.options,
      { name: "", label: "", type: "text", required: false, flag: "" },
    ]);
  };

  /** Removes an option from the command's option list by its index. */
  const removeOption = (index: number) => {
    const newOptions = [...command.options];
    newOptions.splice(index, 1);
    handleInputChange("options", newOptions);
  };

  /** Handles changes to a specific field within a command's variant. */
  const handleVariantChange = (index: number, field: string, value: string) => {
    const newVariants = [...command.variants];
    const updatedVariant = { ...newVariants[index], [field]: value };

    // Auto-generate variant ID when label changes
    if (field === "label" && value) {
      updatedVariant.id = generateVariantId(value, index);
    }

    newVariants[index] = updatedVariant;
    handleInputChange("variants", newVariants);
  };

  /** Adds a new, empty variant to the command. */
  const addVariant = () => {
    const newIndex = command.variants.length;
    handleInputChange("variants", [
      ...command.variants,
      {
        id: generateVariantId("", newIndex),
        label: "",
        prefilled: { required: {}, optional: [], modifiers: [] },
      },
    ]);
  };

  /** Removes a variant from the command by its index. */
  const removeVariant = (index: number) => {
    const newVariants = [...command.variants];
    newVariants.splice(index, 1);
    handleInputChange("variants", newVariants);
  };

  /** Toggles the visibility of the detailed prefilled options editor for a variant. */
  const toggleVariantDetails = (index: number) => {
    setEditingVariantIndex((prev) => (prev === index ? null : index));
  };

  /**
   * Handles changes to the prefilled values for a variant's options.
   * @param variantIndex - The index of the variant being edited.
   * @param option - The definition of the option being configured.
   * @param value - The prefilled value for the option.
   */
  const handleVariantOptionChange = (
    variantIndex: number,
    option: any,
    value: any
  ) => {
    setCommand((prevCmd) => {
      const newVariants = JSON.parse(JSON.stringify(prevCmd.variants));
      const variant = newVariants[variantIndex];

      // Ensure the prefilled structure exists.
      if (!variant.prefilled)
        variant.prefilled = { required: {}, optional: [], modifiers: [] };
      if (!variant.prefilled.required) variant.prefilled.required = {};
      if (!variant.prefilled.optional) variant.prefilled.optional = [];

      if (option.required) {
        // Update or add the value for a required option.
        variant.prefilled.required[option.name] = value;
      } else {
        // Handle optional parameters.
        const existingOptIndex = variant.prefilled.optional.findIndex(
          (p) => p.name === option.name
        );
        const hasValue =
          option.type === "checkbox"
            ? value === true
            : value !== null && value !== "";

        if (hasValue) {
          // If a value is provided, add or update the prefilled optional entry.
          const newPrefilledOption = {
            ...option,
            value: value,
            id: option.name,
          };
          if (existingOptIndex > -1) {
            variant.prefilled.optional[existingOptIndex] = newPrefilledOption;
          } else {
            variant.prefilled.optional.push(newPrefilledOption);
          }
        } else {
          // If the value is empty, remove the prefilled entry.
          if (existingOptIndex > -1) {
            variant.prefilled.optional.splice(existingOptIndex, 1);
          }
        }
      }
      return { ...prevCmd, variants: newVariants };
    });
  };

  /**
   * Handles template input changes and manages autocomplete functionality
   */
  const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart;

    handleInputChange("template", value);
    setTemplateCursorPosition(cursorPosition);

    // Check if user is typing after "{{" to trigger/update autocomplete
    const textBeforeCursor = value.substring(0, cursorPosition);

    // Find the last occurrence of "{{" before the cursor
    const lastBraceIndex = textBeforeCursor.lastIndexOf("{{");

    if (lastBraceIndex !== -1 && command.options.length > 0) {
      // Check if there's a closing "}}" between the opening braces and cursor
      const textAfterBraces = textBeforeCursor.substring(lastBraceIndex + 2);
      const hasClosingBraces = textAfterBraces.includes("}}");

      if (!hasClosingBraces) {
        // Extract the filter text (what user has typed after "{{")
        const filterText = textAfterBraces;
        setTemplateFilterText(filterText);

        // Calculate position for autocomplete dropdown
        const textarea = e.target;
        const rect = textarea.getBoundingClientRect();
        const lineHeight = 20; // Approximate line height
        const lines = textBeforeCursor.split("\n");
        const currentLine = lines.length - 1;
        const currentColumn = lines[lines.length - 1].length;

        setTemplateAutocompletePosition({
          top: rect.top + currentLine * lineHeight + 30,
          left: rect.left + currentColumn * 8, // Approximate character width
        });
        setShowTemplateAutocomplete(true);
      } else {
        setShowTemplateAutocomplete(false);
        setTemplateFilterText("");
      }
    } else {
      setShowTemplateAutocomplete(false);
      setTemplateFilterText("");
    }
  };

  /**
   * Handles selection of an autocomplete suggestion
   */
  const handleAutocompleteSelect = (optionLabel: string) => {
    const currentTemplate = command.template || "";
    const beforeCursor = currentTemplate.substring(0, templateCursorPosition);
    const afterCursor = currentTemplate.substring(templateCursorPosition);

    // Find the last "{{" before cursor to determine what to replace
    const lastBraceIndex = beforeCursor.lastIndexOf("{{");

    // Check if closing braces already exist after the cursor
    const hasClosingBraces = afterCursor.startsWith("}}");

    // Replace from the "{{" position
    const beforeBraces = beforeCursor.substring(0, lastBraceIndex);

    if (hasClosingBraces) {
      // If closing braces exist, just replace the content between {{ and }}
      const newTemplate = beforeBraces + `{{${optionLabel}` + afterCursor;
      handleInputChange("template", newTemplate);
    } else {
      // If no closing braces exist, add them
      const newTemplate = beforeBraces + `{{${optionLabel}}}` + afterCursor;
      handleInputChange("template", newTemplate);
    }

    setShowTemplateAutocomplete(false);
  };

  /**
   * Validates the current command and updates validation state
   */
  const validateCurrentCommand = () => {
    try {
      // Process keywords before validation
      const keywords = keywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      // Create command with processed keywords for validation
      const commandToValidate = {
        ...command,
        keywords: keywords,
      };

      const result = validateCommand(commandToValidate);
      setValidationResult(result);
      return result;
    } catch (error) {
      errorHandler.handleValidationError(
        "command",
        "Validation failed",
        command
      );
      const errorResult = {
        isValid: false,
        errors: [
          {
            field: "general",
            message: "Validation error occurred",
            code: "VALIDATION_ERROR",
          },
        ],
      };
      setValidationResult(errorResult);
      return errorResult;
    }
  };

  /** Handles the form submission, calling the onSave callback. */
  const handleSubmit = (e) => {
    e.preventDefault();
    setShowValidationErrors(true);

    // Validate the command before submission
    const validation = validateCurrentCommand();

    if (!validation.isValid) {
      // Show validation errors and don't submit
      errorHandler.handleValidationError(
        "form_submission",
        `Form has ${validation.errors.length} validation errors`,
        validation.errors
      );
      return;
    }

    try {
      // Process keywords before submission in case user didn't blur the field
      const keywords = keywordsInput
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      // Create final command with processed keywords
      const finalCommand = {
        ...command,
        keywords: keywords,
      };

      onSave(finalCommand);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createAppError(
          error as Error,
          "FORM_SUBMISSION_ERROR",
          { component: "CommandForm", action: "Submit form" },
          "Failed to save command. Please check your input and try again.",
          true
        ),
        "medium"
      );
    }
  };

  const filteredCategories = allCategories.filter((cat) =>
    cat.toLowerCase().includes((command.category || "").toLowerCase())
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col flex-1 overflow-hidden"
    >
      <div className="p-4 flex-1 overflow-y-auto space-y-4">
        {/* Validation Errors Display */}
        {showValidationErrors && !validationResult.isValid && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <h4 className="text-sm font-medium text-red-700 dark:text-red-300">
                Please fix the following errors:
              </h4>
            </div>
            <ul className="list-disc list-inside space-y-1">
              {validationResult.errors.map((error, index) => (
                <li
                  key={index}
                  className="text-sm text-red-600 dark:text-red-400"
                >
                  <span className="font-medium">{error.field}:</span>{" "}
                  {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Basic Command Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <input
              required
              type="text"
              id="command-label"
              value={command.label || ""}
              onChange={(e) => handleInputChange("label", e.target.value)}
              className={
                "peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 " +
                (command.label && command.label.trim() !== ""
                  ? " border-solid"
                  : " border-dashed")
              }
              placeholder=" "
            />
            <label
              htmlFor="command-label"
              className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
            >
              Name
            </label>
          </div>
          {/* Type Select */}
          <div className="relative flex-1">
            <select
              id="command-type"
              value={command.type}
              onChange={(e) => handleInputChange("type", e.target.value)}
              className="peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 "
            >
              <option value="command">Command</option>
              <option value="modifier">Modifier</option>
            </select>
            <label
              htmlFor="command-type"
              className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
            >
              Type
            </label>
          </div>
          {/* Category Autocomplete Input */}
          <div className="relative flex-1">
            <input
              type="text"
              id="command-category"
              value={command.category}
              onChange={(e) => {
                handleInputChange("category", e.target.value);
                setShowCategorySuggestions(true);
              }}
              onFocus={() => setShowCategorySuggestions(true)}
              onBlur={() =>
                setTimeout(() => setShowCategorySuggestions(false), 150)
              }
              className={
                "peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 " +
                (command.category && command.category.trim() !== ""
                  ? " border-solid"
                  : " border-dashed")
              }
              placeholder=" "
              autoComplete="off"
            />
            <label
              htmlFor="command-category"
              className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
            >
              Category
            </label>
            {showCategorySuggestions && (
              <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((cat) => (
                    <div
                      key={cat}
                      onMouseDown={() => {
                        handleInputChange("category", cat);
                        setShowCategorySuggestions(false);
                      }}
                      className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                    >
                      {cat}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-400 text-sm">
                    No categories found
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Keywords */}
          <div className="relative">
            <input
              id="command-keywords"
              value={keywordsInput}
              onChange={(e) => {
                // Preserve commas during typing - don't process until blur or submit
                setKeywordsInput(e.target.value);
              }}
              onBlur={(e) => {
                // Process keywords on blur - split by comma, trim, and filter empty
                const keywords = e.target.value
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean);
                handleInputChange("keywords", keywords);
                // Update display to show cleaned format
                setKeywordsInput(keywords.join(", "));
              }}
              className="peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 "
              placeholder=" "
            />
            <label
              htmlFor="command-keywords"
              className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
            >
              Keywords (comma separated)
            </label>
          </div>
        </div>
        {/* Template */}
        <div className="relative mt-4">
          <textarea
            id="command-template"
            value={command.template}
            onChange={handleTemplateChange}
            className={
              "peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5  font-mono" +
              (command.template ? " border-solid" : " border-dashed")
            }
            rows={2}
            placeholder=" "
          ></textarea>
          <label
            htmlFor="command-template"
            className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
          >
            Template
          </label>
          {/* Template Autocomplete Dropdown */}
          {showTemplateAutocomplete && (
            <div
              className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-48 mt-5"
              style={{
                top: templateAutocompletePosition.top,
                left: templateAutocompletePosition.left,
              }}
            >
              {(() => {
                const filteredOptions = command.options.filter((option) =>
                  option.label
                    .toLowerCase()
                    .includes(templateFilterText.toLowerCase())
                );

                return filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <div
                      key={index}
                      onMouseDown={() => handleAutocompleteSelect(option.label)}
                      className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm cursor-pointer"
                    >
                      {option.label}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-400 text-sm">
                    No matching options
                  </div>
                );
              })()}
            </div>
          )}
        </div>
        {/* Description */}
        <div className="relative mt-4">
          <textarea
            id="command-description"
            value={command.description || ""}
            onChange={(e) => handleInputChange("description", e.target.value)}
            className="peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 "
            rows={2}
            placeholder=" "
          ></textarea>
          <label
            htmlFor="command-description"
            className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
          >
            Description (Optional)
          </label>
        </div>

        {/* Docs URL */}
        <div className="relative mt-4">
          <input
            id="command-docs-url"
            value={command.docsUrl}
            onChange={(e) => handleInputChange("docsUrl", e.target.value)}
            className="peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 "
            placeholder=" "
          />
          <label
            htmlFor="command-docs-url"
            className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
          >
            Documentation URL (Optional)
          </label>
        </div>

        {/* Options Editor */}
        <div>
          <div className="flex items-center mb-4">
            <h4 className="font-semibold text-lg flex-1 flex items-center">
              Options
            </h4>
            <button
              type="button"
              onClick={addOption}
              className="ml-2 p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-blue-500 hover:text-white transition active:bg-blue-400 active:inset-shadow-sm dark:hover:bg-blue-600 dark:active:bg-blue-500 dark:text-gray-400 dark:hover:text-white duration-500"
              aria-label="Add Variant"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-3">
            {command.options.map((opt, i) => (
              <div
                key={i}
                className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg space-y-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Option Label */}
                  <div className="relative">
                    <input
                      required
                      type="text"
                      id={`option-label-${i}`}
                      value={opt.label}
                      onChange={(e) =>
                        handleOptionChange(i, "label", e.target.value)
                      }
                      className={
                        "peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 " +
                        (opt.label ? " border-solid" : " border-dashed")
                      }
                      placeholder=" "
                    />
                    <label
                      htmlFor={`option-label-${i}`}
                      className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
                    >
                      Label
                    </label>
                  </div>
                  {/* Option Required + Remove */}
                  <div className="flex items-center justify-end gap-4 col-span-1 md:col-start-2">
                    <label
                      htmlFor={`option-required-toggle-${i}`}
                      className="text-sm select-none flex items-center gap-2"
                    >
                      Required
                    </label>
                    <button
                      id={`option-required-toggle-${i}`}
                      role="switch"
                      aria-checked={!!opt.required}
                      onClick={() =>
                        handleOptionChange(i, "required", !opt.required)
                      }
                      type="button"
                      className={`${
                        opt.required
                          ? "bg-blue-600"
                          : "bg-gray-200 dark:bg-gray-600"
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-700`}
                    >
                      <span
                        className={`${
                          opt.required ? "translate-x-6" : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-red-500 hover:text-white transition active:bg-red-400 active:inset-shadow-sm dark:hover:bg-red-600 dark:active:bg-red-500 dark:text-gray-400 dark:hover:text-white duration-500"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {/* Option Description */}
                <div className="relative mt-2">
                  <input
                    type="text"
                    id={`option-description-${i}`}
                    value={opt.description || ""}
                    onChange={(e) =>
                      handleOptionChange(i, "description", e.target.value)
                    }
                    className={
                      "peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5"
                    }
                    placeholder=" "
                  />
                  <label
                    htmlFor={`option-description-${i}`}
                    className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
                  >
                    Description (Optional)
                  </label>
                </div>
                <div
                  className={`grid ${
                    opt.type === "select" ? "grid-cols-3" : "grid-cols-2"
                  } gap-2 items-center`}
                >
                  {/* Option Flag */}
                  <div className="relative">
                    <input
                      type="text"
                      id={`option-flag-${i}`}
                      value={opt.flag}
                      onChange={(e) =>
                        handleOptionChange(i, "flag", e.target.value)
                      }
                      required={opt.type === "checkbox"}
                      className={
                        "peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 " +
                        (opt.flag ? " border-solid" : " border-dashed")
                      }
                      placeholder=" "
                    />
                    <label
                      htmlFor={`option-flag-${i}`}
                      className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
                    >
                      {opt.type === "checkbox"
                        ? "Flag (Required)"
                        : "Flag (Optional)"}
                    </label>
                  </div>
                  {/* Option Type */}
                  <div className="relative">
                    <select
                      id={`option-type-${i}`}
                      value={opt.type}
                      onChange={(e) =>
                        handleOptionChange(i, "type", e.target.value)
                      }
                      className="peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 "
                    >
                      <option value="text">Text</option>
                      {/* Checkbox is only available for optional (non-required) options */}
                      {!opt.required && (
                        <option value="checkbox">Boolean Option</option>
                      )}
                      <option value="select">Select</option>
                      <option value="regex">Regex</option>
                    </select>
                    <label
                      htmlFor={`option-type-${i}`}
                      className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
                    >
                      Type
                    </label>
                  </div>
                  {/* Option Choices (if select) */}
                  {opt.type === "select" ? (
                    <div className="relative">
                      <input
                        type="text"
                        id={`option-choices-${i}`}
                        value={choicesInputs[i] || ""}
                        onChange={(e) => {
                          // Update local state without processing
                          setChoicesInputs((prev) => ({
                            ...prev,
                            [i]: e.target.value,
                          }));
                        }}
                        onBlur={(e) => {
                          // Process choices when user finishes editing
                          handleOptionChange(i, "choices", e.target.value);
                        }}
                        className={
                          "peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 " +
                          (Array.isArray(opt.choices) && opt.choices.length > 0
                            ? " border-solid"
                            : " border-dashed")
                        }
                        placeholder=" "
                      />
                      <label
                        htmlFor={`option-choices-${i}`}
                        className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
                      >
                        Choices (Label:Value)
                      </label>
                    </div>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Variants Editor */}
        <div>
          <div className="flex items-center mb-4">
            <h4 className="font-semibold text-lg flex-1 flex items-center">
              Variants
            </h4>
            <button
              type="button"
              onClick={addVariant}
              className="ml-2 p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-blue-500 hover:text-white transition active:bg-blue-400 active:inset-shadow-sm dark:hover:bg-blue-600 dark:active:bg-blue-500 dark:text-gray-400 dark:hover:text-white duration-500"
              aria-label="Add Variant"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {command.variants.map((v, i) => (
              <div
                key={i}
                className="p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg"
              >
                <div className="flex flex-col gap-2">
                  {/* First row: Label, Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-center">
                    {/* Variant Label */}
                    <div className="relative flex-1 min-w-[150px]">
                      <input
                        required
                        type="text"
                        id={`variant-label-${i}`}
                        value={v.label}
                        onChange={(e) =>
                          handleVariantChange(i, "label", e.target.value)
                        }
                        className={
                          "peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 " +
                          (v.label ? " border-solid" : " border-dashed")
                        }
                        placeholder=" "
                      />
                      <label
                        htmlFor={`variant-label-${i}`}
                        className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
                      >
                        Label
                      </label>
                    </div>
                    {/* Variant Actions */}
                    <div className="flex items-center justify-end gap-4 col-span-1 md:col-start-2">
                      <button
                        type="button"
                        onClick={() => toggleVariantDetails(i)}
                        className="p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-gray-500 hover:text-white transition active:bg-gray-400 active:inset-shadow-sm dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
                        aria-label="Edit Variant Details"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-red-500 hover:text-white transition active:bg-red-400 active:inset-shadow-sm dark:hover:bg-red-600 dark:active:bg-red-500 dark:text-gray-400 dark:hover:text-white duration-500"
                        aria-label="Remove Variant"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  {/* Second row: Description full width */}
                  <div className="relative w-full">
                    <input
                      type="text"
                      id={`variant-description-${i}`}
                      value={v.description || ""}
                      onChange={(e) =>
                        handleVariantChange(i, "description", e.target.value)
                      }
                      className={
                        "peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 " +
                        (v.description ? " border-solid" : " border-dashed")
                      }
                      placeholder=" "
                    />
                    <label
                      htmlFor={`variant-description-${i}`}
                      className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
                    >
                      Description (Optional)
                    </label>
                  </div>
                </div>

                {editingVariantIndex === i && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                      {command.options.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          This command has no options to configure
                        </p>
                      )}
                      {command.options.map((option) => {
                        let currentValue;
                        const prefilled = v.prefilled || {
                          required: {},
                          optional: [],
                        };
                        if (option.required) {
                          currentValue =
                            prefilled.required?.[option.name] ?? "";
                        } else {
                          const prefilledOpt = prefilled.optional?.find(
                            (p) => p.name === option.name
                          );
                          currentValue =
                            option.type === "checkbox"
                              ? !!prefilledOpt
                              : prefilledOpt?.value ?? "";
                        }

                        return (
                          <div
                            key={option.name}
                            className="flex items-center gap-4"
                          >
                            <label
                              className="w-1/3 truncate font-medium text-sm"
                              title={option.label}
                            >
                              {option.label}
                              {option.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </label>
                            <div className="w-2/3">
                              {(option.type === "text" ||
                                option.type === "regex") && (
                                <input
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) =>
                                    handleVariantOptionChange(
                                      i,
                                      option,
                                      e.target.value
                                    )
                                  }
                                  className="w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2"
                                  placeholder={
                                    option.flag
                                      ? `Value for ${option.flag}`
                                      : "Value"
                                  }
                                />
                              )}
                              {option.type === "checkbox" && (
                                <button
                                  id={`variant-${i}-opt-${option.name}`}
                                  role="switch"
                                  aria-checked={!!currentValue}
                                  onClick={() =>
                                    handleVariantOptionChange(
                                      i,
                                      option,
                                      !currentValue
                                    )
                                  }
                                  type="button"
                                  className={`${
                                    currentValue
                                      ? "bg-blue-600"
                                      : "bg-gray-200 dark:bg-gray-600"
                                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-700`}
                                >
                                  <span
                                    className={`${
                                      currentValue
                                        ? "translate-x-6"
                                        : "translate-x-1"
                                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                  />
                                </button>
                              )}
                              {option.type === "select" && (
                                <select
                                  value={currentValue}
                                  onChange={(e) =>
                                    handleVariantOptionChange(
                                      i,
                                      option,
                                      e.target.value
                                    )
                                  }
                                  className="peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 text-sm"
                                >
                                  <option value="">No Override</option>
                                  {(option.choices || []).map((choice) => {
                                    const choiceLabel =
                                      typeof choice === "string"
                                        ? choice
                                        : choice.label;
                                    const choiceValue =
                                      typeof choice === "string"
                                        ? choice
                                        : choice.value;
                                    return (
                                      <option
                                        key={choiceValue}
                                        value={choiceValue}
                                      >
                                        {choiceLabel}
                                      </option>
                                    );
                                  })}
                                </select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="p-4 flex justify-end items-center gap-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-gray-500 hover:text-white transition active:bg-gray-400 active:inset-shadow-sm dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition duration-500"
        >
          Save
        </button>
      </div>
    </form>
  );
}
