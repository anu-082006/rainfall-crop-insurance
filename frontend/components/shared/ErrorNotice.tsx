"use client";

/**
 * ErrorNotice.tsx
 * Reusable inline error display component.
 * Upgraded to InsurTech dark theme with glowing borders and backdrop blur.
 * Used throughout the app to show plain-language error messages (RPD section 9).
 * Never renders null values, zeros or made-up data on error — only the message.
 */

import React from "react";

interface ErrorNoticeProps {
  /** The error message to display. Renders nothing if null or empty. */
  message: string | null | undefined;
  /** Optional heading above the message */
  title?: string;
  /** Visual variant */
  variant?: "error" | "warning" | "info";
  /** Additional CSS classes */
  className?: string;
}

const VARIANT_STYLES = {
  error: {
    container: "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 shadow-md",
    icon: "text-rose-600 dark:text-rose-400",
    title: "text-rose-900 dark:text-rose-100 font-bold",
  },
  warning: {
    container: "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 shadow-md",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-100 font-bold",
  },
  info: {
    container: "bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-200 shadow-md",
    icon: "text-cyan-600 dark:text-cyan-400",
    title: "text-cyan-900 dark:text-cyan-100 font-bold",
  },
};

export default function ErrorNotice({
  message,
  title,
  variant = "error",
  className = "",
}: ErrorNoticeProps) {
  if (!message) return null;

  const styles = VARIANT_STYLES[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-xl p-4 text-sm ${styles.container} ${className}`}
    >
      {/* Icon */}
      <svg
        className={`mt-0.5 h-5 w-5 flex-shrink-0 ${styles.icon}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden
      >
        {variant === "info" ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        )}
      </svg>

      <div className="flex-1 min-w-0">
        {title && (
          <p className={`mb-1 ${styles.title}`}>{title}</p>
        )}
        <p className="break-words leading-relaxed text-slate-300">{message}</p>
      </div>
    </div>
  );
}
