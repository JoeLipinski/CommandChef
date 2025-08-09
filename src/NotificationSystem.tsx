/**
 * @file NotificationSystem.tsx
 * @description Notification system for displaying errors, warnings, and success messages
 */

import React, { useState, useEffect, useCallback } from "react";
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from "lucide-react";
import { NotificationState } from "./types/errors";
import { errorHandler } from "./utils/errorHandler";

interface NotificationSystemProps {
  maxNotifications?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

export function NotificationSystem({
  maxNotifications = 5,
  position = "top-right",
}: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<NotificationState[]>([]);

  useEffect(() => {
    const unsubscribe = errorHandler.onNotification((notification) => {
      setNotifications((prev) => {
        const newNotifications = [notification, ...prev];

        // Limit the number of notifications
        if (newNotifications.length > maxNotifications) {
          newNotifications.splice(maxNotifications);
        }

        return newNotifications;
      });

      // Auto-hide notification if specified
      if (notification.autoHide && notification.duration) {
        setTimeout(() => {
          dismissNotification(notification.id);
        }, notification.duration);
      }
    });

    return unsubscribe;
  }, [maxNotifications]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      default:
        return "top-4 right-4";
    }
  };

  const getNotificationIcon = (type: NotificationState["type"]) => {
    switch (type) {
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColors = (type: NotificationState["type"]) => {
    switch (type) {
      case "error":
        return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
      case "success":
        return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
      case "info":
        return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
      default:
        return "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800";
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed ${getPositionClasses()} z-50 space-y-2 max-w-sm w-full`}
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            ${getNotificationColors(notification.type)}
            border rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out
            transform translate-x-0 opacity-100
          `}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>

            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {notification.title}
              </h4>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {notification.message}
              </p>

              {notification.actions && notification.actions.length > 0 && (
                <div className="mt-3 flex space-x-2">
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.action();
                        if (notification.dismissible) {
                          dismissNotification(notification.id);
                        }
                      }}
                      className={`
                        text-xs px-3 py-1 rounded-md font-medium transition-colors
                        ${
                          action.variant === "primary"
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                        }
                      `}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {notification.dismissible && (
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="inline-flex text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Progress bar for auto-hide notifications */}
          {notification.autoHide && notification.duration && (
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all ease-linear"
                style={{
                  animation: `shrink ${notification.duration}ms linear forwards`,
                }}
              />
            </div>
          )}
        </div>
      ))}

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
