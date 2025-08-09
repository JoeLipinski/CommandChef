/**
 * @file CommandManagerModal.tsx
 * @description A modal for managing the entire command library. It allows users to
 * create, edit, delete, import, and export commands.
 */

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  X,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Loader,
  Upload,
  Download,
  AlertTriangle,
} from "lucide-react";
import { CommandForm } from "./CommandForm";
import { useDebounce } from "./hooks/useDebounce";

// A template for creating a new, empty command object.
const NEW_COMMAND_TEMPLATE = {
  id: "",
  category: "",
  label: "",
  template: "",
  docsUrl: "",
  type: "command",
  options: [],
  variants: [],
};

/**
 * Props for the CommandManagerModal component.
 * @property isOpen - Whether the modal is currently visible.
 * @property onClose - Callback to close the modal.
 * @property commands - The current array of all command definitions.
 * @property setCommands - Callback to update the application's command library.
 */
interface CommandManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: any[];
  setCommands: (commands: any[]) => void;
}

/**
 * The Command Library Manager modal component.
 */
export function CommandManagerModal({
  isOpen,
  onClose,
  commands,
  setCommands,
}: CommandManagerModalProps) {
  /** State to hold the command currently being edited. Null if not in edit mode. */
  const [editingCommand, setEditingCommand] = useState(null);
  /** State to indicate if the user is creating a new command. */
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  /** State for the search query. */
  const [searchQuery, setSearchQuery] = useState("");

  /** Debounced search query to reduce expensive filtering operations */
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  /** Ref for the hidden file input element used for importing. */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** State to track which command ID is pending deletion confirmation. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  /** Ref to hold the timeout for the delete confirmation, allowing it to be cleared. */
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Cancels any pending delete confirmation by clearing the timeout and resetting state.
   */
  const cancelDelete = () => {
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
    }
    setConfirmDeleteId(null);
  };

  /**
   * Effect to clean up on modal close or unmount.
   * Ensures any pending delete confirmation is cancelled to prevent orphaned state.
   */
  useEffect(() => {
    if (!isOpen) {
      cancelDelete();
    }
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, [isOpen]);

  /** Memoized list of all unique category names for use in the command form. */
  const allCategories = useMemo(
    () => [...new Set(commands.map((c) => c.category))].sort(),
    [commands]
  );

  /** Memoized object grouping commands by category for display, filtered by search. */
  const commandsByCategory = useMemo(() => {
    // If no search, return all as before
    if (!debouncedSearchQuery.trim()) {
      return commands.reduce((acc, cmd) => {
        const category = cmd.category || "Uncategorized";
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(cmd);
        return acc;
      }, {});
    }
    // Lowercase search for case-insensitive match
    const q = debouncedSearchQuery.trim().toLowerCase();
    // Filter commands by label, category, or keywords
    const filtered = commands.filter(
      (cmd) =>
        (cmd.label && cmd.label.toLowerCase().includes(q)) ||
        (cmd.category && cmd.category.toLowerCase().includes(q)) ||
        (Array.isArray(cmd.keywords) &&
          cmd.keywords.some((kw) => kw.toLowerCase().includes(q)))
    );
    // Group filtered commands by category
    return filtered.reduce((acc, cmd) => {
      const category = cmd.category || "Uncategorized";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(cmd);
      return acc;
    }, {});
  }, [commands, debouncedSearchQuery]);

  /** Handles closing the modal, resetting edit/create state and any pending delete. */
  const handleClose = () => {
    cancelDelete();
    setEditingCommand(null);
    setIsCreatingNew(false);
    onClose();
  };

  /**
   * Saves a command (either new or edited) to the main command list.
   * @param commandToSave - The command object from the CommandForm.
   */
  const handleSave = (commandToSave: any) => {
    cancelDelete();
    let newCommands;
    if (isCreatingNew) {
      // Add a new command, ensuring it has a unique ID.
      newCommands = [
        ...commands,
        { ...commandToSave, id: commandToSave.id || `custom-${Date.now()}` },
      ];
    } else {
      // Update an existing command.
      newCommands = commands.map((c) =>
        c.id === commandToSave.id ? commandToSave : c
      );
    }
    setCommands(newCommands);
    setEditingCommand(null);
    setIsCreatingNew(false);
  };

  /**
   * Initiates the two-step delete process for a command.
   * @param commandId - The ID of the command to delete.
   */
  const requestDelete = (commandId: string) => {
    cancelDelete(); // Cancel any other pending delete first.
    setConfirmDeleteId(commandId);
    // Set a timeout to automatically cancel the confirmation.
    confirmTimeoutRef.current = setTimeout(() => {
      setConfirmDeleteId(null);
    }, 3000);
  };

  /**
   * Confirms and executes the deletion of a command.
   * @param commandId - The ID of the command to delete.
   */
  const handleDelete = (commandId: string) => {
    const newCommands = commands.filter((c) => c.id !== commandId);
    setCommands(newCommands);
    cancelDelete(); // Reset confirmation state.
  };

  /**
   * Exports the entire command library to a JSON file for backup or sharing.
   */
  const handleExport = () => {
    cancelDelete();
    try {
      const dataStr = JSON.stringify(commands, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "command-library.json";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export commands:", error);
      alert("An error occurred while exporting the command library.");
    }
  };

  /**
   * Handles the file input change event for importing a command library.
   * @param e - The file input change event.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedCommands = JSON.parse(event.target.result as string);
        if (!Array.isArray(importedCommands)) {
          throw new Error("Imported file is not a valid command array.");
        }
        if (
          window.confirm(
            "Are you sure you want to overwrite your current command library? This action cannot be undone."
          )
        ) {
          setCommands(importedCommands);
        }
      } catch (err) {
        console.error("Failed to import commands:", err);
        alert("Error: Invalid or corrupted command library file.");
      } finally {
        // Reset the file input so the same file can be selected again.
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  // Determine if the form should be shown instead of the main list view.
  const showForm = isCreatingNew || editingCommand;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">
            {showForm
              ? isCreatingNew
                ? "New Command"
                : "Edit Command"
              : "Command Library"}
          </h2>
          <button
            onClick={handleClose}
            className="p-1 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 active:bg-red-400 active:inset-shadow-sm dark:active:bg-red-500 transition dark:text-gray-400 dark:hover:text-white duration-500"
          >
            <X size={16} />
          </button>
        </div>

        {showForm ? (
          // Render the form for creating/editing a command
          <CommandForm
            initialCommand={
              isCreatingNew ? NEW_COMMAND_TEMPLATE : editingCommand
            }
            onSave={handleSave}
            onCancel={() => {
              cancelDelete(); // Ensure delete is cancelled when switching views
              setIsCreatingNew(false);
              setEditingCommand(null);
            }}
            allCategories={allCategories}
          />
        ) : (
          // Render the main manager view
          <>
            {/* Main Command List View */}
            <div className="p-4 flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                {/* Search Bar (left aligned) */}
                <div className="flex-1 flex items-center relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Commands"
                    className="w-full p-2 rounded-lg appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pr-8"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
                      aria-label="Clear search"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {/* Buttons (right aligned) */}
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                  <button
                    onClick={() => {
                      cancelDelete();
                      setIsCreatingNew(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition duration-500"
                  >
                    New
                  </button>
                  <button
                    onClick={() => {
                      cancelDelete();
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-gray-500 hover:text-white transition active:bg-gray-400 active:inset-shadow-sm dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
                  >
                    Import
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-gray-500 hover:text-white transition active:bg-gray-400 active:inset-shadow-sm dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
                  >
                    Export
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {searchQuery.trim() &&
                searchQuery.trim() !== debouncedSearchQuery.trim() ? (
                  // Show searching indicator while debouncing
                  <div className="flex items-center justify-center mt-8">
                    <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span>Searching...</span>
                    </div>
                  </div>
                ) : Object.keys(commandsByCategory).length > 0 ? (
                  Object.keys(commandsByCategory)
                    .sort()
                    .map((category) => (
                      <div key={category}>
                        <h3 className="text-lg font-bold mb-2 bg-white dark:bg-gray-800 py-1">
                          {category}
                        </h3>
                        <div className="space-y-2">
                          {commandsByCategory[category].map((cmd) => (
                            <div
                              key={cmd.id}
                              className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                            >
                              <span>{cmd.label}</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    cancelDelete();
                                    setEditingCommand(cmd);
                                  }}
                                  className="p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-gray-500 hover:text-white transition active:bg-gray-400 active:inset-shadow-sm dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
                                  aria-label="Edit Command"
                                >
                                  <Edit size={16} />
                                </button>
                                {/* Two-step delete button */}
                                {confirmDeleteId === cmd.id ? (
                                  <button
                                    onClick={() => handleDelete(cmd.id)}
                                    className="px-3 py-1 bg-red-600 text-white rounded-lg flex items-center gap-1.5 animate-pulse text-sm"
                                    aria-label="Confirm Delete Command"
                                  >
                                    <AlertTriangle size={16} /> Confirm
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => requestDelete(cmd.id)}
                                    className="p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-red-500 hover:text-white transition active:bg-red-400 active:inset-shadow-sm dark:hover:bg-red-600 dark:active:bg-red-500 dark:text-gray-400 dark:hover:text-white duration-500"
                                    aria-label="Delete Command"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                ) : debouncedSearchQuery.trim() ? (
                  // Show no results found only when there's a search query
                  <div className="text-center mt-8">
                    <p className="text-gray-500 dark:text-gray-400 text-lg">
                      No Results Found
                    </p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                      Try adjusting your search terms
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
