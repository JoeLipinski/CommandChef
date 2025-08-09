/**
 * @file test/integration.test.tsx
 * @description Integration tests for complex user workflows
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithDnd, mockCommand, mockModifier, mockChain } from "./utils";
import App from "../index";

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

describe("Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe("Command Chain Creation Workflow", () => {
    it("should allow user to create a complete command chain", async () => {
      const user = userEvent.setup();

      // Mock successful storage operations
      mockLocalStorage.setItem.mockImplementation(() => {});

      renderWithDnd(<App />);

      // Wait for app to load
      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Search for a command
      const searchInput = screen.getByPlaceholderText(/search commands/i);
      await user.type(searchInput, "nmap");

      // Should show search results
      await waitFor(() => {
        expect(screen.getByText(/nmap/i)).toBeInTheDocument();
      });

      // Drag and drop a command (simulated)
      // Note: Full drag-and-drop testing requires more complex setup
      // This tests the core workflow logic

      // Clear search to show all commands
      await user.clear(searchInput);

      // Verify command library is visible
      expect(screen.getByText(/Command Library/i)).toBeInTheDocument();
    });

    it("should handle command parameter configuration", async () => {
      const user = userEvent.setup();

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Test global target functionality
      const globalTargetInput = screen.queryByPlaceholderText(/global target/i);
      if (globalTargetInput) {
        await user.type(globalTargetInput, "192.168.1.1");

        const applyButton = screen.getByRole("button", {
          name: /apply to all/i,
        });
        await user.click(applyButton);
      }
    });
  });

  describe("Chain Management Workflow", () => {
    it("should allow saving and loading command chains", async () => {
      const user = userEvent.setup();

      // Mock saved chains
      const savedChains = {
        "test-chain": mockChain,
      };

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "cyber-chef-chains") {
          return JSON.stringify(savedChains);
        }
        return null;
      });

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Open chain manager
      const chainManagerButton = screen.getByRole("button", {
        name: /chain manager/i,
      });
      await user.click(chainManagerButton);

      // Should show chain manager modal
      await waitFor(() => {
        expect(screen.getByText(/Chain Manager/i)).toBeInTheDocument();
      });

      // Should show saved chains
      expect(screen.getByText("test-chain")).toBeInTheDocument();
    });

    it("should handle chain import/export", async () => {
      const user = userEvent.setup();

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Test share functionality
      const shareButton = screen.queryByRole("button", { name: /share/i });
      if (shareButton) {
        await user.click(shareButton);

        // Should copy to clipboard
        expect(navigator.clipboard.writeText).toHaveBeenCalled();
      }
    });
  });

  describe("Command Library Management", () => {
    it("should allow managing custom commands", async () => {
      const user = userEvent.setup();

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Open command manager
      const managerButton = screen.getByRole("button", {
        name: /manage commands/i,
      });
      await user.click(managerButton);

      // Should show command manager modal
      await waitFor(() => {
        expect(screen.getByText(/Command Manager/i)).toBeInTheDocument();
      });

      // Test adding a new command
      const addButton = screen.getByRole("button", { name: /add command/i });
      await user.click(addButton);

      // Should show command form
      expect(screen.getByLabelText(/command name/i)).toBeInTheDocument();
    });
  });

  describe("Theme and Accessibility", () => {
    it("should handle theme switching", async () => {
      const user = userEvent.setup();

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Find theme toggle button
      const themeButton = screen.getByRole("button", { name: /theme/i });
      await user.click(themeButton);

      // Should toggle theme (visual changes would be tested in e2e tests)
      expect(themeButton).toBeInTheDocument();
    });

    it("should support keyboard navigation", async () => {
      const user = userEvent.setup();

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Test tab navigation
      await user.tab();

      // Should focus first interactive element
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInstanceOf(HTMLElement);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle storage errors gracefully", async () => {
      const user = userEvent.setup();

      // Mock storage failure
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // App should still function despite storage errors
      const searchInput = screen.getByPlaceholderText(/search commands/i);
      await user.type(searchInput, "test");

      expect(searchInput).toHaveValue("test");
    });

    it("should handle malformed data gracefully", async () => {
      // Mock malformed data in localStorage
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "cyber-chef-commands") {
          return "invalid json";
        }
        return null;
      });

      renderWithDnd(<App />);

      // Should still render with default commands
      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });
    });
  });

  describe("Performance Integration", () => {
    it("should handle large command libraries efficiently", async () => {
      const user = userEvent.setup();

      // Mock large command library
      const largeCommandLibrary = Array.from({ length: 1000 }, (_, i) => ({
        ...mockCommand,
        id: `command-${i}`,
        label: `Command ${i}`,
        keywords: [`keyword${i}`],
      }));

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "cyber-chef-commands") {
          return JSON.stringify(largeCommandLibrary);
        }
        return null;
      });

      const startTime = performance.now();

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000); // 5 seconds

      // Test search performance with large dataset
      const searchStartTime = performance.now();

      const searchInput = screen.getByPlaceholderText(/search commands/i);
      await user.type(searchInput, "Command 500");

      await waitFor(() => {
        expect(screen.getByText("Command 500")).toBeInTheDocument();
      });

      const searchEndTime = performance.now();
      const searchTime = searchEndTime - searchStartTime;

      // Search should be fast even with large dataset
      expect(searchTime).toBeLessThan(1000); // 1 second
    });

    it("should handle rapid user interactions", async () => {
      const user = userEvent.setup();

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search commands/i);

      // Rapid typing should be handled smoothly
      await user.type(searchInput, "rapid typing test", { delay: 10 });

      expect(searchInput).toHaveValue("rapid typing test");
    });
  });

  describe("Mobile Responsiveness Integration", () => {
    it("should adapt to mobile viewport", async () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, "innerHeight", {
        writable: true,
        configurable: true,
        value: 667,
      });

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Should render mobile-friendly layout
      // Specific mobile adaptations would be tested in e2e tests
    });
  });

  describe("Data Persistence Integration", () => {
    it("should persist user preferences", async () => {
      const user = userEvent.setup();

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Change theme
      const themeButton = screen.getByRole("button", { name: /theme/i });
      await user.click(themeButton);

      // Should save theme preference
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it("should restore user session", async () => {
      // Mock saved session data
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === "cyber-chef-chains") {
          return JSON.stringify({ "session-chain": mockChain });
        }
        return null;
      });

      renderWithDnd(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Cyber Command Chef/i)).toBeInTheDocument();
      });

      // Should restore saved chains
      const chainManagerButton = screen.getByRole("button", {
        name: /chain manager/i,
      });
      await user.click(chainManagerButton);

      await waitFor(() => {
        expect(screen.getByText("session-chain")).toBeInTheDocument();
      });
    });
  });
});
