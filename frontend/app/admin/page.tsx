"use client";
/**
 * /admin — Admin helper page (optional, M3-A01).
 * Visible only to the configured admin address. Stage 1 scaffold only.
 */
import React from "react";
import { useWallet } from "@/lib/wallet/walletContext";
import { ADMIN_ADDRESS } from "@/lib/utils/constants";

export default function AdminPage() {
  const { address, status } = useWallet();

  if (status !== "connected") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-gray-500">Connect your wallet to access this page.</p>
      </div>
    );
  }

  const isAdmin =
    ADMIN_ADDRESS && address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 text-sm">
          This page is restricted to the configured admin address.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
      <p className="text-gray-500 text-sm mb-4">
        Mint RTT tokens and fund the insurance contract (Stage implementation TBD).
      </p>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-600">
          Admin actions (mint, fund) will be implemented here. Until then, use
          the equivalent <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">cast</code> commands documented in the README.
        </p>
      </div>
    </div>
  );
}
