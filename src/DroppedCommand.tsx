/**
 * @file DroppedCommand.tsx
 * @description Renders a single command that has been dropped into the chain.
 * This is a complex component that handles parameter inputs, adding/removing optional flags,
 * managing modifiers, and drag-and-drop reordering within the chain.
 */

import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { Plus, X, Network, Regex } from "lucide-react";
import { ItemTypes } from "./constants";
import { DroppedModifier } from "./DroppedModifier";
import { OptionalRow } from "./OptionalRow";
import { ErrorBoundary } from "./ErrorBoundary";
import { dragDropErrorHandler } from "./utils/dragDropErrorHandler";

/**
 * Props for the DroppedCommand component.
 */
interface DroppedCommandProps {
  cmd: any;
  index: number;
  moveCommand: (from: number, to: number) => void;
  handleRemove: (key: string) => void;
  values: any;
  setValues: React.Dispatch<React.SetStateAction<any>>;
  commandMap: any;
  addModifier: (targetKey: string, modifierCmd: any) => void;
  removeModifier: (targetKey: string, modifierKey: string) => void;
  handleModifierChange: (
    targetKey: string,
    modKey: string,
    field: string,
    value: string
  ) => void;
  moveModifier: (targetKey: string, from: number, to: number) => void;
  openCidrModal: (
    callback: (value: string) => void,
    initialValue: string
  ) => void;
  openRegexModal: (
    callback: (value: string) => void,
    initialValue: string
  ) => void;
}

/**
 * A component representing a command within the command chain. It is both draggable
 * (for reordering) and a drop target (to accept modifiers).
 */
