/**
 * @file ErrorBoundary.test.tsx
 * @description Unit tests for ErrorBoundary component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";
import { testAccessibility } from "./test/utils";

// Mock error component that throws an error
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in tests
const mockConsoleError = vi.fn();
beforeEach(() => {
  console.error = mockConsoleError;
  mockConsoleError.mockClear();
});

describe("ErrorBoundary", () => {
  it("should render children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Child component</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Child component")).toBeInTheDocument();
  });

  it("should render error UI when child component throws", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });

  it("should display retry button", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("should display report button", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(
      screen.getByRole("button", { name: /report issue/i })
    ).toBeInTheDocument();
  });

  it("should retry rendering when retry button is clicked", async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;

    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Should show error UI
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();

    // Fix the error condition
    shouldThrow = false;

    // Click retry
    const retryButton = screen.getByRole("button", { name: /try again/i });
    await user.click(retryButton);

    // Should render children again
    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("should handle report issue button click", async () => {
    const user = userEvent.setup();

    // Mock clipboard API
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reportButton = screen.getByRole("button", { name: /report issue/i });
    await user.click(reportButton);

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining("Test error")
    );
  });

  it("should handle clipboard failure gracefully", async () => {
    const user = userEvent.setup();

    // Mock clipboard API to fail
    const mockWriteText = vi
      .fn()
      .mockRejectedValue(new Error("Clipboard failed"));
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reportButton = screen.getByRole("button", { name: /report issue/i });

    // Should not throw when clipboard fails
    await expect(user.click(reportButton)).resolves.not.toThrow();
  });

  it("should display error details in development mode", () => {
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Error Details/)).toBeInTheDocument();
    expect(screen.getByText(/Test error/)).toBeInTheDocument();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it("should hide error details in production mode", () => {
    // Mock production environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByText(/Error Details/)).not.toBeInTheDocument();

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it("should log error to console", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      "ErrorBoundary caught an error:",
      expect.any(Error),
      expect.any(Object)
    );
  });

  it("should store error in localStorage", () => {
    const mockSetItem = vi.fn();
    const mockGetItem = vi.fn().mockReturnValue("[]");

    Object.defineProperty(window, "localStorage", {
      value: {
        setItem: mockSetItem,
        getItem: mockGetItem,
      },
    });

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockSetItem).toHaveBeenCalledWith(
      "errorBoundaryErrors",
      expect.stringContaining("Test error")
    );
  });

  it("should handle localStorage errors gracefully", () => {
    const mockSetItem = vi.fn().mockImplementation(() => {
      throw new Error("Storage failed");
    });
    const mockGetItem = vi.fn().mockReturnValue("[]");

    Object.defineProperty(window, "localStorage", {
      value: {
        setItem: mockSetItem,
        getItem: mockGetItem,
      },
    });

    // Should not throw when localStorage fails
    expect(() => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    }).not.toThrow();
  });

  it("should support custom fallback UI", () => {
    const CustomFallback = ({ error, retry }: any) => (
      <div>
        <h1>Custom Error UI</h1>
        <p>{error.message}</p>
        <button onClick={retry}>Custom Retry</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom Error UI")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Custom Retry" })
    ).toBeInTheDocument();
  });

  it("should reset error state when children change", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should show error UI
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();

    // Render different children
    rerender(
      <ErrorBoundary>
        <div>New child</div>
      </ErrorBoundary>
    );

    // Should render new children
    expect(screen.getByText("New child")).toBeInTheDocument();
  });

  it("should be accessible", async () => {
    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    await testAccessibility(container);
  });

  it("should handle multiple errors", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // First error
    expect(screen.getByText(/Test error/)).toBeInTheDocument();

    // Render component that throws different error
    const ThrowDifferentError = () => {
      throw new Error("Different error");
    };

    rerender(
      <ErrorBoundary>
        <ThrowDifferentError />
      </ErrorBoundary>
    );

    // Should show new error
    expect(screen.getByText(/Different error/)).toBeInTheDocument();
  });

  it("should handle errors in event handlers", async () => {
    const user = userEvent.setup();

    const ComponentWithErrorInHandler = () => {
      const handleClick = () => {
        throw new Error("Handler error");
      };

      return <button onClick={handleClick}>Click me</button>;
    };

    render(
      <ErrorBoundary>
        <ComponentWithErrorInHandler />
      </ErrorBoundary>
    );

    const button = screen.getByRole("button", { name: "Click me" });

    // Event handler errors are not caught by error boundaries
    // This test ensures the boundary doesn't interfere with normal operation
    await expect(user.click(button)).rejects.toThrow("Handler error");
  });

  it("should provide error context information", () => {
    const ComponentWithInfo = () => {
      throw new Error("Component error");
    };

    render(
      <ErrorBoundary>
        <ComponentWithInfo />
      </ErrorBoundary>
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      "ErrorBoundary caught an error:",
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });
});
