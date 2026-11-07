"use client";

/**
 * LoadingSpinner.tsx
 * Reusable loading state component (M3-NF01: every async action has a loading state).
 * Upgraded to InsurTech dark palette with emerald glowing spinner and Geist typography.
 */

import React from "react";

interface LoadingSpinnerProps {
  /** Message shown next to the spinner */
  message?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Center the spinner in its container */
  centered?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-10 w-10",
};

const TEXT_SIZE_CLASSES = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base font-medium",
};

export default function LoadingSpinner({
  message = "Loading…",
  size = "md",
  centered = false,
  className = "",
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={message}
      className={`flex items-center gap-3 text-slate-400 ${centered ? "justify-center" : ""} ${className}`}
    >
      <svg
        className={`animate-spin flex-shrink-0 text-emerald-400 ${SIZE_CLASSES[size]}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle
          className="opacity-20 text-slate-600"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3.5"
        />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        />
      </svg>
      {message && (
        <span className={`${TEXT_SIZE_CLASSES[size]} tracking-wide text-slate-300 font-mono`}>{message}</span>
      )}
    </div>
  );
}
