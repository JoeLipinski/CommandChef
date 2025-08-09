/**
 * @file DroppedModifier.tsx
 * @description Renders a modifier (e.g., `| grep`) that has been attached to a command.
 * It displays the modifier's own parameters and provides a way to remove it.
 */

import React, { useRef, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Minus, Regex, Plus } from "lucide-react";
import { ItemTypes } from "./constants";
import { ErrorBoundary } from "./ErrorBoundary";
import { dragDropErrorHandler } from "./utils/dragDropErrorHandler";
import {
  useAccessibleDragDrop,
  useScreenReader,
} from "./hooks/useAccessibility";
import { KEYBOARD_KEYS } from "./utils/accessibility";
import { AccessibleTooltip } from "./AccessibleTooltip";

/**
 * Props for the DroppedModifier component.
 */
interface DroppedModifierProps {
  mod: any;
  cmdKey: string;
  commandMap: any;
  handleModifierChange: (
    cmdKey: string,
    modKey: string,
    fieldName: string,
    value: string | any[]
  ) => void;
  removeModifier: (cmdKey: string, modKey: string) => void;
  openRegexModal: (
    callback: (value: string) => void,
    initialValue: string
  ) => void;
  index?: number;
  moveModifier?: (from: number, to: number) => void;
  modifiers?: any[];
}

// --- Unified row for pre-defined and custom parameters ---
interface ModifierParameterRowProps {
  modKey: string;
  idx: number;
  param: any;
  meta: any;
  usedOptionalLabels: string[];
  handleParameterChange: (
    modKey: string,
    idx: number,
    field: string,
    val: any
  ) => void;
  removeParameter: (modKey: string, idx: number) => void;
  openRegexModal: (
    callback: (value: string) => void,
    initialValue: string
  ) => void;
  moveParameter: (from: number, to: number) => void;
}