export const DroppedCommand = React.memo(function DroppedCommand({
  cmd,
  index,
  moveCommand,
  handleRemove,
  values,
  setValues,
  commandMap,
  addModifier,
  removeModifier,
  handleModifierChange,
  moveModifier,
  openCidrModal,
  openRegexModal,
}: DroppedCommandProps) {
  const ref = useRef<HTMLDivElement>(null);

  // `useDrop` hook to make the command a drop target with enhanced error handling.
  // It accepts other dropped commands (for reordering) or new modifiers.
  const [{ isHovering, canDropItem }, drop] = useDrop({
    accept: [ItemTypes.DROPPED, ItemTypes.COMMAND],
    hover(item: any, monitor) {
      if (!ref.current) return;
      // Handle reordering of commands within the chain with error handling
      if (monitor.getItemType() === ItemTypes.DROPPED) {
        const from = item.index;
        if (from === index) return;

        dragDropErrorHandler
          .safeReorderOperation(
            [], // We don't have the full array here, but the operation is handled by moveCommand
            from,
            index,
            () => {
              moveCommand(from, index);
              // Mutate the item's index in-flight to avoid flicker
              item.index = index;
            }
          )
          .catch((error) => {
            console.error("Command reorder failed:", error);
          });
      }
    },
    drop(item: any, monitor) {
      // Handle dropping a new modifier onto the command with error handling
      if (
        monitor.getItemType() === ItemTypes.COMMAND &&
        item.type === "modifier"
      ) {
        dragDropErrorHandler
          .safeDropOperation(
            item,
            { id: cmd.id, key: cmd.key, type: "command" },
            () => addModifier(cmd.key, item)
          )
          .catch((error) => {
            console.error("Modifier drop failed:", error);
          });
      }
    },
    canDrop: (item: any, monitor) => {
      try {
        // Only allow modifiers to be dropped, not regular commands.
        if (monitor.getItemType() === ItemTypes.COMMAND) {
          const validation = dragDropErrorHandler.validateDropTarget(
            { id: cmd.id, key: cmd.key, type: "command" },
            item
          );
          return item.type === "modifier" && validation.isValid;
        }
        return monitor.getItemType() === ItemTypes.DROPPED;
      } catch (error) {
        console.error("Drop validation failed:", error);
        return false;
      }
    },
    collect: (monitor) => ({
      isHovering: monitor.isOver(),
      canDropItem: monitor.canDrop(),
    }),
  });

  // `useDrag` hook to make the command draggable for reordering.
  const [, drag] = useDrag(() => ({
    type: ItemTypes.DROPPED,
    item: { key: cmd.key, index },
  }));

  // Combine the drag and drop refs and attach it to the component's root element.
  drag(drop(ref));

  // Get the command's definition and its current state (parameter values).
  const meta = commandMap[cmd.id];
  const instance = values[cmd.key] || {
    required: {},
    optional: [],
    modifiers: [],
  };
  const isHoveringModifier = isHovering && canDropItem;

  // Get a list of optional parameters already in use to prevent adding duplicates.
  const usedOptionalLabels = instance.optional
    .map((o) => o.label)
    .filter(Boolean);

  // --- Handlers for Parameter Changes ---

  const handleReqChange = (name, val) =>
    setValues((prev) => ({
      ...prev,
      [cmd.key]: {
        ...prev[cmd.key],
        required: { ...prev[cmd.key].required, [name]: val },
      },
    }));

  const addOptional = () =>
    setValues((prev) => ({
      ...prev,
      [cmd.key]: {
        ...prev[cmd.key],
        optional: [
          ...prev[cmd.key].optional,
          { id: Date.now(), name: "", label: "", value: "" },
        ],
      },
    }));

  const removeOptional = (key, idx) =>
    setValues((prev) => {
      const list = [...prev[key].optional];
      list.splice(idx, 1);
      return { ...prev, [key]: { ...prev[key], optional: list } };
    });

  const moveOptional = (key, from, to) =>
    setValues((prev) => {
      const list = [...prev[key].optional];
      const [m] = list.splice(from, 1);
      list.splice(to, 0, m);
      return { ...prev, [key]: { ...prev[key], optional: list } };
    });

  const handleOptChange = (key, idx, field, val) =>
    setValues((prev) => {
      const list = [...prev[key].optional];
      let entry = { ...list[idx], [field]: val };
      // If the name/label of the option is changed, update its metadata from the command definition and clear value.
      if (field === "name") {
        entry.label = val;
        const optMeta = commandMap[cmd.id].options.find((o) => o.label === val);
        if (optMeta) {
          entry = {
            ...entry,
            name: optMeta.name,
            flag: optMeta.flag,
            type: optMeta.type,
            choices: optMeta.choices,
            value: optMeta.type === "checkbox" ? true : "",
            description: optMeta.description, // Carry over description
          };
        } else {
          entry.value = ""; // Also clear value if no match
        }
      }
      list[idx] = entry;
      return { ...prev, [key]: { ...prev[key], optional: list } };
    });

  return (
    <div ref={ref} className="p-4 dark:bg-gray-700 rounded-lg shadow/20 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h4 className={`font-semibold text-lg`}>{cmd.label}</h4>
        </div>
        <div className="flex gap-2 items-center">
          {/* Button to add an optional parameter */}
          {meta.options.some((o) => !o.required) && (
            <button
              onClick={addOptional}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-blue-500 hover:text-white transition active:bg-blue-400 active:inset-shadow-sm dark:hover:bg-blue-600 dark:active:bg-blue-500 dark:text-gray-400 dark:hover:text-white duration-500"
              aria-label="Add optional parameter"
            >
              <Plus size={16} />
            </button>
          )}
          {/* Button to remove the entire command */}
          <button
            onClick={() => handleRemove(cmd.key)}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 active:bg-red-400 active:inset-shadow-sm dark:active:bg-red-500 transition dark:text-gray-400 dark:hover:text-white duration-500"
            aria-label="Remove command"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Render inputs for required parameters */}
      {meta.options
        .filter((o) => o.required)
        .map((opt) => (
          <div key={opt.name} className="mb-2 flex items-center gap-2">
            <label
              className="block mb-1 min-w-[100px] flex-shrink-0"
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
              {opt.type === "select" ? (
                <div className="relative">
                  <select
                    value={instance.required[opt.name] || ""}
                    onChange={(e) => handleReqChange(opt.name, e.target.value)}
                    className={`peer appearance-none block w-full px-3 py-2 border-2 transition-all duration-300 ${
                      instance.required[opt.name]
                        ? "border-solid"
                        : "border-dashed"
                    } border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 focus:outline-none`}
                  >
                    <option value="">Select {opt.label}</option>
                    {(opt.choices || []).map((choice) => {
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
              ) : (
                <input
                  type="text"
                  value={instance.required[opt.name] || ""}
                  onChange={(e) => handleReqChange(opt.name, e.target.value)}
                  className={`w-full p-2 border-2 transition-all duration-300 ${
                    instance.required[opt.name]
                      ? "border-solid"
                      : "border-dashed"
                  } border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none bg-gray-100 dark:bg-gray-800 ${
                    opt.name === "target" || opt.type === "regex" ? "pr-10" : ""
                  }`}
                />
              )}
              {/* Add CIDR calculator button for "target" inputs */}
              {opt.name === "target" && (
                <button
                  onClick={() =>
                    openCidrModal(
                      (value) => handleReqChange(opt.name, value),
                      instance.required[opt.name] || ""
                    )
                  }
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-500"
                  aria-label="Open CIDR Calculator"
                >
                  <Network strokeWidth={1.75} size={18} />
                </button>
              )}
              {/* Add Regex builder button for "regex" type inputs */}
              {opt.type === "regex" && (
                <button
                  onClick={() =>
                    openRegexModal(
                      (value) => handleReqChange(opt.name, value),
                      instance.required[opt.name] || ""
                    )
                  }
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-500"
                  aria-label="Open Regex Builder"
                >
                  <Regex strokeWidth={1.75} size={18} />
                </button>
              )}
            </div>
          </div>
        ))}

      {/* Render rows for optional parameters */}

      {instance.optional.map((opt, idx) => (
        <div className="">
          <OptionalRow
            key={opt.id || idx}
            cmdKey={cmd.key}
            opt={opt}
            idx={idx}
            meta={meta}
            usedOptionalLabels={usedOptionalLabels}
            handleOptChange={handleOptChange}
            removeOptional={removeOptional}
            moveOptional={moveOptional}
            openRegexModal={openRegexModal}
          />
        </div>
      ))}

      {/* Render attached modifiers */}

      {instance.modifiers?.length > 0 && (
        <div className="pl-6 mt-4 relative">
          {/* // This div creates the vertical line connecting the modifiers. */}
          <div className="absolute top-0 left-[11px] w-0.5 h-full bg-gray-300 dark:bg-gray-600"></div>
          <div className="space-y-3">
            {instance.modifiers?.map((mod, modIndex) => (
              <DroppedModifier
                key={mod.key}
                mod={mod}
                cmdKey={cmd.key}
                commandMap={commandMap}
                handleModifierChange={handleModifierChange}
                removeModifier={removeModifier}
                openRegexModal={openRegexModal}
                index={modIndex}
                moveModifier={(from, to) => moveModifier(cmd.key, from, to)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Display a drop placeholder when a valid modifier is being hovered over */}
      {isHoveringModifier && (
        <div className="mt-2 p-4 text-center border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 dark:bg-blue-900/40 dark:border-blue-700/70 text-blue-500 dark:text-blue-300/70 text-md select-none transition-opacity duration-300 opacity-100 animate-fadein">
          Append command
        </div>
      )}
    </div>
  );
});
