"use client";

/**
 * app/history/page.tsx
 *
 * Screen 8: Transaction & Event History (M3-H01, M3-H02).
 *
 * Requirements:
 * - Query and index PolicyEnrolled, RainfallReportAccepted, and ClaimPaid events
 * - Clear disclosure distinguishing mock event logs from live on-chain history
 * - Filter and display transaction details, blocks, amounts, and hashes
 * - Direct navigation to policy detail pages (/policies/[id])
 * - Loading, empty, disconnected-wallet, and error states
 */

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { BrowserProvider } from "ethers";
import { useWallet } from "@/lib/wallet/walletContext";
import { getEventHistory, ContractEventItem } from "@/lib/contract/eventIndexer";
import { CONTRACT_ADDRESS, MOCK_MODE, ROUTES } from "@/lib/utils/constants";
import { shortenAddress } from "@/lib/utils/formatters";
import HistoryTable from "@/components/history/HistoryTable";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorNotice from "@/components/shared/ErrorNotice";

export default function HistoryPage() {
  const { address, status, connect } = useWallet();
  const isConnected = status === "connected";

  const [events, setEvents] = useState<ContractEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!address) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let provider: BrowserProvider | undefined = undefined;
      if (typeof window !== "undefined" && window.ethereum) {
        provider = new BrowserProvider(window.ethereum);
      }

      const items = await getEventHistory(address, provider);
      setEvents(items);
    } catch (err: unknown) {
      console.error("Error loading transaction history:", err);
      const msg = err instanceof Error ? err.message : "Failed to load transaction history.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Transaction History
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            On-chain ledger of policy creations, oracle rainfall reports, and claim payout settlements.
          </p>
        </div>

        {isConnected && address && (
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-xs font-semibold text-gray-700">
              Wallet: {shortenAddress(address, 5)}
            </span>
            <button
              type="button"
              onClick={loadData}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-xs"
              title="Refresh transaction history"
            >
              ↻ Refresh
            </button>
          </div>
        )}
      </div>

      {/* ── Mock Mode Disclosure Banner (RPD Appendix A.3) ──────────── */}
      {(MOCK_MODE || !CONTRACT_ADDRESS) && (
        <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-4 text-xs text-purple-900 shadow-sm flex items-start gap-3">
          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-[10px]">
            i
          </span>
          <div>
            <p className="font-bold">Simulated Event Audit Trail Active</p>
            <p className="mt-0.5 text-purple-700">
              Displaying simulated contract events for the connected test wallet. In live production mode with Member 1&apos;s deployed contract, events are indexed directly from Ethereum logs via <code>queryFilter()</code>.
            </p>
          </div>
        </div>
      )}

      {/* ── Disconnected Wallet State ───────────────────────────────── */}
      {!isConnected ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-bold text-gray-900">Wallet Connection Required</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
            Connect your MetaMask wallet to view your personal policy enrollment and transaction history.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={connect}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      ) : loading ? (
        /* ── Loading State ─────────────────────────────────────────── */
        <div className="py-24">
          <LoadingSpinner message="Indexing transaction history and contract events..." centered size="lg" />
        </div>
      ) : error ? (
        /* ── Error State ───────────────────────────────────────────── */
        <div className="space-y-4">
          <ErrorNotice
            title="Failed to Load Transaction History"
            message={error}
            variant="error"
          />
          <button
            type="button"
            onClick={loadData}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
          >
            Retry Loading History
          </button>
        </div>
      ) : events.length === 0 ? (
        /* ── Empty State ───────────────────────────────────────────── */
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
          <p className="text-base font-bold text-gray-700">No Transactions Found</p>
          <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto">
            No policy enrollments or claim settlements have been recorded for this wallet address yet.
          </p>
          <div className="mt-6">
            <Link
              href={ROUTES.CATALOGUE}
              className="inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Browse Policy Catalogue &rarr;
            </Link>
          </div>
        </div>
      ) : (
        /* ── Active History Table ───────────────────────────────────── */
        <HistoryTable events={events} />
      )}
    </div>
  );
}