const ModifierParameterRow = React.memo(function ModifierParameterRow({
  modKey,
  idx,
  param,
  meta,
  usedOptionalLabels,
  handleParameterChange,
  removeParameter,
  openRegexModal,
  moveParameter,
}: ModifierParameterRowProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.MODIFIER_OPTIONAL,
    item: { index: idx },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  });
  const [, drop] = useDrop({
    accept: ItemTypes.MODIFIER_OPTIONAL,
    hover(item: { index: number }) {
      if (!ref.current || item.index === idx) return;
      moveParameter(item.index, idx);
      item.index = idx;
    },
  });

  drag(drop(ref));

  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const isChecked = param.type === "checkbox" && param.value === true;
  const isDefined = !param.isCustom && param.name;

  return (
    <div
      ref={ref}
      className={`bg-gray-200 dark:bg-gray-900/70 flex items-center space-x-2 rounded-lg px-4 py-2 transition-opacity ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
    >
      <span className="text-gray-400">⋮⋮</span>

      {/* Autocomplete for choosing an option */}
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Option name"
          value={param.label || ""}
          autoComplete="off"
          onChange={(e) => {
            handleParameterChange(modKey, idx, "label", e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className={`p-2 bg-white dark:bg-gray-700 border-2 transition-all duration-300 ${
            param.label ? "border-solid" : "border-dashed"
          } border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none w-full`}
        />
        {showSuggestions && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {meta.options
              .filter(
                (o) =>
                  !o.required &&
                  (!usedOptionalLabels.includes(o.label) ||
                    o.label === param.label) &&
                  o.label
                    .toLowerCase()
                    .includes((param.label || "").toLowerCase())
              )
              .slice(0, 10)
              .map((o) => (
                <div
                  key={o.name}
                  onMouseDown={() => {
                    handleParameterChange(modKey, idx, "label", o.label);
                    setShowSuggestions(false);
                  }}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-blue-900 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <span className="font-medium dark:text-blue-300">
                    {o.label}
                  </span>
                </div>
              ))}
            <div
              onMouseDown={() => {
                handleParameterChange(modKey, idx, "label", "Custom Flag");
                setShowSuggestions(false);
              }}
              className="px-3 py-2 hover:bg-gray-100 font-medium dark:text-blue-300 dark:hover:bg-blue-900 text-sm border-b border-gray-100 dark:border-gray-700"
            >
              Custom Flags
            </div>
          </div>
        )}
      </div>

      {/* Input for custom value */}
      {param.isCustom && (
        <input
          type="text"
          placeholder="Value"
          value={param.value || ""}
          onChange={(e) =>
            handleParameterChange(modKey, idx, "value", e.target.value)
          }
          className={`p-2 bg-white dark:bg-gray-700 border-2 transition-all duration-300 ${
            param.value ? "border-solid" : "border-dashed"
          } border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none flex-1`}
        />
      )}

      {/* Inputs for pre-defined options */}
      {isDefined && (param.type === "text" || param.type === "regex") && (
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Value"
            value={param.value || ""}
            onChange={(e) =>
              handleParameterChange(modKey, idx, "value", e.target.value)
            }
            className={`p-2 border-2 transition-all duration-300 ${
              param.value ? "border-solid" : "border-dashed"
            } border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 rounded-lg focus:outline-none w-full ${
              param.type === "regex" ? "pr-10" : ""
            }`}
          />
          {param.type === "regex" && (
            <button
              type="button"
              onClick={() =>
                openRegexModal(
                  (value) => handleParameterChange(modKey, idx, "value", value),
                  param.value || ""
                )
              }
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-300"
              aria-label="Open Regex Generator"
            >
              <Regex size={20} strokeWidth={1.5} />
            </button>
          )}
        </div>
      )}
      {isDefined && param.type === "select" && (
        <div className="relative flex-1">
          <select
            value={param.value || ""}
            onChange={(e) =>
              handleParameterChange(modKey, idx, "value", e.target.value)
            }
            className={`peer appearance-none block w-full px-3 py-2 border-2 transition-all duration-300 ${
              param.value ? "border-solid" : "border-dashed"
            } border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none`}
          >
            <option value="">Choose...</option>
            {param.choices?.map((choice) => (
              <option key={choice} value={choice}>
                {choice}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </span>
        </div>
      )}

      <button
        onClick={() => removeParameter(modKey, idx)}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 active:bg-red-400 active:inset-shadow-sm dark:active:bg-red-500 transition  text-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
        aria-label="Remove parameter"
      >
        <Minus size={16} />
      </button>
    </div>
  );
});

export const DroppedModifier = React.memo(function DroppedModifier({
  mod,
  cmdKey,
  commandMap,
  handleModifierChange,
  removeModifier,
  openRegexModal,
  index,
  moveModifier,
}: DroppedModifierProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { announce } = useScreenReader();

  // Accessible drag and drop
  const {
    handleKeyDown: handleAccessibleDragDrop,
    isDragging: keyboardDragging,
  } = useAccessibleDragDrop(
    [], // We'll handle this at the parent level
    (fromIndex, toIndex) => {
      if (moveModifier && typeof index === "number") {
        moveModifier(fromIndex, toIndex);
        announce(
          `Moved modifier from position ${fromIndex + 1} to position ${
            toIndex + 1
          }`
        );
      }
    }
  );

  // Drag and drop logic for modifier reordering
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.MODIFIER,
    item: { index: index ?? 0 },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  const [, drop] = useDrop({
    accept: ItemTypes.MODIFIER,
    hover(item: { index: number }) {
      if (!ref.current) return;
      const from = item.index;
      if (typeof index !== "number" || from === index) return;
      if (moveModifier) moveModifier(from, index);
      item.index = index;
    },
  });
  drag(drop(ref));

  const meta = commandMap[mod.id];
  if (!meta) return null;

  // --- Local State and Handlers ---
  const [parameters, setParameters] = React.useState(mod.parameters || []);
  const usedOptionalLabels = parameters
    .filter((p) => !p.isCustom)
    .map((p) => p.label)
    .filter(Boolean);

  // Sync state from parent props
  useEffect(() => {
    // Basic check to prevent infinite loops. A deep compare would be safer but more expensive.
    if (JSON.stringify(mod.parameters) !== JSON.stringify(parameters)) {
      setParameters(mod.parameters || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod.parameters]);

  // Propagate state changes up to parent
  useEffect(() => {
    handleModifierChange(cmdKey, mod.key, "parameters", parameters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameters]);

  const addParameter = () => {
    setParameters((prev) => [...prev, { id: Date.now() }]);
  };

  const removeParameter = (_, idx) => {
    setParameters((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveParameter = React.useCallback(
    (from, to) =>
      setParameters((prev) => {
        const list = [...prev];
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        return list;
      }),
    []
  );

  const handleParameterChange = (_, idx, field, val) => {
    setParameters((prev) => {
      const list = [...prev];
      const oldParam = list[idx];
      let newParam;

      if (field === "label") {
        // This is from the autocomplete
        if (val === "Custom Flag") {
          newParam = { id: oldParam.id, isCustom: true, label: val };
        } else {
          const optMeta = meta.options.find((o) => o.label === val);
          if (optMeta) {
            newParam = {
              ...optMeta,
              id: oldParam.id,
              isCustom: false,
              value: optMeta.type === "checkbox" ? true : "", // Default value
            };
          } else {
            // User is typing, not a selection yet
            newParam = { ...oldParam, label: val, isCustom: false, name: "" };
          }
        }
      } else {
        // Change to an existing field (e.g., value, or a custom flag's flag)
        newParam = { ...oldParam, [field]: val };
      }

      list[idx] = newParam;
      return list;
    });
  };

  return (
    <div
      ref={ref}
      className={`p-3 bg-gray-100 dark:bg-gray-800 rounded-lg relative transition-opacity duration-200 flex items-start gap-2 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <span className="select-none text-gray-400" title="Drag to reorder">
        ⋮⋮
      </span>
      <div className="flex-1">
        <div className="absolute top-1/2 -left-[14px] -translate-y-1/2 w-3 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex justify-between items-center">
          <h5 className={`font-semibold`}>{meta.label}</h5>
          <div className="flex gap-2 items-center">
            <button
              onClick={addParameter}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-blue-500 hover:text-white transition active:bg-blue-400 active:inset-shadow-sm dark:hover:bg-blue-600 dark:active:bg-blue-500 dark:text-gray-400 dark:hover:text-white duration-500"
              aria-label="Add parameter"
              title="Add parameter"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => removeModifier(cmdKey, mod.key)}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 active:bg-red-400 active:inset-shadow-sm dark:active:bg-red-500 transition text-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
              aria-label="Remove modifier"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>

        {meta.options
          .filter((opt) => opt.required)
          .map((opt) => (
            <div key={opt.name} className="flex items-center gap-2 mt-2">
              <label
                className="block min-w-[80px] flex-shrink-0"
                title={opt.description}
              >
                <span
                  className={
                    opt.description
                      ? "border-b-2 border-dotted border-gray-400 dark:border-gray-500"
                      : ""
                  }
                >
                  {opt.label}
                </span>
              </label>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={mod.required?.[opt.name] || ""}
                  onChange={(e) =>
                    handleModifierChange(
                      cmdKey,
                      mod.key,
                      opt.name,
                      e.target.value
                    )
                  }
                  className={`w-full p-2 border-2 transition-all duration-300  ${
                    mod.required?.[opt.name] ? "border-solid" : "border-dashed"
                  } border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-white dark:bg-gray-700 ${
                    opt.type === "regex" ? "pr-10" : ""
                  }`}
                />
                {opt.type === "regex" && (
                  <button
                    onClick={() =>
                      openRegexModal(
                        (value) =>
                          handleModifierChange(
                            cmdKey,
                            mod.key,
                            opt.name,
                            value
                          ),
                        mod.required?.[opt.name] || ""
                      )
                    }
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-300"
                    aria-label="Open Regex Generator"
                  >
                    <Regex size={20} strokeWidth={1.5} />
                  </button>
                )}
              </div>
            </div>
          ))}

        <div className={`grid gap-y-2 ${parameters.length > 0 ? "pt-3" : ""}`}>
          {parameters.map((param, idx) => (
            <ModifierParameterRow
              key={param.id}
              modKey={mod.key}
              idx={idx}
              param={param}
              meta={meta}
              usedOptionalLabels={usedOptionalLabels}
              handleParameterChange={handleParameterChange}
              removeParameter={removeParameter}
              openRegexModal={openRegexModal}
              moveParameter={moveParameter}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
