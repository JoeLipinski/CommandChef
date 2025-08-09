/**
 * @file ChainManagerModal.tsx
 * @description A modal for managing saved command chains. It allows users to
 * save the current chain, load saved chains, delete them, rename them, and
 * export/import them as files or shareable links.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Trash2,
  Download,
  Link as LinkIcon,
  Check,
  Edit,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useFocusTrap, useScreenReader } from "./hooks/useAccessibility";
import { KEYBOARD_KEYS } from "./utils/accessibility";
import { AccessibleTooltip } from "./AccessibleTooltip";

/**
 * Props for the ChainManagerModal component.
 */
interface ChainManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChain: any;
  savedChains: Record<string, any>;
  onSaveChain: (
    name: string,
    chain: any,
    overwrite?: boolean
  ) => { success: boolean; exists: boolean };
  onLoadChain: (chain: any, recipeName?: string) => void;
  onDeleteChain: (name: string) => void;
  onRenameChain: (oldName: string, newName: string) => void;
  currentRecipeState: {
    name: string | null;
    isModified: boolean;
    originalChain: any | null;
  };
}

/**
 * The Chain Manager modal component.
 */
export function ChainManagerModal({
  isOpen,
  onClose,
  currentChain,
  savedChains,
  onSaveChain,
  onLoadChain,
  onDeleteChain,
  onRenameChain,
  currentRecipeState,
}: ChainManagerModalProps) {
  // Accessibility hooks
  const containerRef = useFocusTrap(isOpen);
  const { announce } = useScreenReader();
  /** State for the name of the new chain to be saved. */
  const [saveName, setSaveName] = useState("");
  /** State to provide feedback when the shareable link is copied. */
  const [linkCopied, setLinkCopied] = useState(false);
  /** Ref for the hidden file input used for importing chains. */
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** State to track which chain is currently being renamed. */
  const [renamingName, setRenamingName] = useState<string | null>(null);
  /** State for the new name input while renaming. */
  const [newName, setNewName] = useState("");

  /** State for handling save conflicts */
  const [saveConflict, setSaveConflict] = useState<{
    show: boolean;
    name: string;
    chain: any;
  }>({ show: false, name: "", chain: null });

  /** State for showing name required modal */
  const [showNameRequired, setShowNameRequired] = useState(false);

  /** State for import functionality */
  const [importState, setImportState] = useState<{
    show: boolean;
    chain: any;
    suggestedName: string;
  }>({ show: false, chain: null, suggestedName: "" });

  /** State to track which chain name is pending deletion confirmation. */
  const [confirmDeleteName, setConfirmDeleteName] = useState<string | null>(
    null
  );
  /** Ref to hold the timeout for the delete confirmation. */
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Cancels any pending delete confirmation.
   */
  const cancelDelete = () => {
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }
    setConfirmDeleteName(null);
  };

  /**
   * Effect to cancel any pending delete confirmation when the modal is closed.
   */
  useEffect(() => {
    if (!isOpen) {
      cancelDelete();
    }
    // Cleanup timeout on unmount.
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, [isOpen]);

  /**
   * Initiates the two-step delete process for a saved chain.
   * @param name - The name of the chain to delete.
   */
  const requestDelete = (name: string) => {
    cancelDelete(); // Cancel any other pending delete.
    setConfirmDeleteName(name);
    // Automatically cancel after 3 seconds.
    confirmTimeoutRef.current = setTimeout(() => {
      cancelDelete();
    }, 3000);
  };

  /**
   * Confirms and executes the deletion of a chain.
   * @param name - The name of the chain to delete.
   */
  const handleConfirmDelete = (name: string) => {
    onDeleteChain(name);
    cancelDelete();
  };

  /**
   * Handles saving the current command chain to the library.
   */
  const handleSave = () => {
    cancelDelete();
    if (!saveName.trim()) {
      setShowNameRequired(true);
      return;
    }

    const result = onSaveChain(saveName, currentChain);

    if (!result.success && result.exists) {
      // Show conflict dialog
      setSaveConflict({
        show: true,
        name: saveName,
        chain: currentChain,
      });
    } else {
      // Success - clear the input field
      setSaveName("");
    }
  };

  /**
   * Handles saving with overwrite confirmation.
   */
  const handleSaveOverwrite = () => {
    onSaveChain(saveConflict.name, saveConflict.chain, true);
    setSaveConflict({ show: false, name: "", chain: null });
    setSaveName("");
  };

  /**
   * Cancels the save conflict dialog.
   */
  const handleCancelSaveConflict = () => {
    setSaveConflict({ show: false, name: "", chain: null });
  };

  /**
   * Generates a shareable URL for the current chain and copies it to the clipboard.
   */
  const handleCopyLink = () => {
    cancelDelete();
    const data = JSON.stringify(currentChain);
    const base64 = btoa(data); // Encode data in Base64
    const url = `${window.location.origin}${
      window.location.pathname
    }?chain=${encodeURIComponent(base64)}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000); // Reset after 2 seconds
    });
  };

  /**
   * Downloads the current command chain as a JSON file.
   */
  const handleDownload = () => {
    cancelDelete();
    const dataStr = JSON.stringify(currentChain, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "command-chain.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  /**
   * Handles the file input change event for importing a chain from a JSON file.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        if (!event.target?.result) return;
        const chain = JSON.parse(event.target.result as string);
        // Basic validation of the imported file structure.
        if (!chain.dropped || !chain.values) {
          throw new Error("Invalid chain file structure.");
        }

        // Use filename without extension as suggested name
        const suggestedName = file.name.replace(/\.[^/.]+$/, "");

        setImportState({
          show: true,
          chain: chain,
          suggestedName: suggestedName,
        });
      } catch (err) {
        alert("Error: Invalid or corrupted chain file.");
        console.error(err);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      }
    };
    reader.readAsText(file);
  };

  /**
   * Handles confirming the import with the chosen name.
   */
  const handleConfirmImport = () => {
    if (!importState.suggestedName.trim()) {
      return;
    }

    const result = onSaveChain(importState.suggestedName, importState.chain);

    if (!result.success && result.exists) {
      // Show import conflict for overwrite confirmation
      setSaveConflict({
        show: true,
        name: importState.suggestedName,
        chain: importState.chain,
      });
      setImportState({ show: false, chain: null, suggestedName: "" });
    } else {
      // Success
      setImportState({ show: false, chain: null, suggestedName: "" });
    }
  };

  /**
   * Cancels the import process.
   */
  const handleCancelImport = () => {
    setImportState({ show: false, chain: null, suggestedName: "" });
  };

  /**
   * Enters renaming mode for a specific chain.
   * @param name - The current name of the chain.
   */
  const handleStartRename = (name: string) => {
    cancelDelete();
    setRenamingName(name);
    setNewName(name);
  };

  /** Cancels the renaming process. */
  const handleCancelRename = () => {
    setRenamingName(null);
    setNewName("");
  };

  /** Confirms the new name for a chain. */
  const handleConfirmRename = () => {
    onRenameChain(renamingName!, newName);
    handleCancelRename();
  };

  /**
   * Updates a recipe with the current command chain.
   * @param name - The name of the recipe to update.
   */
  const handleUpdateRecipe = (name: string) => {
    cancelDelete();
    onSaveChain(name, currentChain, true);
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === KEYBOARD_KEYS.ESCAPE) {
      onClose();
      announce("Recipe library closed");
    }
  };

  // Announce modal state changes
  useEffect(() => {
    if (isOpen) {
      announce("Recipe library opened");
    }
  }, [isOpen, announce]);

  if (!isOpen) return null;

  const savedChainNames = Object.keys(savedChains);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={containerRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[70vh] flex flex-col relative"
        role="document"
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Recipe Library</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 active:bg-red-400 active:inset-shadow-sm dark:active:bg-red-500 transition dark:text-gray-400 dark:hover:text-white duration-500"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col p-4 overflow-hidden">
          <div className="flex flex-row items-end gap-6">
            <div className="flex flex-col flex-1 p-2 justify-end">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-medium text-sm">Save New Recipe</h3>
              </div>
              <div className="flex flex-row items-end gap-2 w-full">
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Recipe name"
                  className="flex-grow min-w-0 p-2 border-2 h-10 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none dark:bg-gray-700"
                />
                <button
                  onClick={handleSave}
                  disabled={
                    !currentChain.dropped ||
                    currentChain.dropped.length === 0 ||
                    !saveName.trim()
                  }
                  className={`flex items-center gap-2 h-10 px-6 py-2 rounded-lg transition duration-500 ${
                    !currentChain.dropped ||
                    currentChain.dropped.length === 0 ||
                    !saveName.trim()
                      ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  Save
                </button>
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
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center justify-center h-10 gap-2 px-4 py-3 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-gray-500 hover:text-white transition active:bg-gray-400 active:inset-shadow-sm dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
          <h3 className="font-semibold p-2 border-b border-gray-200 dark:border-gray-700">
            Saved Recipes
          </h3>
          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {savedChainNames.length > 0 ? (
              savedChainNames.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  {renamingName === name ? (
                    // View for when a chain is being renamed
                    <>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleConfirmRename();
                        }}
                        className="flex-1 p-1 border-2 outline-none border-gray-300 dark:border-gray-600 bg-gray-100 rounded-md dark:bg-gray-800"
                        autoFocus
                      />

                      <div className="flex items-center gap-2 pl-4 pr-2">
                        <button
                          onClick={handleConfirmRename}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-green-500 hover:text-white transition active:bg-green-400 active:inset-shadow-sm dark:hover:bg-green-600 dark:active:bg-green-500 dark:text-gray-400 dark:hover:text-white duration-500"
                          aria-label="Save changes"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-red-500 hover:text-white transition active:bg-red-400 active:inset-shadow-sm dark:hover:bg-red-600 dark:active:bg-red-500 dark:text-gray-400 dark:hover:text-white duration-500"
                          aria-label="Discard changes"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    // Default view for a saved chain
                    <>
                      <span className="font-medium truncate pr-2">{name}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Show Update button for current recipe, View button for others */}
                        {currentRecipeState.name === name ? (
                          <button
                            onClick={() => handleUpdateRecipe(name)}
                            disabled={!currentRecipeState.isModified}
                            className={`px-3 py-2 mr-2 flex items-center justify-center rounded-lg text-sm font-medium transition active:inset-shadow-sm duration-500 ${
                              currentRecipeState.isModified
                                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed opacity-50"
                            }`}
                            aria-label="Update Recipe"
                          >
                            Update
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              cancelDelete();
                              onLoadChain(savedChains[name], name);
                            }}
                            className="px-3 mr-2 py-2 flex items-center justify-center rounded-lg text-sm font-medium transition active:inset-shadow-sm duration-500 bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-blue-700 hover:text-white dark:text-gray-400 dark:hover:text-white"
                          >
                            View
                          </button>
                        )}
                        <button
                          onClick={() => handleStartRename(name)}
                          className="p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-gray-500 hover:text-white transition active:bg-gray-400 active:inset-shadow-sm dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
                          aria-label="Rename Chain"
                        >
                          <Edit size={16} />
                        </button>
                        {/* Share button for this recipe with check icon feedback */}
                        <RecipeShareButton
                          chain={savedChains[name]}
                          cancelDelete={cancelDelete}
                        />
                        {/* Download button for this recipe */}
                        <button
                          onClick={() => {
                            cancelDelete();
                            const dataStr = JSON.stringify(
                              savedChains[name],
                              null,
                              2
                            );
                            const blob = new Blob([dataStr], {
                              type: "application/json",
                            });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `${name}.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          className="p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-gray-500 hover:text-white transition active:bg-gray-400 active:inset-shadow-sm dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
                          aria-label="Download Chain"
                        >
                          <Download size={16} />
                        </button>
                        {/* Two-step delete button */}
                        {confirmDeleteName === name ? (
                          <button
                            onClick={() => handleConfirmDelete(name)}
                            className="px-2 py-1 bg-red-600 text-white rounded-lg flex items-center gap-1.5 animate-pulse text-sm"
                            aria-label="Confirm Delete Chain"
                          >
                            <AlertTriangle size={14} /> Confirm
                          </button>
                        ) : (
                          <button
                            onClick={() => requestDelete(name)}
                            className="p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-red-500 hover:text-white transition active:bg-red-400 active:inset-shadow-sm dark:hover:bg-red-600 dark:active:bg-red-500 dark:text-gray-400 dark:hover:text-white duration-500"
                            aria-label="Delete Chain"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                No saved recipes
              </div>
            )}
          </div>
        </div>

        {/* Save Conflict Dialog */}
        {saveConflict.show && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">
                Recipe Already Exists
              </h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                A recipe named "{saveConflict.name}" already exists. Do you want
                to overwrite it?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelSaveConflict}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOverwrite}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 duration-500 rounded-lg transition"
                >
                  Overwrite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Name Required Dialog */}
        {showNameRequired && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">
                Name Required
              </h3>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Please enter a name for the chain
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowNameRequired(false)}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 duration-500 rounded-lg transition"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import Dialog */}
        {importState.show && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Import Recipe</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Recipe Name:
                </label>
                <input
                  type="text"
                  value={importState.suggestedName}
                  onChange={(e) =>
                    setImportState((prev) => ({
                      ...prev,
                      suggestedName: e.target.value,
                    }))
                  }
                  className="w-full p-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none dark:bg-gray-700"
                  placeholder="Enter recipe name"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCancelImport}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition"
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Share button with checkmark feedback for each recipe (must be outside render loop)
export function RecipeShareButton({
  chain,
  cancelDelete,
}: {
  chain: any;
  cancelDelete: () => void;
}) {
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState("");
  const handleShare = async () => {
    cancelDelete();
    setError("");
    try {
      const data = JSON.stringify(chain);
      const base64 = btoa(data);
      const url = `${window.location.origin}${
        window.location.pathname
      }?chain=${encodeURIComponent(base64)}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError("Failed to copy link. Please copy manually.");
    }
  };
  return (
    <>
      <button
        onClick={handleShare}
        className="p-2 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:bg-gray-500 hover:text-white transition active:bg-gray-400 active:inset-shadow-sm dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-gray-400 dark:hover:text-white duration-500"
        aria-label="Share Chain"
        type="button"
      >
        {copied ? <Check size={16} /> : <LinkIcon size={16} />}
      </button>
      {error && <span className="ml-2 text-xs text-red-500">{error}</span>}
    </>
  );
}
