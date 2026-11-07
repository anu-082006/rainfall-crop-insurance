"use client";

/**
 * MockDataBanner.tsx
 * Refined status banner shown on every page when MOCK_MODE is active.
 * Retains required mock mode disclosure while styled in a sleek, borderless, non-intrusive aesthetic.
 */

import React from "react";
import { MOCK_MODE } from "@/lib/utils/constants";

export default function MockDataBanner() {
  if (!MOCK_MODE) return null;

  return (
    <div
      role="status"
      aria-label="Mock data active"
      className="flex flex-wrap items-center justify-center gap-2 bg-purple-900/10 dark:bg-purple-950/40 px-4 py-1.5 text-center text-xs font-semibold text-purple-700 dark:text-purple-300 backdrop-blur-md shadow-xs"
    >
      <svg
        className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15a2.25 2.25 0 01.45 2.315l-1.548 4.132c-.41 1.098-1.458 1.803-2.626 1.803H7.924c-1.168 0-2.217-.705-2.626-1.803L3.75 17.315A2.25 2.25 0 014.2 15h15.6z"
        />
      </svg>
      <span>
        SIMULATION MODE ACTIVE — Illustrative testnet data. No real financial tokens used.
      </span>
      <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-mono text-purple-700 dark:text-purple-300 font-bold">
        NEXT_PUBLIC_MOCK_MODE=true
      </span>
    </div>
  );
}
