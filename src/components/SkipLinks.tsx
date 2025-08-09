/**
 * @file SkipLinks.tsx
 * @description Skip navigation links for keyboard users
 */

import React from "react";

export function SkipLinks() {
  return (
    <div className="sr-only">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <a href="#command-library" className="skip-link">
        Skip to command library
      </a>
      <a href="#command-chain" className="skip-link">
        Skip to command chain
      </a>
      <a href="#search" className="skip-link">
        Skip to search
      </a>
    </div>
  );
}
