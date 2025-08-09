/**
 * @file OptionalRow.tsx
 * @description A component that renders a single row for configuring an optional parameter
 * on a dropped command. It is draggable to allow reordering of optional flags.
 */

import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Minus, Regex } from "lucide-react";
import { ItemTypes } from "./constants";

/**
 * Props for the OptionalRow component.
 */
interface OptionalRowProps {
  cmdKey: string;
  opt: any;
  idx: number;
  meta: any;
  usedOptionalLabels: string[];
  handleOptChange: (
    cmdKey: string,
    idx: number,
    field: string,
    val: string
  ) => void;
  removeOptional: (cmdKey: string, idx: number) => void;
  moveOptional: (cmdKey: string, from: number, to: number) => void;
  openRegexModal: (
    callback: (value: string) => void,
    initialValue: string
  ) => void;
}

/**
 * A draggable row for an optional command parameter.
 * It allows the user to select an optional flag and provide a value.
 * It is memoized for performance as it's rendered in a list.
 */
export const OptionalRow = React.memo(function OptionalRow({
  cmdKey,
  opt,
  idx,
  meta,
  usedOptionalLabels,
  handleOptChange,
  removeOptional,
  moveOptional,
  openRegexModal,
}: OptionalRowProps) {
  const ref = useRef<HTMLDivElement>(null);

  // `useDrop` hook to handle reordering of optional parameter rows.
  const [, drop] = useDrop({
    accept: ItemTypes.OPTIONAL,
    hover(item: { index: number }) {
      if (!ref.current) return;
      const from = item.index;
      if (from === idx) return;
      moveOptional(cmdKey, from, idx);
      // Mutate the item's index in-flight for smooth reordering.
      item.index = idx;
    },
  });

  // `useDrag` hook to make the row draggable.
  const [, drag] = useDrag(() => ({
    type: ItemTypes.OPTIONAL,
    item: { index: idx },
  }));

  // Attach both drag and drop refs to the row's root element.
  drag(drop(ref));

  // Local state for showing/hiding suggestions for the option name input
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  return (
    <div
      ref={ref}
      className="mb-2 bg-gray-100 flex items-center space-x-2 dark:bg-gray-800 rounded-lg px-4 py-2"
    >
      {/* Drag handle */}
      <span className="text-gray-400">⋮⋮</span>
      {/* Autocomplete/typeahead for selecting the optional parameter */}
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Option name"
          value={opt.label}
          autoComplete="off"
          onChange={(e) => {
            handleOptChange(cmdKey, idx, "name", e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          title={opt.description}
          className={`p-2 bg-white dark:bg-gray-700 border-2 transition-all duration-300 ${
            opt.label ? "border-solid" : "border-dashed"
          } border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none w-full`}
        />
        {showSuggestions && (
          <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {meta.options
              .filter(
                (o) =>
                  !o.required &&
                  (!usedOptionalLabels.includes(o.label) ||
                    o.label === opt.label) &&
                  o.label
                    .toLowerCase()
                    .includes((opt.label || "").toLowerCase())
              )
              .slice(0, 10)
              .map((o) => (
                <div
                  key={o.name}
                  onMouseDown={() => {
                    handleOptChange(cmdKey, idx, "name", o.label);
                    setShowSuggestions(false);
                  }}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-blue-900 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <span className="font-medium dark:text-blue-300">
                    {o.label}
                  </span>
                </div>
              ))}
            {meta.options.filter(
              (o) =>
                !o.required &&
                (!usedOptionalLabels.includes(o.label) ||
                  o.label === opt.label) &&
                o.label.toLowerCase().includes((opt.label || "").toLowerCase())
            ).length === 0 && (
              <div className="px-3 py-2 text-gray-400 text-sm">
                No options found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Local state for showing/hiding suggestions const [showSuggestions, setShowSuggestions] = React.useState(false); */}
      {/* Conditional input field based on the selected parameter's type */}
      {(opt.type === "text" || opt.type === "regex") && (
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Value"
            value={opt.value}
            onChange={(e) =>
              handleOptChange(cmdKey, idx, "value", e.target.value)
            }
            className={`w-full p-2 border-2 transition-all duration-300 ${
              opt.value ? "border-solid" : "border-dashed"
            } border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 rounded-lg focus:outline-none ${
              opt.type === "regex" ? "pr-10" : ""
            }`}
          />
          {opt.type === "regex" && (
            <button
              onClick={() =>
                openRegexModal(
                  (value) => handleOptChange(cmdKey, idx, "value", value),
                  opt.value || ""
                )
              }
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Open Regex Builder"
            >
              <Regex strokeWidth={1.75} size={18} />
            </button>
          )}
        </div>
      )}
      {opt.type === "select" && (
        <div className="relative flex-1">
          <select
            value={opt.value}
            onChange={(e) =>
              handleOptChange(cmdKey, idx, "value", e.target.value)
            }
            className={`peer appearance-none block w-full px-3 py-2 border-2 transition-all duration-300 ${
              opt.value ? "border-solid" : "border-dashed"
            } border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none`}
          >
            <option value="">Choose...</option>
            {opt.choices?.map((choice) => {
              const choiceLabel =
                typeof choice === "string" ? choice : choice.label;
              const choiceValue =
                typeof choice === "string" ? choice : choice.value;
              return (
                <option key={choiceValue} value={choiceValue}>
                  {choiceLabel}
                </option>
              );
            })}
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
      {/* Button to remove this optional parameter row */}
      <button
        onClick={() => removeOptional(cmdKey, idx)}
        className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 active:bg-red-400 active:inset-shadow-sm dark:active:bg-red-500 transition  text-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
        aria-label="Remove optional parameter"
      >
        <Minus size={16} />
      </button>
    </div>
  );
});
