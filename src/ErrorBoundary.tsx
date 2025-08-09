/**
 * @file ErrorBoundary.tsx
 * @description Enhanced error boundary component with comprehensive error handling and recovery
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Bug, Copy, CheckCircle } from "lucide-react";
import { errorHandler } from "./utils/errorHandler";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only shows minimal error without affecting parent components
  retryable?: boolean; // If true, shows retry button
  name?: string; // Component name for better error reporting
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
  retryCount: number;
  copied: boolean;
}

/**
 * Enhanced error boundary component that catches JavaScript errors anywhere in the child component tree
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error logging and reporting
    const componentName = this.props.name || "Unknown Component";

    console.group(`🚨 Error Boundary: ${componentName}`);
    console.error("Error:", error);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("Error Boundary Props:", this.props);
    console.groupEnd();

    // Create comprehensive error report
    const appError = errorHandler.createAppError(
      error,
      "REACT_ERROR_BOUNDARY",
      {
        component: componentName,
        action: "Component render",
        data: {
          componentStack: errorInfo.componentStack,
          retryCount: this.state.retryCount,
          props: this.props.name ? { name: this.props.name } : undefined,
        },
      },
      `An error occurred in the ${componentName} component. Please try refreshing or contact support if the issue persists.`,
      this.props.retryable !== false
    );

    const errorId = errorHandler.handleError(appError, "high");

    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error("Error in custom error handler:", handlerError);
      }
    }

    // Report to external monitoring service
    this.reportToMonitoring(error, errorInfo, errorId);
  }

  private reportToMonitoring(
    error: Error,
    errorInfo: ErrorInfo,
    errorId: string
  ) {
    // In a real application, this would send to services like Sentry, LogRocket, etc.
    if (typeof window !== "undefined") {
      // Check for global error reporting function
      if ((window as any).reportError) {
        (window as any).reportError({
          error,
          errorInfo,
          errorId,
          component: this.props.name,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      }

      // Store error in session storage for debugging
      try {
        const errorData = {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          errorId,
          timestamp: Date.now(),
        };

        const existingErrors = JSON.parse(
          sessionStorage.getItem("errorBoundaryErrors") || "[]"
        );
        existingErrors.push(errorData);

        // Keep only last 10 errors
        if (existingErrors.length > 10) {
          existingErrors.splice(0, existingErrors.length - 10);
        }

        sessionStorage.setItem(
          "errorBoundaryErrors",
          JSON.stringify(existingErrors)
        );
      } catch (storageError) {
        console.warn("Could not store error in session storage:", storageError);
      }
    }
  }

  private handleRetry = () => {
    const maxRetries = 3;

    if (this.state.retryCount >= maxRetries) {
      // Force page refresh after max retries
      window.location.reload();
      return;
    }

    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      retryCount: prevState.retryCount + 1,
      copied: false,
    }));

    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Reset retry count after successful render (no error for 10 seconds)
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ retryCount: 0 });
    }, 10000);
  };

  private handleCopyError = async () => {
    if (!this.state.error || !this.state.errorInfo) return;

    const errorDetails = {
      message: this.state.error.message,
      stack: this.state.error.stack,
      componentStack: this.state.errorInfo.componentStack,
      errorId: this.state.errorId,
      component: this.props.name,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
    };

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(errorDetails, null, 2)
      );
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (clipboardError) {
      console.error("Failed to copy error details:", clipboardError);
      // Fallback: log to console for manual copying
      console.log("Error details for manual copying:", errorDetails);
    }
  };

  private renderMinimalError() {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-sm text-red-700 dark:text-red-300">
            Component failed to load
          </span>
          {this.props.retryable !== false && (
            <button
              onClick={this.handleRetry}
              className="ml-auto text-xs bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 px-2 py-1 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  private renderFullError() {
    const maxRetries = 3;
    const canRetry =
      this.props.retryable !== false && this.state.retryCount < maxRetries;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <div className="flex items-center mb-6">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Application Error
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {this.props.name
                  ? `Error in ${this.props.name}`
                  : "Something went wrong"}
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              An unexpected error occurred.{" "}
              {canRetry
                ? "You can try again or refresh the page."
                : "Please refresh the page to continue."}
            </p>

            {this.state.errorId && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Error ID:{" "}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                  {this.state.errorId}
                </code>
              </p>
            )}

            {this.state.retryCount > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                Retry attempt: {this.state.retryCount}/{maxRetries}
              </p>
            )}
          </div>

          {/* Development error details */}
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mb-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
              <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center">
                <Bug className="w-4 h-4 mr-2" />
                Error Details (Development)
              </summary>
              <div className="mt-3 space-y-2">
                <div>
                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Message:
                  </h4>
                  <pre className="text-xs text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 p-2 rounded border overflow-auto">
                    {this.state.error.message}
                  </pre>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    Stack Trace:
                  </h4>
                  <pre className="text-xs text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 p-2 rounded border overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </div>
                {this.state.errorInfo?.componentStack && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Component Stack:
                    </h4>
                    <pre className="text-xs text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 p-2 rounded border overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </button>

            <button
              onClick={this.handleCopyError}
              className="flex items-center justify-center px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
            >
              {this.state.copied ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Error
                </>
              )}
            </button>
          </div>

          {/* Help text */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              If this error persists, please copy the error details and report
              it to support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Minimal error for isolated components
      if (this.props.isolate) {
        return this.renderMinimalError();
      }

      // Full error page
      return this.renderFullError();
    }

    return this.props.children;
  }
}
