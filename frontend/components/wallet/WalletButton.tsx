"use client";

/**
 * WalletButton.tsx
 * Modern Web3 / DeFi styled wallet connection button.
 * Upgraded to borderless shadowy floating pills with Primary Green #1a5b55.
 * Preserves all state logic, hydration protection, and MetaMask connection flows.
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
          className="rounded-xl bg-[#1a5b55] px-4 py-2 text-xs font-semibold text-white shadow-md opacity-90 cursor-default"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  // ── MetaMask not initially detected ─────────────────────────────────────
  if (!isMetaMaskInstalled) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={connect}
          className="rounded-xl bg-[#1a5b55] px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg hover:bg-[#22726b] transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Connect Wallet</span>
          </span>
        </button>
        {error && (
          <p className="text-[10px] text-rose-500 dark:text-rose-400 max-w-[210px] text-right font-medium">{error}</p>
        )}
      </div>
    );
  }

  // ── Connected ────────────────────────────────────────────────────────────
  if (status === "connected" || status === "wrong_network") {
    return (
      <div className="flex items-center gap-2">
        {/* Token Balance Pill */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-[#0D1218] px-3 py-1.5 text-xs font-mono shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-slate-500 dark:text-slate-400 text-[11px]">RTT:</span>
          {balanceLoading ? (
            <span className="text-slate-400 text-xs">…</span>
          ) : (
            <span className="font-bold text-amber-600 dark:text-amber-400">
              {formatRtt(rttBalance)}
            </span>
          )}
        </div>

        {/* Address + Network Pill */}
        <div className="flex items-center rounded-xl bg-slate-100 dark:bg-[#0D1218] p-1 shadow-sm">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5">
            <span className="h-2 w-2 rounded-full bg-[#1a5b55] dark:bg-[#4ea399]" />
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
              {shortenAddress(address ?? "")}
            </span>
          </div>

          {chainName && (
            <span className="rounded-lg bg-white dark:bg-[#151C24] px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 shadow-xs">
              {chainName}
            </span>
          )}

          {/* Disconnect button */}
          <button
            onClick={disconnect}
            title="Disconnect wallet"
            className="ml-1 rounded-lg p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors focus:outline-none"
            aria-label="Disconnect wallet"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ── Connecting ───────────────────────────────────────────────────────────
  if (status === "connecting") {
    return (
      <button
        disabled
        className="rounded-xl bg-[#1a5b55]/80 px-4 py-2 text-xs font-semibold text-white cursor-wait shadow-md"
      >
        <span className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Connecting…</span>
        </span>
      </button>
    );
  }

  // ── Disconnected (default) ───────────────────────────────────────────────
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        className="rounded-xl bg-[#1a5b55] px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg hover:bg-[#22726b] transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Connect Wallet</span>
        </span>
      </button>
      {error && (
        <p className="text-[10px] text-rose-500 dark:text-rose-400 max-w-[200px] text-right font-medium">{error}</p>
      )}
    </div>
  );
}
