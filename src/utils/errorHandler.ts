/**
 * @file utils/errorHandler.ts
 * @description Comprehensive error handling utilities
 */

import { AppError, ErrorContext, ErrorReport, ErrorSeverity, NotificationState } from '../types/errors';

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorReports: Map<string, ErrorReport> = new Map();
  private errorListeners: Array<(error: AppError) => void> = [];
  private notificationListeners: Array<(notification: NotificationState) => void> = [];

  private constructor() {
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.createAppError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        'UNHANDLED_PROMISE_REJECTION',
        { component: 'Global', action: 'Promise rejection' }
      );
      this.handleError(error, 'high');
      event.preventDefault();
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      const error = this.createAppError(
        event.error || new Error(event.message),
        'GLOBAL_ERROR',
        { 
          component: 'Global', 
          action: 'Script error',
          data: { 
            filename: event.filename, 
            lineno: event.lineno, 
            colno: event.colno 
          }
        }
      );
      this.handleError(error, 'high');
    });
  }

  createAppError(
    originalError: Error | string,
    code: string,
    context?: Partial<ErrorContext>,
    userMessage?: string,
    recoverable: boolean = true
  ): AppError {
    const error = originalError instanceof Error 
      ? originalError 
      : new Error(String(originalError));

    const appError = error as AppError;
    appError.code = code;
    appError.recoverable = recoverable;
    appError.userMessage = userMessage;
    appError.context = {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context
    };

    return appError;
  }

  handleError(error: AppError, severity: ErrorSeverity = 'medium'): string {
    const errorId = this.generateErrorId();
    
    // Create error report
    const report: ErrorReport = {
      id: errorId,
      error,
      severity,
      context: error.context!,
      stackTrace: error.stack,
      userActions: this.getUserActions(),
      resolved: false
    };

    // Store error report
    this.errorReports.set(errorId, report);

    // Log error for debugging
    console.error(`[${severity.toUpperCase()}] Error ${errorId}:`, error);
    
    // Notify error listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    // Show user notification based on severity
    this.showErrorNotification(error, severity, errorId);

    // Clean up old error reports (keep last 100)
    if (this.errorReports.size > 100) {
      const oldestKey = this.errorReports.keys().next().value;
      this.errorReports.delete(oldestKey);
    }

    return errorId;
  }

  private showErrorNotification(error: AppError, severity: ErrorSeverity, errorId: string): void {
    const notification: NotificationState = {
      id: `error-${errorId}`,
      type: severity === 'critical' ? 'error' : 'warning',
      title: this.getErrorTitle(error, severity),
      message: error.userMessage || this.getDefaultErrorMessage(error, severity),
      timestamp: Date.now(),
      dismissible: true,
      autoHide: severity === 'low',
      duration: severity === 'low' ? 5000 : undefined,
      actions: this.getErrorActions(error, severity, errorId)
    };

    this.notificationListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (listenerError) {
        console.error('Error in notification listener:', listenerError);
      }
    });
  }

  private getErrorTitle(error: AppError, severity: ErrorSeverity): string {
    switch (severity) {
      case 'critical':
        return 'Critical Error';
      case 'high':
        return 'Error Occurred';
      case 'medium':
        return 'Something went wrong';
      case 'low':
        return 'Minor Issue';
      default:
        return 'Error';
    }
  }

  private getDefaultErrorMessage(error: AppError, severity: ErrorSeverity): string {
    switch (error.code) {
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'STORAGE_ERROR':
        return 'Unable to save data. Your changes may not be preserved.';
      case 'NETWORK_ERROR':
        return 'Network connection issue. Please check your internet connection.';
      case 'DRAG_DROP_ERROR':
        return 'Drag and drop operation failed. Please try again.';
      case 'TEMPLATE_PROCESSING_ERROR':
        return 'Error processing command template. Please check your template syntax.';
      case 'COMMAND_GENERATION_ERROR':
        return 'Unable to generate command. Please verify your configuration.';
      case 'IMPORT_EXPORT_ERROR':
        return 'Error importing or exporting data. Please check the file format.';
      default:
        return severity === 'critical' 
          ? 'A critical error occurred. Please refresh the page.'
          : 'An unexpected error occurred. Please try again.';
    }
  }

  private getErrorActions(error: AppError, severity: ErrorSeverity, errorId: string): Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }> {
    const actions = [];

    if (error.recoverable && severity !== 'critical') {
      actions.push({
        label: 'Retry',
        action: () => this.retryLastAction(errorId),
        variant: 'primary' as const
      });
    }

    if (severity === 'critical') {
      actions.push({
        label: 'Refresh Page',
        action: () => window.location.reload(),
        variant: 'primary' as const
      });
    }

    actions.push({
      label: 'Report Issue',
      action: () => this.reportError(errorId),
      variant: 'secondary' as const
    });

    return actions;
  }

  private retryLastAction(errorId: string): void {
    const report = this.errorReports.get(errorId);
    if (report && report.error.context?.action) {
      // Mark as resolved
      report.resolved = true;
      
      // Emit retry event
      window.dispatchEvent(new CustomEvent('error-retry', { 
        detail: { errorId, action: report.error.context.action } 
      }));
    }
  }

  private reportError(errorId: string): void {
    const report = this.errorReports.get(errorId);
    if (report) {
      // In a real app, this would send to an error reporting service
      console.log('Error report:', report);
      
      // For now, copy error details to clipboard
      const errorDetails = {
        id: errorId,
        message: report.error.message,
        code: report.error.code,
        context: report.context,
        timestamp: new Date(report.context.timestamp).toISOString()
      };
      
      navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
        .then(() => {
          this.showSuccessNotification('Error details copied to clipboard');
        })
        .catch(() => {
          console.log('Error details:', errorDetails);
        });
    }
  }

  private showSuccessNotification(message: string): void {
    const notification: NotificationState = {
      id: `success-${Date.now()}`,
      type: 'success',
      title: 'Success',
      message,
      timestamp: Date.now(),
      dismissible: true,
      autoHide: true,
      duration: 3000
    };

    this.notificationListeners.forEach(listener => {
      try {
        listener(notification);
      } catch (listenerError) {
        console.error('Error in notification listener:', listenerError);
      }
    });
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserActions(): string[] {
    // In a real implementation, this would track user actions
    // For now, return basic browser info
    return [
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
      `Timestamp: ${new Date().toISOString()}`
    ];
  }

  // Public methods for components to use
  onError(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  onNotification(listener: (notification: NotificationState) => void): () => void {
    this.notificationListeners.push(listener);
    return () => {
      const index = this.notificationListeners.indexOf(listener);
      if (index > -1) {
        this.notificationListeners.splice(index, 1);
      }
    };
  }

  getErrorReport(errorId: string): ErrorReport | undefined {
    return this.errorReports.get(errorId);
  }

  getAllErrorReports(): ErrorReport[] {
    return Array.from(this.errorReports.values());
  }

  clearErrorReports(): void {
    this.errorReports.clear();
  }

  // Utility methods for common error scenarios
  handleStorageError(operation: string, error: Error): string {
    const appError = this.createAppError(
      error,
      'STORAGE_ERROR',
      { component: 'Storage', action: operation },
      'Unable to save your data. Please try again or check your browser storage settings.',
      true
    );
    return this.handleError(appError, 'medium');
  }

  handleValidationError(field: string, message: string, value?: any): string {
    const appError = this.createAppError(
      new Error(`Validation failed for ${field}: ${message}`),
      'VALIDATION_ERROR',
      { component: 'Validation', action: 'Field validation', data: { field, value } },
      message,
      true
    );
    return this.handleError(appError, 'low');
  }

  handleNetworkError(operation: string, error: Error): string {
    const appError = this.createAppError(
      error,
      'NETWORK_ERROR',
      { component: 'Network', action: operation },
      'Network request failed. Please check your connection and try again.',
      true
    );
    return this.handleError(appError, 'medium');
  }

  handleDragDropError(operation: string, error: Error): string {
    const appError = this.createAppError(
      error,
      'DRAG_DROP_ERROR',
      { component: 'DragDrop', action: operation },
      'Drag and drop operation failed. Please try again.',
      true
    );
    return this.handleError(appError, 'low');
  }

  handleTemplateError(template: string, error: Error): string {
    const appError = this.createAppError(
      error,
      'TEMPLATE_PROCESSING_ERROR',
      { component: 'Template', action: 'Process template', data: { template } },
      'Error processing command template. Please check your template syntax.',
      true
    );
    return this.handleError(appError, 'medium');
  }

  handleCommandGenerationError(command: any, error: Error): string {
    const appError = this.createAppError(
      error,
      'COMMAND_GENERATION_ERROR',
      { component: 'CommandGeneration', action: 'Generate command', data: { command } },
      'Unable to generate command. Please verify your configuration.',
      true
    );
    return this.handleError(appError, 'medium');
  }

  handleImportExportError(operation: string, error: Error, data?: any): string {
    const appError = this.createAppError(
      error,
      'IMPORT_EXPORT_ERROR',
      { component: 'ImportExport', action: operation, data },
      'Error importing or exporting data. Please check the file format.',
      true
    );
    return this.handleError(appError, 'medium');
  }
}

export const errorHandler = ErrorHandler.getInstance();