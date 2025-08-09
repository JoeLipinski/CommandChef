/**
 * @file types/errors.ts
 * @description Type definitions for error handling and validation
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ErrorContext {
  component?: string;
  action?: string;
  data?: any;
  timestamp: number;
  userAgent?: string;
  url?: string;
}

export interface AppError extends Error {
  code: string;
  context?: ErrorContext;
  recoverable?: boolean;
  userMessage?: string;
}

export interface ErrorState {
  hasError: boolean;
  error?: AppError;
  errorId?: string;
  canRecover?: boolean;
}

export interface NotificationState {
  id: string;
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  timestamp: number;
  dismissible?: boolean;
  autoHide?: boolean;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorReport {
  id: string;
  error: AppError;
  severity: ErrorSeverity;
  context: ErrorContext;
  stackTrace?: string;
  userActions?: string[];
  resolved?: boolean;
}