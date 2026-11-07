"use client";

/**
 * NetworkBanner.tsx
 * Sticky banner shown when the connected wallet is on the wrong network.
 * Covers M3-W02: detect wrong network and show a switch-network action.
 * Borderless, elevated floating shadow design.
 */

import React from "react";
import { useWallet } from "@/lib/wallet/walletContext";
import { CHAIN_NAME, CHAIN_ID, MOCK_MODE } from "@/lib/utils/constants";

export default function NetworkBanner() {
  const { status, isCorrectNetwork, chainName, switchNetwork } = useWallet();

  // In Mock Mode, any network is permitted for simulation without blocking the user
  if (MOCK_MODE) return null;

  // Only show when connected but on the wrong network
  if (status !== "wrong_network" && isCorrectNetwork) return null;
  if (status === "disconnected" || status === "no_metamask" || status === "connecting") return null;
  if (isCorrectNetwork) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-500/15 dark:bg-amber-950/80 px-4 py-2.5 text-xs font-semibold text-amber-900 dark:text-amber-200 shadow-md backdrop-blur-xl"
    >
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z"
          />
        </svg>
        <span>
          Wrong network detected: <strong className="text-amber-700 dark:text-amber-300 font-mono">{chainName ?? `Chain ${CHAIN_ID}`}</strong>. Please switch to <strong className="text-amber-700 dark:text-amber-300">{CHAIN_NAME}</strong> (ID: {CHAIN_ID}) to enable contract interactions.
        </span>
      </div>

      <button
        onClick={switchNetwork}
        className="flex-shrink-0 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-sm transition-transform hover:scale-105 active:scale-95 focus:outline-none"
      >
        Switch to {CHAIN_NAME}
      </button>
    </div>
  );
}
