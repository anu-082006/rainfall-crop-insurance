"use client";

/**
 * app/history/page.tsx
 *
 * Screen 8: Transaction & Event History (M3-H01, M3-H02).
 * Upgraded to InsurTech Bento Grid dark theme with Geist typography and glowing accents.
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
import { FieldLedger, CropTwinLeaves, ProtectedSproutUmbrella } from "@/components/shared/CropIllustrations";

export default function HistoryPage() {
  const { address, status, connect } = useWallet();
  const isConnected = status === "connected";

  const [events, setEvents] = useState<ContractEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSandboxBanner, setShowSandboxBanner] = useState<boolean>(true);

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
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a5b55]/15 px-3 py-1 text-xs font-bold text-[#1a5b55] dark:text-[#4ea399]">
              <FieldLedger className="h-4 w-4" />
              <span>On-Chain Audit Trail &bull; EVM Ledger</span>
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 dark:text-white">
            Transaction History
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            On-chain ledger of policy creations, oracle rainfall reports, and claim payout settlements.
          </p>
        </div>

        {isConnected && address && (
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
              Wallet: {shortenAddress(address, 5)}
            </span>
            <button
              type="button"
              onClick={loadData}
              className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
              title="Refresh transaction history"
            >
              ↻ Refresh
            </button>
          </div>
        )}
      </div>

      {/* ── Mock Mode Disclosure Banner (RPD Appendix A.3) ──────────── */}
      {(MOCK_MODE || !CONTRACT_ADDRESS) && showSandboxBanner && (
        <div className="rounded-2xl bg-[#1a5b55]/10 dark:bg-[#1a5b55]/20 p-4 text-xs text-slate-700 dark:text-slate-300 shadow-md flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#1a5b55]/20 text-[#1a5b55] dark:text-[#4ea399] font-bold text-[10px]">
              i
            </span>
            <div>
              <p className="font-bold text-[#1a5b55] dark:text-[#4ea399]">Demonstration Sandbox Audit Trail</p>
              <p className="mt-0.5 text-slate-600 dark:text-slate-400 leading-relaxed">
                Displaying simulated contract events for testing. When connected to a live deployed smart contract, transactions and oracle payouts are indexed directly from EVM logs via <code>queryFilter()</code>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSandboxBanner(false)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs px-2 py-0.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
            title="Dismiss notice"
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Disconnected Wallet State ───────────────────────────────── */}
      {!isConnected ? (
        <div className="floating-panel p-12 text-center shadow-xl">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <CropTwinLeaves className="h-12 w-12" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Wallet Connection Required</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Connect your MetaMask wallet to view your personal policy enrollment and transaction history.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={connect}
              className="rounded-2xl bg-[#1a5b55] hover:bg-[#22726b] px-6 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
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
            className="rounded-xl bg-[#1a5b55] hover:bg-[#22726b] px-5 py-2 text-xs font-bold text-white transition-all cursor-pointer"
          >
            Retry Loading History
          </button>
        </div>
      ) : events.length === 0 ? (
        /* ── Empty State ───────────────────────────────────────────── */
        <div className="floating-panel p-12 text-center shadow-xl">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <ProtectedSproutUmbrella className="h-16 w-16" />
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white">No Transactions Found</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            No policy enrollments or claim settlements have been recorded for this wallet address yet.
          </p>
          <div className="mt-6">
            <Link
              href={ROUTES.CATALOGUE}
              className="inline-flex rounded-2xl bg-[#1a5b55] hover:bg-[#22726b] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all"
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
