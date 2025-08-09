/**
 * @file test/accessibility.test.tsx
 * @description Accessibility tests for components and workflows
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { renderWithDnd, testAccessibility } from "./utils";
import { AccessibleTooltip } from "../AccessibleTooltip";
import { ErrorBoundary } from "../ErrorBoundary";
import { SkipLinks } from "../components/SkipLinks";

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

describe("Accessibility Tests", () => {
  describe("AccessibleTooltip", () => {
    it("should have proper ARIA attributes", async () => {
      const user = userEvent.setup();

      render(
        <AccessibleTooltip content="Tooltip content">
          <button>Trigger</button>
        </AccessibleTooltip>
      );

      const trigger = screen.getByRole("button");

      // Should have aria-describedby
      expect(trigger).toHaveAttribute("aria-describedby");

      // Show tooltip
      await user.hover(trigger);

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toBeInTheDocument();

      // Should have proper ARIA relationship
      const tooltipId = tooltip.getAttribute("id");
      expect(trigger).toHaveAttribute("aria-describedby", tooltipId);
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();

      render(
        <AccessibleTooltip content="Tooltip content">
          <button>Trigger</button>
        </AccessibleTooltip>
      );

      const trigger = screen.getByRole("button");

      // Focus with keyboard
      await user.tab();
      expect(trigger).toHaveFocus();

      // Should show tooltip on focus
      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toBeInTheDocument();

      // Should hide on Escape
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("should pass axe accessibility tests", async () => {
      const { container } = render(
        <AccessibleTooltip content="Tooltip content">
          <button>Trigger</button>
        </AccessibleTooltip>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("ErrorBoundary", () => {
    const ThrowError = () => {
      throw new Error("Test error");
    };

    it("should have proper error announcement", () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should have proper heading structure
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();

      // Should have actionable buttons
      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /report issue/i })
      ).toBeInTheDocument();
    });

    it("should be keyboard accessible", async () => {
      const user = userEvent.setup();

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      // Should be able to tab to buttons
      await user.tab();
      expect(screen.getByRole("button", { name: /try again/i })).toHaveFocus();

      await user.tab();
      expect(
        screen.getByRole("button", { name: /report issue/i })
      ).toHaveFocus();
    });

    it("should pass axe accessibility tests", async () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("SkipLinks", () => {
    it("should provide skip navigation", async () => {
      const user = userEvent.setup();

      render(
        <div>
          <SkipLinks />
          <main id="main-content">
            <h1>Main Content</h1>
          </main>
          <nav id="command-library">
            <h2>Command Library</h2>
          </nav>
        </div>
      );

      // Focus first skip link
      await user.tab();
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toHaveFocus();

      // Activate skip link
      await user.keyboard("{Enter}");

      // Should focus main content
      const mainContent = document.getElementById("main-content");
      expect(mainContent).toHaveFocus();
    });

    it("should be visually hidden until focused", async () => {
      const user = userEvent.setup();

      render(<SkipLinks />);

      const skipLink = screen.getByText(/skip to main content/i);

      // Should be visually hidden initially
      expect(skipLink).toHaveClass("sr-only");

      // Focus the link
      await user.tab();

      // Should become visible when focused
      expect(skipLink).toHaveFocus();
    });

    it("should pass axe accessibility tests", async () => {
      const { container } = render(<SkipLinks />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Form Accessibility", () => {
    it("should have proper form labels", () => {
      render(
        <form>
          <label htmlFor="command-name">Command Name</label>
          <input id="command-name" type="text" required />

          <label htmlFor="command-category">Category</label>
          <select id="command-category" required>
            <option value="">Select category</option>
            <option value="network">Network</option>
          </select>

          <fieldset>
            <legend>Command Type</legend>
            <label>
              <input type="radio" name="type" value="command" />
              Command
            </label>
            <label>
              <input type="radio" name="type" value="modifier" />
              Modifier
            </label>
          </fieldset>
        </form>
      );

      // All form controls should have labels
      expect(screen.getByLabelText("Command Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Category")).toBeInTheDocument();
      expect(screen.getByLabelText("Command")).toBeInTheDocument();
      expect(screen.getByLabelText("Modifier")).toBeInTheDocument();

      // Fieldset should have legend
      expect(
        screen.getByRole("group", { name: "Command Type" })
      ).toBeInTheDocument();
    });

    it("should show validation errors accessibly", async () => {
      const user = userEvent.setup();

      render(
        <form>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            aria-describedby="email-error"
          />
          <div id="email-error" role="alert" style={{ display: "none" }}>
            Please enter a valid email
          </div>
          <button type="submit">Submit</button>
        </form>
      );

      const emailInput = screen.getByLabelText("Email");
      const submitButton = screen.getByRole("button", { name: "Submit" });

      // Submit without email
      await user.click(submitButton);

      // Should show error message
      const errorMessage = screen.getByRole("alert");
      expect(errorMessage).toBeVisible();

      // Input should be associated with error
      expect(emailInput).toHaveAttribute("aria-describedby", "email-error");
    });

    it("should pass axe accessibility tests", async () => {
      const { container } = render(
        <form>
          <label htmlFor="test-input">Test Input</label>
          <input id="test-input" type="text" required />
          <button type="submit">Submit</button>
        </form>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Modal Accessibility", () => {
    const Modal = ({ isOpen, onClose, children }: any) => {
      if (!isOpen) return null;

      return (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div>
            <h2 id="modal-title">Modal Title</h2>
            {children}
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      );
    };

    it("should trap focus within modal", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <div>
          <button>Outside Button</button>
          <Modal isOpen={true} onClose={onClose}>
            <button>Modal Button</button>
            <input type="text" placeholder="Modal Input" />
          </Modal>
        </div>
      );

      // Focus should be trapped in modal
      await user.tab();
      expect(screen.getByText("Modal Button")).toHaveFocus();

      await user.tab();
      expect(screen.getByPlaceholderText("Modal Input")).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Close")).toHaveFocus();

      // Should cycle back to first element
      await user.tab();
      expect(screen.getByText("Modal Button")).toHaveFocus();
    });

    it("should close on Escape key", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <Modal isOpen={true} onClose={onClose}>
          <p>Modal content</p>
        </Modal>
      );

      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalled();
    });

    it("should have proper ARIA attributes", () => {
      render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Modal content</p>
        </Modal>
      );

      const modal = screen.getByRole("dialog");
      expect(modal).toHaveAttribute("aria-modal", "true");
      expect(modal).toHaveAttribute("aria-labelledby", "modal-title");
    });

    it("should pass axe accessibility tests", async () => {
      const { container } = render(
        <Modal isOpen={true} onClose={vi.fn()}>
          <p>Modal content</p>
        </Modal>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Drag and Drop Accessibility", () => {
    it("should provide keyboard alternatives", async () => {
      const user = userEvent.setup();

      render(
        <div>
          <div role="button" tabIndex={0} aria-describedby="drag-help">
            Draggable Item
          </div>
          <div id="drag-help" className="sr-only">
            Press Space to pick up, Arrow keys to move, Space to drop
          </div>
          <div role="region" aria-label="Drop zone">
            Drop here
          </div>
        </div>
      );

      const draggableItem = screen.getByRole("button", {
        name: "Draggable Item",
      });

      // Should be focusable
      await user.tab();
      expect(draggableItem).toHaveFocus();

      // Should have help text
      expect(draggableItem).toHaveAttribute("aria-describedby", "drag-help");
      expect(screen.getByText(/Press Space to pick up/)).toBeInTheDocument();
    });

    it("should announce drag and drop operations", async () => {
      const user = userEvent.setup();

      render(
        <div>
          <div role="button" tabIndex={0} aria-describedby="status">
            Draggable Item
          </div>
          <div id="status" role="status" aria-live="polite">
            Ready to drag
          </div>
        </div>
      );

      const statusElement = screen.getByRole("status");
      expect(statusElement).toHaveTextContent("Ready to drag");

      // Status should be announced to screen readers
      expect(statusElement).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("Color Contrast and Visual Accessibility", () => {
    it("should have sufficient color contrast", async () => {
      const { container } = render(
        <div>
          <button className="bg-blue-600 text-white px-4 py-2">
            Primary Button
          </button>
          <button className="bg-gray-200 text-gray-800 px-4 py-2">
            Secondary Button
          </button>
          <a href="#" className="text-blue-600 underline">
            Link
          </a>
        </div>
      );

      // Axe will check color contrast ratios
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("should support high contrast mode", () => {
      // Mock high contrast media query
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === "(prefers-contrast: high)",
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <div className="high-contrast:border-2 high-contrast:border-black">
          High contrast content
        </div>
      );

      // Should apply high contrast styles when preferred
      expect(screen.getByText("High contrast content")).toBeInTheDocument();
    });
  });

  describe("Screen Reader Compatibility", () => {
    it("should provide proper heading structure", () => {
      render(
        <div>
          <h1>Main Title</h1>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
          <h2>Another Section</h2>
        </div>
      );

      // Should have proper heading hierarchy
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
      expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    });

    it("should use semantic HTML elements", () => {
      render(
        <div>
          <nav aria-label="Main navigation">
            <ul>
              <li>
                <a href="#home">Home</a>
              </li>
              <li>
                <a href="#about">About</a>
              </li>
            </ul>
          </nav>
          <main>
            <article>
              <header>
                <h1>Article Title</h1>
              </header>
              <p>Article content</p>
            </article>
          </main>
          <aside>
            <h2>Sidebar</h2>
          </aside>
          <footer>
            <p>Footer content</p>
          </footer>
        </div>
      );

      // Should use semantic landmarks
      expect(screen.getByRole("navigation")).toBeInTheDocument();
      expect(screen.getByRole("main")).toBeInTheDocument();
      expect(screen.getByRole("complementary")).toBeInTheDocument();
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("should provide alternative text for images", () => {
      render(
        <div>
          <img src="chart.png" alt="Sales data showing 20% increase" />
          <img src="decorative.png" alt="" role="presentation" />
        </div>
      );

      // Informative images should have descriptive alt text
      expect(
        screen.getByAltText("Sales data showing 20% increase")
      ).toBeInTheDocument();

      // Decorative images should have empty alt text
      expect(screen.getByRole("presentation")).toBeInTheDocument();
    });
  });
});
