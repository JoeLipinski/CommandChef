/**
 * @file AccessibleTooltip.tsx
 * @description Accessible tooltip component with proper ARIA support
 */

import React, { useState, useRef, useEffect } from "react";
import { AriaUtils } from "./utils/accessibility";

interface AccessibleTooltipProps {
  content: string;
  children: React.ReactElement;
  placement?: "top" | "bottom" | "left" | "right";
  delay?: number;
  disabled?: boolean;
}

export function AccessibleTooltip({
  content,
  children,
  placement = "top",
  delay = 500,
  disabled = false,
}: AccessibleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipId] = useState(() => AriaUtils.generateId("tooltip"));
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (disabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Clone the child element and add tooltip props
  const childElement = React.cloneElement(children, {
    "aria-describedby": isVisible ? tooltipId : undefined,
    onMouseEnter: (e: React.MouseEvent) => {
      showTooltip();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hideTooltip();
      children.props.onMouseLeave?.(e);
    },
    onFocus: (e: React.FocusEvent) => {
      showTooltip();
      children.props.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent) => {
      hideTooltip();
      children.props.onBlur?.(e);
    },
  });

  const getTooltipClasses = () => {
    const baseClasses = `
      absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 dark:bg-gray-100 
      dark:text-gray-900 rounded shadow-lg pointer-events-none transition-opacity duration-200
    `;

    const placementClasses = {
      top: "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
      bottom: "top-full left-1/2 transform -translate-x-1/2 mt-2",
      left: "right-full top-1/2 transform -translate-y-1/2 mr-2",
      right: "left-full top-1/2 transform -translate-y-1/2 ml-2",
    };

    return `${baseClasses} ${placementClasses[placement]} ${
      isVisible ? "opacity-100" : "opacity-0"
    }`;
  };

  return (
    <div className="relative inline-block">
      {childElement}
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={getTooltipClasses()}
          aria-hidden={!isVisible}
        >
          {content}
          {/* Arrow */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 transform rotate-45 ${
              placement === "top"
                ? "top-full left-1/2 -translate-x-1/2 -mt-1"
                : placement === "bottom"
                ? "bottom-full left-1/2 -translate-x-1/2 -mb-1"
                : placement === "left"
                ? "left-full top-1/2 -translate-y-1/2 -ml-1"
                : "right-full top-1/2 -translate-y-1/2 -mr-1"
            }`}
          />
        </div>
      )}
    </div>
  );
}
