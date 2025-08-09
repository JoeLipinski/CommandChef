/**
 * @file RegexModal.tsx
 * @description An advanced, interactive modal for building, testing, and understanding regular expressions.
 * It features templates, a cheatsheet, real-time matching, and AI-powered explanations.
 */

import React, { useState, useEffect, useRef } from "react";

// Type for regex match result
type RegexMatch = {
  fullMatch: string;
  groups: string[];
  index: number;
};
import { X, Sparkles, Loader, ChevronDown } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { regexTemplates, regexCheatsheet } from "./regexConstants";

/**
 * Props for the RegexModal component.
 * @property isOpen - Whether the modal is currently visible.
 * @property onClose - Callback to close the modal.
 * @property onApply - Callback to apply the created regex pattern.
 * @property initialValue - The initial regex pattern to populate the modal with.
 */
interface RegexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: string) => void;
  initialValue?: string;
}

/**
 * The interactive Regex Builder modal component.
 */
export function RegexModal({
  isOpen,
  onClose,
  onApply,
  initialValue,
}: RegexModalProps) {
  /** State for the regex pattern being built. */
  const [pattern, setPattern] = useState("");
  /** State for the string used to test the regex pattern. */
  const [testString, setTestString] = useState(
    "The quick orange fox emails the lazydog@domain.com on 2024-07-26. He sent a payroll.pdf file. Now the lazy dog's computer is asking for $1000 payment."
  );
  // Ref for the test string textarea
  const testStringRef = useRef<HTMLTextAreaElement>(null);
  /** State to store the results of the regex match. */
  const [matches, setMatches] = useState<RegexMatch[]>([]);
  /** State for any errors that occur during regex compilation. */
  const [regexError, setRegexError] = useState("");

  /** State to control the visibility of the regex cheatsheet. */
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(true);

  /** State for template search/autocomplete */
  const [templateQuery, setTemplateQuery] = useState("");
  const [showTemplateSuggestions, setShowTemplateSuggestions] = useState(false);
  const templateInputRef = useRef<HTMLInputElement>(null);

  /** Ref for the pattern input element to manage cursor position. */
  const patternInputRef = useRef<HTMLInputElement>(null);

  /**
   * Effect to reset the modal's state when it is opened.
   */
  useEffect(() => {
    if (isOpen) {
      setPattern(initialValue || "");
      setRegexError("");
      // Auto-resize test string textarea on open
      setTimeout(() => {
        if (testStringRef.current) {
          testStringRef.current.style.height = "auto";
          testStringRef.current.style.height =
            testStringRef.current.scrollHeight + "px";
        }
      }, 0);
      // Immediately run regex match on open with initial values
      try {
        if ((initialValue || pattern) && testString) {
          const regex = new RegExp(initialValue || pattern, "g");
          const allMatches: RegexMatch[] = [];
          let match;
          while ((match = regex.exec(testString)) !== null) {
            if (match.index === regex.lastIndex) {
              regex.lastIndex++;
            }
            allMatches.push({
              fullMatch: String(match[0]),
              groups: Array.isArray(match) ? match.slice(1).map(String) : [],
              index: typeof match.index === "number" ? match.index : 0,
            } as RegexMatch);
          }
          setMatches(allMatches);
        } else {
          setMatches([]);
        }
      } catch (e) {
        setMatches([]);
        setRegexError(e.message);
      }
    }
  }, [isOpen, initialValue]);

  /**
   * Effect to perform real-time regex matching whenever the pattern or test string changes.
   */
  useEffect(() => {
    if (!pattern || !testString) {
      setMatches([]);
      setRegexError("");
      return;
    }

    try {
      // Create a global regex to find all matches.
      const regex = new RegExp(pattern, "g");
      const allMatches: RegexMatch[] = [];
      let match;
      // Loop through all matches in the test string.
      while ((match = regex.exec(testString)) !== null) {
        // Avoid infinite loops with zero-width matches.
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
        allMatches.push({
          fullMatch: String(match[0]),
          groups: Array.isArray(match) ? match.slice(1).map(String) : [],
          index: typeof match.index === "number" ? match.index : 0,
        } as RegexMatch);
      }
      setMatches(allMatches);
      setRegexError(""); // Clear any previous errors.
    } catch (e) {
      // Catch and display any errors from an invalid regex pattern.
      setMatches([]);
      setRegexError(e.message);
    }
  }, [pattern, testString]);

  /**
   * Handles clicking a token in the cheatsheet, inserting it into the pattern input.
   * @param token - The regex token to insert (e.g., '\\d', '\\s').
   */
  const handleCheatTokenClick = (token: string) => {
    const input = patternInputRef.current;
    if (!input) return;

    const { selectionStart, selectionEnd, value } = input;
    // Insert the token at the current cursor position.
    const safeStart = selectionStart ?? 0;
    const safeEnd = selectionEnd ?? 0;
    const newText =
      value.substring(0, safeStart) + token + value.substring(safeEnd);

    setPattern(newText);

    // Use a timeout to re-focus and set the cursor position after the state update.
    setTimeout(() => {
      input.focus();
      const newCursorPos = safeStart + token.length;
      input.selectionStart = input.selectionEnd = newCursorPos;
    }, 0);
  };

  /**
   * Applies the final regex pattern and closes the modal.
   */
  const handleApply = () => {
    if (onApply) {
      onApply(pattern);
    }
    onClose();
  };

  /**
   * Renders the test string with all matches highlighted.
   * @returns An array of string and JSX elements.
   */
  const renderHighlightedText = () => {
    if (!testString || matches.length === 0 || regexError) return testString;

    let lastIndex = 0;
    const parts: (string | React.ReactNode)[] = [];
    matches.forEach((match, i) => {
      // Add the text segment before the current match.
      if (match.index > lastIndex) {
        parts.push(testString.substring(lastIndex, match.index));
      }
      // Add the highlighted match.
      parts.push(
        <mark
          key={i}
          className="bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 rounded px-1"
        >
          {match.fullMatch}
        </mark>
      );
      lastIndex = match.index + match.fullMatch.length;
    });

    // Add any remaining text after the last match.
    if (lastIndex < testString.length) {
      parts.push(testString.substring(lastIndex));
    }
    return parts;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[65vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-xl font-bold">Interactive Regex Builder</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-gray-500 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 active:bg-red-400 active:inset-shadow-sm dark:active:bg-red-500 transition dark:text-gray-400 dark:hover:text-white duration-500"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
          {/* Left Column: Templates and Cheatsheet */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            <div className="relative">
              <h4 className="font-semibold mb-2">Regex Builder</h4>
              <input
                ref={templateInputRef}
                type="text"
                value={templateQuery}
                onChange={(e) => {
                  setTemplateQuery(e.target.value);
                  setShowTemplateSuggestions(true);
                }}
                onFocus={() => setShowTemplateSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowTemplateSuggestions(false), 150)
                }
                placeholder="Search Templates"
                className="w-full p-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 mb-1 outline-none"
                autoComplete="off"
              />
              {showTemplateSuggestions && templateQuery.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {regexTemplates
                    .filter(
                      (t) =>
                        t.name
                          .toLowerCase()
                          .includes(templateQuery.toLowerCase()) ||
                        t.value
                          .toLowerCase()
                          .includes(templateQuery.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((t, idx) => (
                      <div
                        key={t.name}
                        onMouseDown={() => {
                          setPattern(t.value);
                          setTemplateQuery("");
                          setShowTemplateSuggestions(false);
                          setTimeout(() => {
                            if (patternInputRef.current)
                              patternInputRef.current.focus();
                          }, 0);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-blue-900 text-sm border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <span className="font-medium dark:text-blue-300">
                          {t.name}
                        </span>
                      </div>
                    ))}
                  {regexTemplates.filter(
                    (t) =>
                      t.name
                        .toLowerCase()
                        .includes(templateQuery.toLowerCase()) ||
                      t.value
                        .toLowerCase()
                        .includes(templateQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-2 text-gray-400 text-sm">
                      No templates found.
                    </div>
                  )}
                </div>
              )}
            </div>
            <div>
              {isCheatsheetOpen && (
                <div className="space-y-3">
                  {regexCheatsheet.map((section) => (
                    <div key={section.category}>
                      <h5 className="font-medium text-sm mb-1">
                        {section.category}
                      </h5>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {section.items.map((item) => (
                          <div
                            key={item.token}
                            onClick={() => handleCheatTokenClick(item.token)}
                            className="flex items-baseline gap-2 group"
                          >
                            <code className="bg-gray-200 text-xs dark:bg-gray-600 rounded px-1.5 py-0.5 text-gray-600 dark:text-gray-400 font-mono group-hover:bg-gray-200 dark:group-hover:bg-gray-800">
                              {item.token}
                            </code>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {item.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Pattern, Test String, and Results */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-2">
            <div>
              <label className="font-semibold" htmlFor="regex-pattern">
                Regex Tester
              </label>
              <div className="flex gap-2 mt-2">
                <input
                  id="regex-pattern"
                  ref={patternInputRef}
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className={`flex-1 p-2 border-2 outline-none ${
                    regexError
                      ? "border-red-500"
                      : pattern
                      ? "border-gray-300 dark:border-gray-600 border-solid"
                      : "border-gray-300 dark:border-gray-600 border-dashed"
                  } rounded-lg font-mono bg-gray-100 dark:bg-gray-800`}
                  placeholder="RegEx Pattern"
                />
              </div>
              {regexError && (
                <p className="text-red-500 text-sm mt-1">{regexError}</p>
              )}
            </div>
            <div>
              <label className="font-medium text-sm" htmlFor="test-string">
                Test String
              </label>
              <textarea
                id="test-string"
                ref={testStringRef}
                value={testString}
                onChange={(e) => {
                  setTestString(e.target.value);
                  // Auto-resize
                  const ta = e.target as HTMLTextAreaElement;
                  ta.style.height = "auto";
                  ta.style.height = ta.scrollHeight + "px";
                }}
                rows={1}
                className={`mt-1 w-full p-2 border-2 resize-none overflow-hidden min-h-10 rounded-lg font-mono outline-none bg-gray-100 dark:bg-gray-800 ${
                  testString
                    ? "border-gray-300 dark:border-gray-600 border-solid"
                    : "border-gray-300 dark:border-gray-600 border-dashed"
                }`}
              />
              {pattern && testString && (
                <div>
                  <label className="font-medium text-sm" htmlFor="test-string">
                    Results
                  </label>
                  <div className="mt-1 p-2 border-2 rounded-lg font-mono border-gray-300 dark:border-none dark:bg-gray-900/50 min-h-[6rem]">
                    {renderHighlightedText()}
                    <br className="pb-2" />
                    {matches.length > 0 ? (
                      matches.map((match, i) => (
                        <div
                          key={i}
                          className="p-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="font-mono text-xs">
                            <strong className="font-medium">
                              Match {i + 1}:
                            </strong>{" "}
                            <span>{match.fullMatch}</span>
                          </div>
                          {match.groups.length > 0 && (
                            <div className="pl-4 mt-1">
                              {match.groups.map((group, j) => (
                                <div key={j} className="text-xs">
                                  <strong className="font-medium">
                                    Group {j + 1}:
                                  </strong>{" "}
                                  <span>{group || "undefined"}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-4">
                        No matches found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Modal Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            onClick={handleApply}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition duration-500"
            disabled={!!regexError}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
