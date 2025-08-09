/**
 * @file DraggableCommand.tsx
 * @description A component that makes a command or command variant draggable.
 * It uses react-dnd's useDrag hook to provide drag-and-drop functionality.
 */

import React from "react";
import { useDrag } from "react-dnd";
import { Info, ExternalLink } from "lucide-react";
import { ItemTypes } from "./constants";

/**
 * Props for the DraggableCommand component.
 * @property command - The base command object.
 * @property variant - An optional variant object. If provided, the component represents a command variant.
 */
interface DraggableCommandProps {
  command: any;
  variant?: any;
}

/**
 * A draggable UI element representing a command or a command variant.
 * It can be dragged from the command library and dropped into the main chain area.
 */
export const DraggableCommand = React.memo(function DraggableCommand({
  command,
  variant,
}: DraggableCommandProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    // The type of item being dragged, used by drop targets to accept or reject it.
    type: ItemTypes.COMMAND,
    // The data payload associated with the dragged item.
    // It includes the base command and the specific variant, if any.
    item: { ...command, variant },
    // A function to collect status information from the drag-and-drop system.
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  // Determine the label and description to display.
  const label = variant ? variant.label : command.label;
  const description = variant ? variant.description : command.description;
  const isVariant = !!variant;

  return (
    <div
      ref={drag as any}
      className={`transition flex justify-between items-center ${
        isDragging ? "opacity-50" : "opacity-100"
      } ${
        isVariant
          ? "hover:bg-gray-100 dark:hover:bg-gray-900 transition-all px-14 py-2"
          : "p-2"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={
            description
              ? " border-dotted border-b-2 border-gray-400 dark:border-gray-500"
              : ""
          }
          title={description}
        >
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {/* Modifier badge on the right */}
        {command.type === "modifier" && !isVariant && (
          <span
            className="inline-flex items-center gap-x-1.5 py-1.5 px-3 rounded-full text-xs font-medium bg-blue-100 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400/80"
            title="Modifier"
          >
            Modifier
          </span>
        )}
        {!isVariant && command.docsUrl && (
          <a
            href={command.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 flex-shrink-0 group w-6 h-6 rounded-full hover:bg-blue-500 
            transition active:bg-blue-400 active:inset-shadow-sm
            dark:hover:bg-blue-600 dark:active:bg-blue-500 text-gray-500 hover:text-white dark:hover:text-white  dark:text-gray-400"
            aria-label={`Documentation for ${command.label}`}
          >
            <span className="relative inline-block h-8 w-8 p-2">
              <Info
                size={16}
                className="absolute inset-0 transition-opacity duration-200 opacity-100 group-hover:opacity-0"
              />
              <ExternalLink
                size={14}
                className="absolute inset-0 transition-opacity duration-200 opacity-0 group-hover:opacity-100 left-0.5 pt-0.5"
              />
            </span>
          </a>
        )}
      </div>
    </div>
  );
});
