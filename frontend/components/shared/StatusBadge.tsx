"use client";

/**
 * StatusBadge.tsx
 *
 * Visual badge for policy status according to RPD Section 8:
 * - SCHEDULED: "Scheduled" (blue)
 * - ACTIVE: "Active" (green)
 * - AWAITING_REPORT: "Coverage ended (awaiting report)" (amber)
 * - ELIGIBLE: "Eligible" (emerald)
 * - NOT_ELIGIBLE: "Not eligible" (red)
 * - CLAIMED: "Claimed" (gray)
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
  { bg: string; text: string; border: string; dot: string }
> = {
  SCHEDULED: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  ACTIVE: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500 animate-pulse",
  },
  AWAITING_REPORT: {
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  ELIGIBLE: {
    bg: "bg-emerald-600",
    text: "text-white",
    border: "border-emerald-700",
    dot: "bg-white",
  },
  NOT_ELIGIBLE: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  CLAIMED: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-300",
    dot: "bg-gray-400",
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
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  }[size];

  return (
    <span
      role="status"
      aria-label={`Policy Status: ${label}`}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
