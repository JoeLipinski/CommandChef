/**
 * @file index.tsx
 * @description The main entry point and root component for the Cyber Command Chef application.
 * This file orchestrates the entire application state, including command management,
 * drag-and-drop functionality, theme handling, and modal interactions.
 */

import React, { useState, useCallback, useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Sun,
  Moon,
  SunMoon,
  Network,
  X,
  Settings,
  RefreshCw,
  Share2,
  ChevronDown,
  Clipboard,
  ClipboardCheck,
} from "lucide-react";

import { defaultCommands } from "./defaultCommands";
import { useCommandMap } from "./useCommandMap";
import { processTemplate } from "./utils";
import { useDebounce } from "./hooks/useDebounce";
import { usePerformanceMonitor } from "./hooks/usePerformanceMonitor";
import { MemoryManager } from "./utils/memoryManager";

import { CommandEntry } from "./CommandEntry";
import { DroppableArea } from "./DroppableArea";
import { DroppedCommand } from "./DroppedCommand";
import { CidrModal } from "./CidrModal";
import { RegexModal } from "./RegexModal";
import { CommandManagerModal } from "./CommandManagerModal";
import { ChainManagerModal } from "./ChainManagerModal";
import { ErrorBoundary } from "./ErrorBoundary";
import { NotificationSystem } from "./NotificationSystem";
import { AccessibleTooltip } from "./AccessibleTooltip";
import { SkipLinks } from "./components/SkipLinks";
import {
  storage,
  loadCommands,
  saveCommands,
  loadChains,
  saveChains,
} from "./utils/storage";
import { errorHandler } from "./utils/errorHandler";
import {
  useScreenReader,
  useKeyboardShortcuts,
  useMotionPreferences,
  useHighContrast,
  useLiveRegion,
} from "./hooks/useAccessibility";
import { ScreenReaderUtils } from "./utils/accessibility";
import "./style.css";

// --- Type Definitions ---

/**
 * Represents a command that has been dropped into the main area.
 * It extends the base command definition with a unique key for React rendering.
 */
type DroppedCommandType = (typeof defaultCommands)[0] & { key: string };

/**
 * Defines the structure for the state of a single dropped command, including
 * its required parameters, selected optional flags, and any attached modifiers.
 */
type CommandValue = {
  required: Record<string, string>;
  optional: {
    id: number;
    name: string;
    label: string;
    value: string | boolean;
    type?: string;
    flag?: string;
    choices?: string[];
  }[];
  modifiers: {
    key: string;
    id: string;
    required: Record<string, string>;
    parameters: any[];
  }[];
};

/**
 * A map where keys are the unique keys of dropped commands and values are their corresponding state.
 */
type CommandValuesMap = Record<string, CommandValue>;

// --- Main App Component ---

/**
 * The root component of the Cyber Command Chef application.
 * Manages all application state and renders the main UI layout.
 */
