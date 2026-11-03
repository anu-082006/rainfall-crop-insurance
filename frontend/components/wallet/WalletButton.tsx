"use client";

/**
 * WalletButton.tsx
 * Connect / disconnect button for MetaMask.
 *
 * Covers M3-W01: connect and disconnect; show shortened address,
 *                chain name and test-token balance.
 *        M3-W04: friendly message when MetaMask is not installed.
 */

import React, { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet/walletContext";
import { shortenAddress, formatRtt } from "@/lib/utils/formatters";

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    status,
    address,
    chainName,
    rttBalance,
    balanceLoading,
    error,
    isMetaMaskInstalled,
    connect,
    disconnect,
  } = useWallet();

  // ── Pre-hydration placeholder (matches server render deterministically) ────
  if (!mounted) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow opacity-90 cursor-default"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  // ── MetaMask not installed ───────────────────────────────────────────────
  if (!isMetaMaskInstalled) {
    return (
      <div className="flex flex-col items-end gap-1">
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors"
        >
          Install MetaMask
        </a>
        <p className="text-xs text-gray-500">
          MetaMask is required to use this app.
        </p>
      </div>
    );
  }

  // ── Connected ────────────────────────────────────────────────────────────
  if (status === "connected" || status === "wrong_network") {
    return (
      <div className="flex flex-col items-end gap-1">
        {/* Address + chain row */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
            <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
            {shortenAddress(address ?? "")}
          </span>
          {chainName && (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
              {chainName}
            </span>
          )}
        </div>

        {/* RTT balance */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {balanceLoading ? (
            <span className="animate-pulse">Loading balance…</span>
          ) : (
            <span>
              Balance:{" "}
              <span className="font-semibold text-gray-700">
                {formatRtt(rttBalance)}
              </span>
            </span>
          )}
        </div>

        {/* Disconnect */}
        <button
          onClick={disconnect}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // ── Connecting ───────────────────────────────────────────────────────────
  if (status === "connecting") {
    return (
      <button
        disabled
        className="rounded-lg bg-blue-400 px-4 py-2 text-sm font-semibold text-white opacity-80 cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Connecting…
        </span>
      </button>
    );
  }

  // ── Disconnected (default) ───────────────────────────────────────────────
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        Connect Wallet
      </button>
      {error && (
        <p className="text-xs text-red-500 max-w-[200px] text-right">{error}</p>
      )}
    </div>
  );
}
