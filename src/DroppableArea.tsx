/**
 * @file DroppableArea.tsx
 * @description Defines the main drop zone for building the command chain.
 * It accepts draggable commands and displays a placeholder when empty.
 */

import React from "react";
import { useDrop } from "react-dnd";
import { ItemTypes } from "./constants";
import { KEYBOARD_KEYS } from "./utils/accessibility";

/**
 * Props for the DroppableArea component.
 * @property onDrop - Callback function executed when a valid item is dropped.
 * @property children - The child elements (the dropped commands) to render inside the area.
 * @property showPlaceholder - A boolean to control the visibility of the "Drag Commands Here" placeholder.
 */
interface DroppableAreaProps {
  onDrop: (item: any) => void;
  children: React.ReactNode;
  showPlaceholder: boolean;
}

/**
 * A droppable area that serves as the container for the command chain.
 * It uses react-dnd's useDrop hook to handle drop events.
 */
export const DroppableArea = React.memo(function DroppableArea({
  onDrop,
  children,
  showPlaceholder,
}: DroppableAreaProps) {
  const [{ isOver, canDrop }, drop] = useDrop({
    // Specifies that this drop target accepts items of type COMMAND.
    accept: ItemTypes.COMMAND,
    // The callback to execute when an item is dropped.
    drop: onDrop,
    // A function to determine if a drop is allowed.
    // This prevents modifiers from being dropped directly into the main area.
    canDrop: (item: any) => !item.type || item.type !== "modifier",
    // Collects state from the DND system, like whether an item is hovering over the target.
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const hasChildren = React.Children.count(children) > 0 && !showPlaceholder;

  // Dynamic classes for visual feedback (e.g., solid/dashed border, hover effects).
  const borderStyle = hasChildren
    ? "outline-solid"
    : isOver && canDrop
    ? "outline-solid outline-blue-500"
    : "outline-dashed";

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Allow keyboard users to interact with the drop area
    if (
      event.key === KEYBOARD_KEYS.ENTER ||
      event.key === KEYBOARD_KEYS.SPACE
    ) {
      event.preventDefault();
      // Focus could be used to trigger command selection modal in the future
    }
  };

  return (
    <div
      ref={drop as any}
      className={`relative flex-1 p-4 outline rounded-lg bg-white dark:bg-gray-800 overflow-auto transition-all duration-300 outline-gray-300 dark:outline-gray-600 inset-shadow-sm ${borderStyle} ${
        isOver && canDrop ? "drop-target" : ""
      }`}
      role="region"
      aria-label="Command chain builder"
      aria-describedby="drop-area-description"
      tabIndex={hasChildren ? -1 : 0}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden description for screen readers */}
      <div id="drop-area-description" className="sr-only">
        Drop zone for building command chains. Drag commands from the library to
        add them here.
        {hasChildren &&
          ` Currently contains ${React.Children.count(children)} command${
            React.Children.count(children) === 1 ? "" : "s"
          }.`}
      </div>

      {/* Show placeholder text only when the area is empty. */}
      {showPlaceholder && !isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p
            className="text-gray-500 dark:text-gray-400 text-2xl"
            aria-hidden="true"
          >
            Drag Commands Here
          </p>
        </div>
      )}

      {/* Render dropped commands */}
      <div role="list" aria-label="Command chain">
        {children}
      </div>

      {/* Show drop target when dragging a command over the area, below the dropped commands */}
      {isOver && canDrop && (
        <div
          className="flex items-center justify-center mt-4 pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="p-4 text-center border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700/50 text-blue-500 dark:text-blue-300/70 text-md select-none transition-opacity duration-300 opacity-100 animate-fadein">
            Drop Command
          </div>
        </div>
      )}
    </div>
  );
});
