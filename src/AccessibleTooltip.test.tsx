/**
 * @file AccessibleTooltip.test.tsx
 * @description Unit tests for AccessibleTooltip component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessibleTooltip } from "./AccessibleTooltip";
import { testAccessibility } from "./test/utils";

describe("AccessibleTooltip", () => {
  const defaultProps = {
    content: "This is a tooltip",
    children: <button>Hover me</button>,
  };

  it("should render children correctly", () => {
    render(<AccessibleTooltip {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: "Hover me" })
    ).toBeInTheDocument();
  });

  it("should show tooltip on hover", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} />);

    const trigger = screen.getByRole("button");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("This is a tooltip")).toBeInTheDocument();
    });
  });

  it("should hide tooltip on mouse leave", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} />);

    const trigger = screen.getByRole("button");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("This is a tooltip")).toBeInTheDocument();
    });

    await user.unhover(trigger);

    await waitFor(() => {
      expect(screen.queryByText("This is a tooltip")).not.toBeInTheDocument();
    });
  });

  it("should show tooltip on focus", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} />);

    const trigger = screen.getByRole("button");
    await user.tab(); // Focus the button

    await waitFor(() => {
      expect(screen.getByText("This is a tooltip")).toBeInTheDocument();
    });
  });

  it("should hide tooltip on blur", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} />);

    const trigger = screen.getByRole("button");
    await user.tab(); // Focus the button

    await waitFor(() => {
      expect(screen.getByText("This is a tooltip")).toBeInTheDocument();
    });

    await user.tab(); // Move focus away

    await waitFor(() => {
      expect(screen.queryByText("This is a tooltip")).not.toBeInTheDocument();
    });
  });

  it("should hide tooltip on Escape key", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} />);

    const trigger = screen.getByRole("button");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("This is a tooltip")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByText("This is a tooltip")).not.toBeInTheDocument();
    });
  });

  it("should have proper ARIA attributes", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} />);

    const trigger = screen.getByRole("button");

    // Should have aria-describedby when tooltip is hidden
    expect(trigger).toHaveAttribute("aria-describedby");

    await user.hover(trigger);

    await waitFor(() => {
      const tooltip = screen.getByText("This is a tooltip");
      expect(tooltip).toHaveAttribute("role", "tooltip");
      expect(tooltip).toHaveAttribute("id");

      const tooltipId = tooltip.getAttribute("id");
      expect(trigger).toHaveAttribute("aria-describedby", tooltipId);
    });
  });

  it("should support custom positioning", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} position="left" />);

    const trigger = screen.getByRole("button");
    await user.hover(trigger);

    await waitFor(() => {
      const tooltip = screen.getByText("This is a tooltip");
      expect(tooltip).toHaveClass("left-0");
    });
  });

  it("should support delay prop", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    render(<AccessibleTooltip {...defaultProps} delay={500} />);

    const trigger = screen.getByRole("button");
    await user.hover(trigger);

    // Should not show immediately
    expect(screen.queryByText("This is a tooltip")).not.toBeInTheDocument();

    // Advance timers
    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(screen.getByText("This is a tooltip")).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("should support disabled state", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} disabled={true} />);

    const trigger = screen.getByRole("button");
    await user.hover(trigger);

    // Should not show tooltip when disabled
    await waitFor(
      () => {
        expect(screen.queryByText("This is a tooltip")).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it("should handle complex content", async () => {
    const user = userEvent.setup();
    const complexContent = (
      <div>
        <strong>Bold text</strong>
        <p>Paragraph text</p>
      </div>
    );

    render(
      <AccessibleTooltip
        content={complexContent}
        children={<button>Hover me</button>}
      />
    );

    const trigger = screen.getByRole("button");
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("Bold text")).toBeInTheDocument();
      expect(screen.getByText("Paragraph text")).toBeInTheDocument();
    });
  });

  it("should be accessible", async () => {
    const { container } = render(<AccessibleTooltip {...defaultProps} />);
    await testAccessibility(container);
  });

  it("should handle rapid hover events", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} />);

    const trigger = screen.getByRole("button");

    // Rapid hover/unhover
    await user.hover(trigger);
    await user.unhover(trigger);
    await user.hover(trigger);

    await waitFor(() => {
      expect(screen.getByText("This is a tooltip")).toBeInTheDocument();
    });
  });

  it("should clean up event listeners on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    const { unmount } = render(<AccessibleTooltip {...defaultProps} />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  it("should handle touch events on mobile", async () => {
    render(<AccessibleTooltip {...defaultProps} />);

    const trigger = screen.getByRole("button");

    // Simulate touch start
    fireEvent.touchStart(trigger);

    await waitFor(() => {
      expect(screen.getByText("This is a tooltip")).toBeInTheDocument();
    });

    // Simulate touch end
    fireEvent.touchEnd(trigger);

    await waitFor(() => {
      expect(screen.queryByText("This is a tooltip")).not.toBeInTheDocument();
    });
  });

  it("should support custom className", async () => {
    const user = userEvent.setup();
    render(<AccessibleTooltip {...defaultProps} className="custom-tooltip" />);

    const trigger = screen.getByRole("button");
    await user.hover(trigger);

    await waitFor(() => {
      const tooltip = screen.getByText("This is a tooltip");
      expect(tooltip).toHaveClass("custom-tooltip");
    });
  });
});
