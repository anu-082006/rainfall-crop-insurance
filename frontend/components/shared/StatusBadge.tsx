"use client";

/**
 * StatusBadge.tsx
 *
 * Visual badge for policy status according to RPD Section 8:
 * - SCHEDULED: "Scheduled" (sky blue)
 * - ACTIVE: "Active" (primary green with pulse)
 * - AWAITING_REPORT: "Coverage ended (awaiting report)" (amber)
 * - ELIGIBLE: "Eligible" (payout readiness)
 * - NOT_ELIGIBLE: "Not eligible" (rose)
 * - CLAIMED: "Claimed" (slate)
 *
 * Upgraded to borderless shadowy floating pills with Primary Green #1a5b55.
 */

import React from "react";
import { PolicyStatusCode } from "@/lib/contract/policyStatus";

interface StatusBadgeProps {
  code: PolicyStatusCode;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const BADGE_CONFIG: Record<
  PolicyStatusCode,
  { bg: string; text: string; shadow: string; dot: string }
> = {
  SCHEDULED: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-300",
    shadow: "shadow-xs",
    dot: "bg-sky-500",
  },
  ACTIVE: {
    bg: "bg-[#1a5b55]/15 dark:bg-[#1a5b55]/30",
    text: "text-[#1a5b55] dark:text-[#4ea399]",
    shadow: "shadow-xs",
    dot: "bg-[#1a5b55] dark:bg-[#4ea399]",
  },
  AWAITING_REPORT: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    shadow: "shadow-xs",
    dot: "bg-amber-500",
  },
  ELIGIBLE: {
    bg: "bg-[#1a5b55] text-white shadow-sm",
    text: "text-white font-extrabold",
    shadow: "shadow-sm",
    dot: "bg-white",
  },
  NOT_ELIGIBLE: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-300",
    shadow: "shadow-xs",
    dot: "bg-rose-500",
  },
  CLAIMED: {
    bg: "bg-slate-100 dark:bg-[#121820]",
    text: "text-slate-600 dark:text-slate-400",
    shadow: "shadow-xs",
    dot: "bg-slate-400",
  },
};

export default function StatusBadge({
  code,
  label,
  size = "md",
  className = "",
}: StatusBadgeProps) {
  const config = BADGE_CONFIG[code] || BADGE_CONFIG.SCHEDULED;

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm",
  }[size];

  return (
    <span
      role="status"
      aria-label={`Policy Status: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold tracking-wide border-none ${config.bg} ${config.text} ${config.shadow} ${sizeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
