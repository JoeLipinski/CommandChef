/**
 * @file constants.ts
 * @description Defines constants used throughout the application, particularly for react-dnd item types.
 * This helps ensure consistency and prevents typos when defining draggable items and droppable areas.
 */

export const ItemTypes = {
  // Represents a command being dragged from the library.
  COMMAND: "COMMAND",
  // Represents a command that has already been dropped into the chain and is being reordered.
  DROPPED: "DROPPED",
  // Represents an optional parameter row within a dropped command, for reordering.
  OPTIONAL: "OPTIONAL",
  // Represents an optional parameter row within a modifier, for reordering.
  MODIFIER_OPTIONAL: "MODIFIER_OPTIONAL",
  // Represents a modifier being dragged for reordering within a command.
  MODIFIER: "MODIFIER",
};