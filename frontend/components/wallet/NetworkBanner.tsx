"use client";

/**
 * NetworkBanner.tsx
 * Sticky banner shown when the connected wallet is on the wrong network.
 * Covers M3-W02: detect wrong network and show a switch-network action.
 */

import React from "react";
import { useWallet } from "@/lib/wallet/walletContext";
import { CHAIN_NAME, CHAIN_ID } from "@/lib/utils/constants";

export default function NetworkBanner() {
  const { status, isCorrectNetwork, chainName, switchNetwork } = useWallet();

  // Only show when connected but on the wrong network
  if (status !== "wrong_network" && isCorrectNetwork) return null;
  if (status === "disconnected" || status === "no_metamask" || status === "connecting") return null;
  if (isCorrectNetwork) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-500 px-4 py-3 text-sm font-medium text-amber-950 shadow-md"
    >
      <div className="flex items-center gap-2">
        {/* Warning icon */}
        <svg
          className="h-5 w-5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <span>
          Wrong network detected:{" "}
          <strong>{chainName ?? `Chain ${CHAIN_ID}`}</strong>. This app
          requires <strong>{CHAIN_NAME}</strong> (Chain ID {CHAIN_ID}).
          Write operations are disabled until you switch.
        </span>
      </div>

      <button
        onClick={switchNetwork}
        className="flex-shrink-0 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-colors"
      >
        Switch to {CHAIN_NAME}
      </button>
    </div>
  );
}
