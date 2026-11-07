"use client";

/**
 * /admin — Admin helper page (optional, M3-A01).
 * Visible only to the configured admin address. Stage 1 scaffold only.
 * Upgraded to InsurTech dark theme with Geist typography.
 */

import React from "react";
import { useWallet } from "@/lib/wallet/walletContext";
import { ADMIN_ADDRESS } from "@/lib/utils/constants";

export default function AdminPage() {
  const { address, status } = useWallet();

  if (status !== "connected") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="floating-panel p-8 shadow-xl max-w-md mx-auto">
          <p className="text-sm font-mono text-slate-500 dark:text-slate-400">Connect your wallet to access this page.</p>
        </div>
      </div>
    );
  }

  const isAdmin =
    ADMIN_ADDRESS && address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 text-center">
        <div className="rounded-2xl bg-rose-500/15 p-8 max-w-md mx-auto shadow-xl">
          <h1 className="text-2xl font-black text-rose-700 dark:text-rose-200 mb-2">Access Denied</h1>
          <p className="text-rose-600 dark:text-rose-300 text-xs">
            This page is restricted to the configured admin address.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 px-3 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-sm">
            Contract Operator Admin
          </span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-1">Admin Panel</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Mint RTT tokens and fund the insurance contract pool (Stage implementation scaffold).
        </p>
      </div>

      <div className="floating-panel p-6 shadow-xl">
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          Admin actions (mint, fund) will be implemented here. Until then, use
          the equivalent <code className="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded text-xs text-amber-600 dark:text-amber-300 font-bold">cast</code> commands documented in the README.
        </p>
      </div>
    </div>
  );
}
