"use client";

/**
 * MockDataBanner.tsx
 * Prominent banner shown on every page when MOCK_MODE is active.
 * Appendix A.3 requirement: mock mode must show a visible MOCK DATA banner.
 * The banner is suppressed entirely when MOCK_MODE=false.
 */

import React from "react";
import { MOCK_MODE } from "@/lib/utils/constants";

export default function MockDataBanner() {
  if (!MOCK_MODE) return null;

  return (
    <div
      role="status"
      aria-label="Mock data active"
      className="flex items-center justify-center gap-2 bg-purple-700 px-4 py-2 text-center text-xs font-semibold text-white"
    >
      {/* Beaker icon */}
      <svg
        className="h-4 w-4 flex-shrink-0"
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
        ⚠ MOCK DATA ACTIVE — No real contract or model is connected. All
        figures are illustrative only and have no financial value.
      </span>
      <span className="rounded bg-purple-900 px-2 py-0.5 text-purple-200">
        Set NEXT_PUBLIC_MOCK_MODE=false to use real data
      </span>
    </div>
  );
}