export default function App() {
  // --- State Management ---

  /** State for the library of all available commands (user-managed or default). */
  const [managedCommands, setManagedCommands] =
    useState<typeof defaultCommands>(defaultCommands);

  /** State for the list of commands currently in the command chain (the "dropped" area). */
  const [dropped, setDropped] = useState<DroppedCommandType[]>([]);

  /** State for the values (parameters, options) of each command in the chain. */
  const [values, setValues] = useState<CommandValuesMap>({});

  /** State for the current color theme ('light', 'dark', or 'system'). */
  const [themeMode, setThemeMode] = useState("system");

  /** State for the current text in the command search input. */
  const [searchTerm, setSearchTerm] = useState("");

  /** Debounced search term to reduce expensive filtering operations */
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  /** State for the global target IP/host, applied to all relevant commands. */
  const [globalTarget, setGlobalTarget] = useState("");

  /** Performance monitoring hook */
  const { startTimer, endTimer } = usePerformanceMonitor();

  /** Memory management initialization */
  useEffect(() => {
    const memoryManager = MemoryManager.getInstance();

    // Register cleanup tasks for memory optimization
    memoryManager.registerCleanupTask(() => {
      // Clear template cache periodically
      import("./utils").then(({ clearTemplateCache }) => {
        clearTemplateCache();
      });
    });

    return () => {
      memoryManager.destroy();
    };
  }, []);

  /** State to trigger the spin animation on the "Refresh" button. */
  const [refreshSpin, setRefreshSpin] = useState(false);

  /** State for the CIDR Calculator modal, including its open state and callbacks. */
  const [cidrModal, setCidrModal] = useState<{
    isOpen: boolean;
    onApply: ((value: string) => void) | null;
    initialValue?: string;
  }>({ isOpen: false, onApply: null });

  /** State for the Regex Builder modal. */
  const [regexModal, setRegexModal] = useState<{
    isOpen: boolean;
    onApply: ((value: string) => void) | null;
    initialValue?: string;
  }>({ isOpen: false, onApply: null, initialValue: "" });

  /** State for the Command Library Manager modal's visibility. */
  const [managerModalOpen, setManagerModalOpen] = useState(false);

  /** State for the Chain Manager modal's visibility. */
  const [chainManagerOpen, setChainManagerOpen] = useState(false);

  /** State for all saved command chains, stored by name. */
  const [savedChains, setSavedChains] = useState<
    Record<string, { dropped: DroppedCommandType[]; values: CommandValuesMap }>
  >({});

  /** State to track if chains have been loaded from localStorage to prevent race conditions. */
  const [chainsLoaded, setChainsLoaded] = useState(false);

  /** State to track which command categories are collapsed in the library view. */
  const [collapsedCategories, setCollapsedCategories] = useState<
    Record<string, boolean>
  >({});

  /** State to control whether generated commands are concatenated with '&'. */
  const [useAndConcatenation, setUseAndConcatenation] = useState(false);

  /** State to track which command has been copied for feedback. */
  const [copiedKey, setCopiedKey] = useState<string | number | null>(null);

  /** State to track the currently loaded recipe and if it has been modified. */
  const [currentRecipeState, setCurrentRecipeState] = useState<{
    name: string | null;
    isModified: boolean;
    originalChain: {
      dropped: DroppedCommandType[];
      values: CommandValuesMap;
    } | null;
  }>({
    name: null,
    isModified: false,
    originalChain: null,
  });

  // --- Effects ---

  /**
   * Loads commands and saved chains from enhanced storage on the initial application mount.
   * Falls back to default commands if none are found in storage.
   */
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load commands with enhanced error handling and validation
        const commandsResult = loadCommands(defaultCommands);
        if (commandsResult.success && commandsResult.data) {
          setManagedCommands(commandsResult.data);
        } else {
          setManagedCommands(defaultCommands);
          if (commandsResult.error) {
            errorHandler.handleStorageError(
              "loadCommands",
              new Error(commandsResult.error)
            );
          }
        }

        // Load chains with enhanced error handling and validation
        const chainsResult = loadChains({});
        if (chainsResult.success && chainsResult.data) {
          setSavedChains(chainsResult.data);
        } else if (chainsResult.error) {
          errorHandler.handleStorageError(
            "loadChains",
            new Error(chainsResult.error)
          );
        }
      } catch (error) {
        errorHandler.handleStorageError("initialLoad", error as Error);
        // Fallback to defaults in case of critical errors
        setManagedCommands(defaultCommands);
      } finally {
        // Signal that the initial load attempt is complete
        setChainsLoaded(true);
      }
    };

    loadInitialData();
  }, []);

  /**
   * Loads a command chain from a URL deep link on initial mount.
   * This allows users to share command chains via URL.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const chainData = params.get("chain");
    if (chainData) {
      try {
        const decodedChain = JSON.parse(atob(decodeURIComponent(chainData)));
        if (decodedChain.dropped && decodedChain.values) {
          setDropped(decodedChain.dropped);
          setValues(decodedChain.values);
        }
        // Clean the URL to remove the chain data after loading
        window.history.replaceState({}, "", window.location.pathname);
      } catch (e) {
        console.error("Failed to load chain from URL", e);
        alert("Error: Could not load the shared command chain from the URL.");
      }
    }
  }, []);

  /**
   * Persists the managed command library using enhanced storage whenever it changes.
   */
  useEffect(() => {
    // Avoid clearing storage if commands are just temporarily empty during init
    if (managedCommands.length > 0) {
      const result = saveCommands(managedCommands);
      if (!result.success && result.error) {
        errorHandler.handleStorageError(
          "saveCommands",
          new Error(result.error)
        );
      }
    }
  }, [managedCommands]);

  /**
   * Persists the saved command chains using enhanced storage whenever they change.
   */
  useEffect(() => {
    // Prevent saving before the initial load from storage is complete.
    if (!chainsLoaded) {
      return;
    }

    const result = saveChains(savedChains);
    if (!result.success && result.error) {
      errorHandler.handleStorageError("saveChains", new Error(result.error));
    }
  }, [savedChains, chainsLoaded]);

  /**
   * Clears the global target input field when the command chain becomes empty.
   */
  useEffect(() => {
    if (dropped.length === 0) {
      setGlobalTarget("");
    }
  }, [dropped]);

  /**
   * Applies the current color theme ('light', 'dark', 'system') to the document.
   * Listens for system theme changes and updates the UI accordingly.
   */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      if (themeMode === "system") {
        document.documentElement.classList.toggle("dark", mq.matches);
      }
    };

    // Reset and apply the correct theme class
    document.documentElement.classList.remove("dark");
    if (themeMode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (themeMode === "system") {
      applySystemTheme();
      mq.addEventListener("change", applySystemTheme);
    }

    // Cleanup listener on component unmount or theme change
    return () => mq.removeEventListener("change", applySystemTheme);
  }, [themeMode]);

  /**
   * Track changes to the current chain and mark loaded recipes as modified.
   */
  useEffect(() => {
    if (currentRecipeState.name && currentRecipeState.originalChain) {
      const currentChain = { dropped, values };
      const isEqual =
        JSON.stringify(currentChain) ===
        JSON.stringify(currentRecipeState.originalChain);

      if (!isEqual && !currentRecipeState.isModified) {
        setCurrentRecipeState((prev) => ({ ...prev, isModified: true }));
      } else if (isEqual && currentRecipeState.isModified) {
        setCurrentRecipeState((prev) => ({ ...prev, isModified: false }));
      }
    }
  }, [dropped, values, currentRecipeState]);

  // --- Memos ---

  /**
   * A memoized map of command IDs to command definitions for efficient lookups.
   * Prevents re-computing this map on every render.
   */
  const commandMap = useCommandMap(managedCommands);

  /**
   * Memoized list of unique, sorted category names from the command library.
   */
  const categories = useMemo(
    () => [...new Set(managedCommands.map((c) => c.category))].sort(),
    [managedCommands]
  );

  /**
   * Memoized search results. Filters and groups commands based on the debounced search term.
   * This is a critical optimization to prevent expensive filtering on every render.
   */
  const searchResultsData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) return {};

    startTimer("search-filter");
    const lowerSearch = debouncedSearchTerm.toLowerCase();
    const groupedResults: Record<
      string,
      { commands: any[]; isFullCategoryMatch: boolean }
    > = {};

    const isModifierSearch = "modifier".includes(lowerSearch);

    // First pass: Find categories that fully match the search term.
    categories
      .filter((cat) => cat.toLowerCase().includes(lowerSearch))
      .forEach((catName) => {
        groupedResults[catName] = {
          commands: managedCommands
            .filter((c) => c.category === catName)
            .map((c) => ({ ...c, _forcedVariants: null })),
          isFullCategoryMatch: true,
        };
      });

    // Second pass: Find individual commands or variants that match.
    managedCommands.forEach((command) => {
      // Skip if its entire category is already included.
      if (groupedResults[command.category]?.isFullCategoryMatch) {
        return;
      }

      const commandMatches = command.label.toLowerCase().includes(lowerSearch);
      const keywordMatches = (
        Array.isArray(command.keywords) ? command.keywords : []
      ).some((kw) => kw.toLowerCase().includes(lowerSearch));
      const typeMatches = isModifierSearch && command.type === "modifier";
      const variantsThatMatch = (command.variants || []).filter((v) =>
        v.label.toLowerCase().includes(lowerSearch)
      );

      if (
        commandMatches ||
        keywordMatches ||
        variantsThatMatch.length > 0 ||
        typeMatches
      ) {
        if (!groupedResults[command.category]) {
          groupedResults[command.category] = {
            commands: [],
            isFullCategoryMatch: false,
          };
        }

        // Avoid adding the same command twice.
        if (
          groupedResults[command.category].commands.some(
            (c) => c.id === command.id
          )
        )
          return;

        // If only variants matched, force them to be visible.
        // If command label or type matches, don't force variants.
        const commandToRender = {
          ...command,
          _forcedVariants:
            commandMatches || typeMatches ? null : variantsThatMatch,
        };

        groupedResults[command.category].commands.push(commandToRender);
      }
    });

    endTimer("search-filter");
    return groupedResults;
  }, [debouncedSearchTerm, managedCommands, categories]);

  /**
   * Memoized array of the generated command strings for the current chain.
   * This prevents re-computing the strings on every render and uses caching for performance.
   */
  const commandStrings = useMemo(() => {
    startTimer("command-generation");

    const strings = dropped
      .map((c) => {
        const cmdMeta = commandMap[c.id];
        const instanceValues = values[c.key];
        if (!cmdMeta || !instanceValues) return "";

        // Start with the base template and process it with label-based placeholders
        let commandString = processTemplate(
          cmdMeta.template || "",
          cmdMeta.options || [],
          instanceValues.required || {}
        );

        // Append optional flags and values
        (instanceValues.optional || []).forEach((opt) => {
          if (opt.name) {
            const optMeta = cmdMeta.options.find((x) => x.name === opt.name);
            if (optMeta) {
              if (optMeta.type === "checkbox") {
                if (opt.value === true) {
                  commandString += ` ${optMeta.flag}`;
                }
              } else {
                if (opt.value) {
                  commandString += ` ${optMeta.flag} ${opt.value}`;
                }
              }
            }
          }
        });

        // Append modifiers
        (instanceValues.modifiers || []).forEach((mod) => {
          const modMeta = commandMap[mod.id];
          if (!modMeta) return;

          // Process modifier template with label-based placeholders
          let modStr = processTemplate(
            modMeta.template || "",
            modMeta.options || [],
            mod.required || {}
          );

          // Append optional flags and values for the modifier
          (mod.parameters || []).forEach((param) => {
            if (param.isCustom) {
              // It's a custom value, appended directly.
              if (param.value) {
                modStr += ` ${param.value}`;
              }
            } else {
              // It's a predefined optional parameter
              if (param.name) {
                const optMeta = modMeta.options.find(
                  (x) => x.name === param.name
                );
                if (optMeta) {
                  if (optMeta.type === "checkbox") {
                    if (param.value && optMeta.flag) {
                      modStr += ` ${optMeta.flag}`;
                    }
                  } else if (param.value) {
                    if (optMeta.flag && optMeta.flag !== "") {
                      modStr += ` ${optMeta.flag} ${param.value}`;
                    } else {
                      modStr += ` ${param.value}`;
                    }
                  }
                }
              }
            }
          });

          // Clean up any remaining unused placeholders in the modifier
          modStr = modStr.replace(/\{\{\w+\}\}/g, "");
          commandString += ` ${modStr.trim()}`;
        });

        // Final cleanup and formatting
        return commandString.trim().replace(/\s+/g, " ");
      })
      .filter(Boolean);

    endTimer("command-generation");
    return strings;
  }, [dropped, values, commandMap, startTimer, endTimer]);

  // --- Callbacks and Handlers ---

  /** Toggles the color theme between 'system', 'light', and 'dark'. */
  const toggleTheme = useCallback(
    () =>
      setThemeMode((p) =>
        p === "system" ? "light" : p === "light" ? "dark" : "system"
      ),
    []
  );

  /**
   * Opens the CIDR Calculator modal with a specific callback to apply the result.
   * @param onApplyCallback - The function to call with the calculated CIDR value.
   * @param initialValue - The initial IP/CIDR value to populate the modal with.
   */
  const openCidrModal = useCallback((onApplyCallback, initialValue = "") => {
    setCidrModal({ isOpen: true, onApply: onApplyCallback, initialValue });
  }, []);

  /** Closes the CIDR Calculator modal. */
  const closeCidrModal = useCallback(() => {
    setCidrModal({ isOpen: false, onApply: null, initialValue: "" });
  }, []);

  /** Opens the Regex Builder modal. */
  const openRegexModal = useCallback((onApplyCallback, initialValue = "") => {
    setRegexModal({ isOpen: true, onApply: onApplyCallback, initialValue });
  }, []);

  /** Closes the Regex Builder modal. */
  const closeRegexModal = useCallback(() => {
    setRegexModal({ isOpen: false, onApply: null, initialValue: "" });
  }, []);

  /**
   * Handles dropping a new command into the chain.
   * It creates a unique key, sets up its initial state, and adds it to the list.
   */
  const handleDrop = useCallback(
    (cmd: (typeof defaultCommands)[0] & { variant?: any }) => {
      // Modifiers are handled by the drop zone on an existing command, not the main area.
      if (cmd.type === "modifier") return;

      const key = `${cmd.id}-${Date.now()}`;
      const isVariant = !!cmd.variant;

      // Define a guaranteed base structure for a command's value state.
      const baseState: CommandValue = {
        required: {},
        optional: [],
        modifiers: [],
      };

      // Deep clone the prefilled state from the variant, if it exists.
      const prefilledState =
        isVariant && cmd.variant.prefilled
          ? JSON.parse(JSON.stringify(cmd.variant.prefilled))
          : {};

      // Merge the base and prefilled states to ensure the final state object is complete.
      const initialState: CommandValue = {
        ...baseState,
        ...prefilledState,
      };

      const newLabel = isVariant
        ? `${cmd.label} - ${cmd.variant.label}`
        : cmd.label;

      setDropped((prev) => [...prev, { ...cmd, key, label: newLabel }]);
      setValues((prev) => ({ ...prev, [key]: initialState }));
    },
    []
  );

  /**
   * Moves a command within the chain for reordering.
   * @param from - The starting index.
   * @param to - The destination index.
   */
  const moveCommand = useCallback(
    (from: number, to: number) =>
      setDropped((prev) => {
        const newDropped = [...prev];
        const [movedItem] = newDropped.splice(from, 1);
        newDropped.splice(to, 0, movedItem);
        return newDropped;
      }),
    []
  );

  /**
   * Removes a command from the chain.
   * @param key - The unique key of the command to remove.
   */
  const handleRemove = useCallback((key: string) => {
    setDropped((prev) => prev.filter((c) => c.key !== key));
    setValues((prev) => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });
  }, []);

  /**
   * Adds a modifier (e.g., `| grep`) to a specific command in the chain.
   * @param targetCommandKey - The key of the command to add the modifier to.
   * @param modifierCmd - The modifier command definition.
   */
  const addModifier = useCallback(
    (targetCommandKey: string, modifierCmd: any) => {
      setValues((prev) => {
        const prevCmdValues = prev[targetCommandKey];
        if (!prevCmdValues) return prev;

        const prevModifiers = prevCmdValues.modifiers || [];

        // Prevent adding duplicate modifiers if they are marked as non-stackable.
        const isUnique = modifierCmd.allowMultiple === false;
        if (isUnique) {
          const alreadyExists = prevModifiers.some(
            (m) => m.id === modifierCmd.id
          );
          if (alreadyExists) {
            return prev; // Do not add if it already exists.
          }
        }

        const modifierKey = `${modifierCmd.id}-${Date.now()}`;
        const newModifier = {
          key: modifierKey,
          id: modifierCmd.id,
          required: {},
          parameters: [],
        };

        return {
          ...prev,
          [targetCommandKey]: {
            ...prevCmdValues,
            modifiers: [...prevModifiers, newModifier],
          },
        };
      });
    },
    []
  );

  /**
   * Removes a modifier from a command.
   * @param targetCommandKey - The key of the parent command.
   * @param modifierKeyToRemove - The key of the modifier to remove.
   */
  const removeModifier = useCallback(
    (targetCommandKey: string, modifierKeyToRemove: string) => {
      setValues((prev) => {
        const prevCmdValues = prev[targetCommandKey];
        if (!prevCmdValues?.modifiers) {
          return prev;
        }

        const newModifiers = prevCmdValues.modifiers.filter(
          (m) => m.key !== modifierKeyToRemove
        );

        return {
          ...prev,
          [targetCommandKey]: {
            ...prevCmdValues,
            modifiers: newModifiers,
          },
        };
      });
    },
    []
  );

  /**
   * Handles value changes within a modifier's own parameters.
   * @param targetCommandKey - The key of the parent command.
   * @param modifierKey - The key of the modifier being changed.
   * @param fieldName - The name of the parameter being changed.
   * @param value - The new value.
   */
  const handleModifierChange = useCallback(
    (
      targetCommandKey: string,
      modifierKey: string,
      fieldName: string,
      value: any
    ) => {
      setValues((prev) => {
        const prevCmdValues = prev[targetCommandKey];
        if (!prevCmdValues?.modifiers) {
          return prev;
        }

        const newModifiers = prevCmdValues.modifiers.map((modifier) => {
          if (modifier.key === modifierKey) {
            const newModifier = { ...modifier };
            if (fieldName === "parameters") {
              newModifier.parameters = value;
            } else {
              newModifier.required = {
                ...(newModifier.required || {}),
                [fieldName]: value,
              };
            }
            return newModifier;
          }
          return modifier;
        });

        return {
          ...prev,
          [targetCommandKey]: {
            ...prevCmdValues,
            modifiers: newModifiers,
          },
        };
      });
    },
    []
  );

  /**
   * Moves a modifier within a command's modifier list for reordering.
   * @param targetCommandKey - The key of the parent command.
   * @param from - The starting index of the modifier.
   * @param to - The destination index of the modifier.
   */
  const moveModifier = useCallback(
    (targetCommandKey: string, from: number, to: number) => {
      setValues((prev) => {
        const prevCmdValues = prev[targetCommandKey];
        if (!prevCmdValues?.modifiers) {
          return prev;
        }

        const newModifiers = [...prevCmdValues.modifiers];
        const [movedModifier] = newModifiers.splice(from, 1);
        newModifiers.splice(to, 0, movedModifier);

        return {
          ...prev,
          [targetCommandKey]: {
            ...prevCmdValues,
            modifiers: newModifiers,
          },
        };
      });
    },
    []
  );

  /** Handles copying an individual command string to the clipboard. */
  const handleCopyIndividual = useCallback(
    (text: string, key: string | number) => {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        setCopiedKey(key);
        // Reset the copied state after 1 second for visual feedback.
        setTimeout(() => setCopiedKey(null), 1000);
      });
    },
    []
  );

  /** Determines if any dropped command has a "target" parameter, requiring the global input. */
  const hasTarget = useMemo(
    () =>
      dropped.some((c) =>
        commandMap[c.id]?.options.some((o) => o.name === "target")
      ),
    [dropped, commandMap]
  );

  /** Applies the global target value to all commands in the chain that accept it. */
  const applyGlobal = useCallback(() => {
    setValues((prev) => {
      const newValues = { ...prev };
      dropped.forEach((c) => {
        if (commandMap[c.id]?.options.some((opt) => opt.name === "target")) {
          newValues[c.key] = {
            ...newValues[c.key],
            required: { ...newValues[c.key].required, target: globalTarget },
          };
        }
      });
      return newValues;
    });
  }, [dropped, globalTarget, commandMap]);

  /** Saves a new or updated command chain to the `savedChains` state. */
  const handleSaveChain = useCallback(
    (
      name: string,
      chain: { dropped: DroppedCommandType[]; values: CommandValuesMap },
      overwrite: boolean = false
    ) => {
      // Check if name already exists and we're not explicitly overwriting
      if (savedChains[name] && !overwrite) {
        return { success: false, exists: true };
      }

      setSavedChains((prev) => ({ ...prev, [name]: chain }));

      // Update recipe state if this is the currently loaded recipe
      setCurrentRecipeState({
        name: name,
        isModified: false,
        originalChain: JSON.parse(JSON.stringify(chain)), // Deep copy
      });

      return { success: true, exists: false };
    },
    [savedChains]
  );

  /** Loads a saved command chain into the active workspace. */
  const handleLoadChain = useCallback(
    (
      chain: { dropped: DroppedCommandType[]; values: CommandValuesMap },
      recipeName?: string
    ) => {
      if (chain.dropped && chain.values) {
        setDropped(chain.dropped);
        setValues(chain.values);
        setChainManagerOpen(false);

        // Track the loaded recipe
        if (recipeName) {
          setCurrentRecipeState({
            name: recipeName,
            isModified: false,
            originalChain: JSON.parse(JSON.stringify(chain)), // Deep copy
          });
        } else {
          // Clear recipe state if loading from URL or other source
          setCurrentRecipeState({
            name: null,
            isModified: false,
            originalChain: null,
          });
        }
      }
    },
    []
  );

  /** Deletes a saved command chain by name. */
  const handleDeleteChain = useCallback((name: string) => {
    setSavedChains((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  /** Renames a saved command chain. */
  const handleRenameChain = useCallback(
    (oldName: string, newName: string) => {
      if (!newName.trim() || oldName === newName) return;
      if (savedChains[newName]) {
        alert(`A chain with the name "${newName}" already exists.`);
        return;
      }
      setSavedChains((prev) => {
        const newChains = { ...prev };
        const data = newChains[oldName];
        delete newChains[oldName];
        newChains[newName] = data;
        return newChains;
      });
    },
    [savedChains]
  );

  /** Toggles the collapsed state of a command category. */
  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  // --- Accessibility Hooks ---

  /** Screen reader utilities */
  const { announce, announcePageStructure } = useScreenReader();

  /** Motion preferences */
  const { prefersReducedMotion, getAnimationDuration } = useMotionPreferences();

  /** High contrast mode detection */
  const isHighContrast = useHighContrast();

  /** Live region for announcements */
  const { updateLiveRegion } = useLiveRegion();

  /** Keyboard shortcuts */
  useKeyboardShortcuts({
    "ctrl+s": () => {
      if (dropped.length > 0) {
        setChainManagerOpen(true);
        announce("Chain manager opened for saving");
      }
    },
    "ctrl+o": () => {
      setChainManagerOpen(true);
      announce("Chain manager opened for loading");
    },
    "ctrl+m": () => {
      setManagerModalOpen(true);
      announce("Command manager opened");
    },
    "ctrl+t": () => {
      toggleTheme();
      announce(
        `Theme switched to ${
          themeMode === "system"
            ? "light"
            : themeMode === "light"
            ? "dark"
            : "system"
        }`
      );
    },
    "ctrl+c": () => {
      if (commandStrings.length > 0) {
        const allCommands = useAndConcatenation
          ? commandStrings.join(" && ")
          : commandStrings.join("\n");
        navigator.clipboard.writeText(allCommands);
        announce("All commands copied to clipboard");
      }
    },
    escape: () => {
      if (managerModalOpen) {
        setManagerModalOpen(false);
        announce("Command manager closed");
      } else if (chainManagerOpen) {
        setChainManagerOpen(false);
        announce("Chain manager closed");
      } else if (cidrModal.isOpen) {
        closeCidrModal();
        announce("CIDR calculator closed");
      } else if (regexModal.isOpen) {
        closeRegexModal();
        announce("Regex builder closed");
      }
    },
    "ctrl+shift+c": () => {
      setDropped([]);
      setValues({});
      announce("All commands cleared");
    },
  });

  // Announce page structure on load
  useEffect(() => {
    const timer = setTimeout(() => {
      announcePageStructure();
      announce(
        "Cyber Command Chef loaded. Use Tab to navigate, or press Ctrl+M to open command manager."
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [announcePageStructure, announce]);

  // Announce when commands are added/removed
  useEffect(() => {
    if (dropped.length > 0) {
      updateLiveRegion(
        `${dropped.length} command${dropped.length === 1 ? "" : "s"} in chain`
      );
    }
  }, [dropped.length, updateLiveRegion]);

  /** Keyboard shortcuts */
  useKeyboardShortcuts({
    "ctrl+s": () => {
      if (dropped.length > 0) {
        setChainManagerOpen(true);
        announce("Chain manager opened for saving");
      }
    },
    "ctrl+o": () => {
      setChainManagerOpen(true);
      announce("Chain manager opened for loading");
    },
    "ctrl+m": () => {
      setManagerModalOpen(true);
      announce("Command manager opened");
    },
    "ctrl+t": () => {
      toggleTheme();
      announce(
        `Theme switched to ${
          themeMode === "system"
            ? "light"
            : themeMode === "light"
            ? "dark"
            : "system"
        }`
      );
    },
    "ctrl+c": () => {
      if (commandStrings.length > 0) {
        const allCommands = useAndConcatenation
          ? commandStrings.join(" && ")
          : commandStrings.join("\n");
        navigator.clipboard.writeText(allCommands);
        announce("All commands copied to clipboard");
      }
    },
    escape: () => {
      if (managerModalOpen) {
        setManagerModalOpen(false);
        announce("Command manager closed");
      } else if (chainManagerOpen) {
        setChainManagerOpen(false);
        announce("Chain manager closed");
      } else if (cidrModal.isOpen) {
        closeCidrModal();
        announce("CIDR calculator closed");
      } else if (regexModal.isOpen) {
        closeRegexModal();
        announce("Regex builder closed");
      }
    },
    "ctrl+shift+c": () => {
      setDropped([]);
      setValues({});
      announce("All commands cleared");
    },
  });

  // Announce page structure on load
  useEffect(() => {
    const timer = setTimeout(() => {
      announcePageStructure();
      announce(
        "Cyber Command Chef loaded. Use Tab to navigate, or press Ctrl+M to open command manager."
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [announcePageStructure, announce]);

  /** Memoized handlers for better performance */
  const memoizedHandlers = useMemo(
    () => ({
      handleDrop,
      moveCommand,
      handleRemove,
      addModifier,
      removeModifier,
      handleModifierChange,
      moveModifier,
      openCidrModal,
      openRegexModal,
      handleCopyIndividual,
    }),
    [
      handleDrop,
      moveCommand,
      handleRemove,
      addModifier,
      removeModifier,
      handleModifierChange,
      moveModifier,
      openCidrModal,
      openRegexModal,
      handleCopyIndividual,
    ]
  );

  // Skip links for keyboard navigation
  const skipLinks = (
    <div className="sr-only">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#command-library" className="skip-link">
        Skip to command library
      </a>
      <a href="#command-chain" className="skip-link">
        Skip to command chain
      </a>
    </div>
  );

  const emptyTop = dropped.length === 0;

  // --- Render ---
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Modals */}
      <CidrModal
        isOpen={cidrModal.isOpen}
        onClose={closeCidrModal}
        onApply={cidrModal.onApply || (() => {})}
        initialValue={cidrModal.initialValue}
      />
      <RegexModal
        isOpen={regexModal.isOpen}
        onClose={closeRegexModal}
        onApply={regexModal.onApply || (() => {})}
        initialValue={regexModal.initialValue}
      />
      <CommandManagerModal
        isOpen={managerModalOpen}
        onClose={() => setManagerModalOpen(false)}
        commands={managedCommands}
        setCommands={(cmds: typeof defaultCommands) => setManagedCommands(cmds)}
      />
      <ChainManagerModal
        isOpen={chainManagerOpen}
        onClose={() => setChainManagerOpen(false)}
        currentChain={{ dropped, values }}
        savedChains={savedChains}
        onSaveChain={handleSaveChain}
        onLoadChain={handleLoadChain}
        onDeleteChain={handleDeleteChain}
        onRenameChain={handleRenameChain}
        currentRecipeState={currentRecipeState}
      />

      {/* Header */}
      <header className="flex items-center justify-between p-4 flex-shrink-0">
        <h1 className="text-2xl font-bold">Cyber Command Chef</h1>
        <div className="flex items-center gap-2">
          {/* Clear All Dropped Commands Button */}
          {dropped.length > 0 && (
            <button
              onClick={() => {
                setDropped([]);
                setValues({});
                // Clear recipe state when manually clearing the workspace
                setCurrentRecipeState({
                  name: null,
                  isModified: false,
                  originalChain: null,
                });
              }}
              className="p-2 rounded-full text-sm bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-white dark:text-gray-400 dark:hover:text-white hover:bg-red-500 dark:hover:bg-red-600 active:bg-red-400 active:inset-shadow-sm dark:active:bg-red-500 transition duration-500"
              aria-label="Clear all dropped commands"
              title="Clear all dropped commands"
            >
              <X strokeWidth={1.75} className="scale-75" />
            </button>
          )}
          <button
            onClick={() => setChainManagerOpen(true)}
            className="p-2 text-sm rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-500"
            aria-label="Save or load command chains"
          >
            <Share2 strokeWidth={1.5} className="scale-75" />
          </button>
          <button
            onClick={() => setManagerModalOpen(true)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-500"
            aria-label="Open command library manager"
          >
            <Settings strokeWidth={1} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-500"
            aria-label="Toggle color theme"
            style={{ width: 40, height: 40 }}
          >
            <span
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
              style={{
                opacity: themeMode === "light" ? 1 : 0,
                zIndex: themeMode === "light" ? 2 : 1,
                transition: "opacity 0.3s",
              }}
            >
              <Sun strokeWidth={1} />
            </span>
            <span
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
              style={{
                opacity: themeMode === "dark" ? 1 : 0,
                zIndex: themeMode === "dark" ? 2 : 1,
                transition: "opacity 0.3s",
              }}
            >
              <Moon strokeWidth={1} />
            </span>
            <span
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
              style={{
                opacity: themeMode === "system" ? 1 : 0,
                zIndex: themeMode === "system" ? 2 : 1,
                transition: "opacity 0.3s",
              }}
            >
              <SunMoon strokeWidth={1} />
            </span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <DndProvider backend={HTML5Backend}>
        <div className="flex flex-1 overflow-hidden p-4 pt-0 gap-4">
          {/* Left Panel: Command Library */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg inset-shadow-sm">
            <div className="relative p-4">
              <input
                type="text"
                placeholder="Search Commands"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none pr-8 bg-white dark:bg-gray-700"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-7 flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-500"
                  aria-label="Clear search"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="overflow-y-auto">
              {searchTerm.trim() ? (
                <div>
                  {searchTerm.trim() !== debouncedSearchTerm.trim() ? (
                    // Show searching indicator while debouncing
                    <div className="flex items-center justify-center mt-8">
                      <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span>Searching...</span>
                      </div>
                    </div>
                  ) : Object.keys(searchResultsData).length > 0 ? (
                    // Show search results
                    Object.entries(searchResultsData).map(
                      ([category, data]) => (
                        <div key={category}>
                          <h3 className="w-full text-left font-bold text-lg border-y border-gray-200 dark:border-gray-600 p-4">
                            {category}
                          </h3>
                          <div className="bg-gray-50 dark:bg-gray-700">
                            {data.commands.map((cmd) => (
                              <CommandEntry
                                key={cmd.id}
                                command={cmd}
                                forcedVariants={cmd._forcedVariants}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    // Show no results found only after search is complete
                    <div className="text-center mt-8">
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        No Results Found
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                        Try adjusting your search terms
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                categories.map((cat) => (
                  <div key={cat}>
                    <button
                      onClick={() => toggleCategory(cat)}
                      className="sticky z-40 top-0 w-full flex justify-between items-center text-left font-bold text-lg p-4 border-y border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800"
                      aria-expanded={!collapsedCategories[cat]}
                    >
                      <span>{cat}</span>
                      <ChevronDown
                        size={20}
                        className={`transition-transform duration-200 mr-2.5 ${
                          !collapsedCategories[cat] ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {!collapsedCategories[cat] && (
                      <div className="bg-gray-50 dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600">
                        {managedCommands
                          .filter((c) => c.category === cat)
                          .map((c) => (
                            <CommandEntry key={c.id} command={c} />
                          ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel: Dropped Commands & Output */}
          <div className="flex flex-col flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-4 inset-shadow-sm">
            {/* Global Target Input */}
            {hasTarget && (
              <div className="mb-4 flex items-center space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    id="global-target"
                    value={globalTarget}
                    onChange={(e) => setGlobalTarget(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setGlobalTarget(e.currentTarget.value);
                        applyGlobal();
                        e.preventDefault();
                      }
                    }}
                    className={
                      `peer block w-full appearance-none focus:outline-none border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 p-2 pt-5 pr-20` +
                      (globalTarget ? " border-solid" : " border-dashed")
                    }
                    placeholder=" "
                  />
                  <label
                    htmlFor="global-target"
                    className="absolute left-2 top-2 z-10 origin-[0] -translate-y-1/3 scale-90 transform dark:bg-gray-700 px-1 text-gray-500 dark:text-gray-400 duration-200 pointer-events-none peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-90 peer-focus:-translate-y-1/3"
                  >
                    Global Target
                  </label>
                  <button
                    onClick={() => openCidrModal(setGlobalTarget, globalTarget)}
                    className="absolute inset-y-0 right-10 flex items-center pr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label="Open CIDR Calculator"
                    type="button"
                  >
                    <Network
                      strokeWidth={1.75}
                      size={20}
                      className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300  transition duration-500"
                    />
                  </button>
                  <button
                    onClick={() => {
                      setRefreshSpin(true);
                      applyGlobal();
                      setTimeout(() => setRefreshSpin(false), 400);
                    }}
                    className="absolute inset-y-0 right-2 flex items-center pr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition duration-500"
                    aria-label="Refresh Global Target"
                    type="button"
                  >
                    <RefreshCw
                      strokeWidth={1.75}
                      size={20}
                      className={`w-5 h-5 transition-transform duration-400 ${
                        refreshSpin ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Command Chain Drop Area */}
            <DroppableArea
              onDrop={memoizedHandlers.handleDrop}
              showPlaceholder={emptyTop}
            >
              {dropped.map((c, i) => (
                <DroppedCommand
                  key={c.key}
                  cmd={c}
                  index={i}
                  moveCommand={memoizedHandlers.moveCommand}
                  handleRemove={memoizedHandlers.handleRemove}
                  values={values}
                  setValues={setValues}
                  commandMap={commandMap}
                  addModifier={memoizedHandlers.addModifier}
                  removeModifier={memoizedHandlers.removeModifier}
                  handleModifierChange={memoizedHandlers.handleModifierChange}
                  moveModifier={memoizedHandlers.moveModifier}
                  openCidrModal={memoizedHandlers.openCidrModal}
                  openRegexModal={memoizedHandlers.openRegexModal}
                />
              ))}
            </DroppableArea>

            {/* Generated Command Output Area */}
            <div className="mt-4 flex flex-col bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg h-48 inset-shadow-sm flex-shrink-0">
              {dropped.length > 1 && (
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600 flex justify-start items-center">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="concat-toggle"
                      className="text-sm font-medium select-none"
                    >
                      Combine
                    </label>
                    <button
                      id="concat-toggle"
                      role="switch"
                      aria-checked={useAndConcatenation}
                      onClick={() =>
                        setUseAndConcatenation(!useAndConcatenation)
                      }
                      className={`${
                        useAndConcatenation
                          ? "bg-blue-600"
                          : "bg-gray-200 dark:bg-gray-600"
                      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-700`}
                    >
                      <span
                        className={`${
                          useAndConcatenation
                            ? "translate-x-6"
                            : "translate-x-1"
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                      />
                    </button>
                  </div>
                </div>
              )}
              <div className="p-4 flex-1 overflow-y-auto font-mono text-sm whitespace-pre-wrap break-all">
                {emptyTop ? (
                  <div className="flex flex-col justify-center items-center h-full w-full">
                    <p className="text-gray-500 dark:text-gray-400 text-xl text-center font-sans whitespace-normal">
                      Generated commands appear here
                    </p>
                  </div>
                ) : useAndConcatenation ? (
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex-1">{commandStrings.join(" & ")}</span>
                    <button
                      onClick={() =>
                        handleCopyIndividual(
                          commandStrings.join(" & "),
                          "concatenated"
                        )
                      }
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors duration-200"
                      aria-label="Copy concatenated command"
                    >
                      <span className="relative inline-block w-5 h-5">
                        <Clipboard
                          size={18}
                          className={`absolute inset-0 transition-opacity duration-300 ${
                            copiedKey === "concatenated"
                              ? "opacity-0"
                              : "opacity-100"
                          }`}
                        />
                        <ClipboardCheck
                          size={18}
                          className={`absolute inset-0 transition-opacity duration-300 text-blue-500 ${
                            copiedKey === "concatenated"
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {commandStrings.map((cmd, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between gap-2"
                      >
                        <span className="flex-1">{cmd}</span>
                        <button
                          onClick={() => handleCopyIndividual(cmd, index)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-all duration-200"
                          aria-label={`Copy command ${index + 1}`}
                        >
                          <span className="relative inline-block w-5 h-5">
                            <Clipboard
                              size={18}
                              className={`absolute inset-0 transition-opacity duration-300 ${
                                copiedKey === index
                                  ? "opacity-0"
                                  : "opacity-100"
                              }`}
                            />
                            <ClipboardCheck
                              size={18}
                              className={`absolute inset-0 transition-opacity duration-300 text-blue-500 ${
                                copiedKey === index
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DndProvider>

      {/* Notification System */}
      <NotificationSystem />
    </div>
  );
}

// --- Application Mount ---
const container = document.getElementById("root");
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
