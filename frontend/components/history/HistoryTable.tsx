"use client";

/**
 * HistoryTable.tsx
 *
 * Responsive transaction and event history table (M3-H01, M3-H02):
 * - Displays PolicyEnrolled, RainfallReportAccepted, and ClaimPaid events
 * - Shows block number, policy ID, terms/amounts, and transaction hash
 * - One-click transaction hash copy button with temporary copied feedback
 * - Direct navigation link to policy detail page (/policies/[id])
 * - Filter by event type (All, Enrollments, Reports, Claims) and search filter
 * - Clearly distinguishes mock events from verified on-chain transactions
 *
 * Upgraded to Cruip Mosaic / Geist InsurTech design with tabular monospace numbers and glowing accents.
 */

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ContractEventItem } from "@/lib/contract/eventIndexer";
import { formatUnixTimestamp, shortenTxHash } from "@/lib/utils/formatters";
import { ROUTES } from "@/lib/utils/constants";

interface HistoryTableProps {
  events: ContractEventItem[];
}

export default function HistoryTable({ events }: HistoryTableProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Copy transaction hash to clipboard
  const handleCopyHash = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (err) {
      console.warn("Failed to copy transaction hash:", err);
    }
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Type filter
      if (filterType !== "ALL" && evt.eventType !== filterType) {
        return false;
      }
      // Search filter (policyId or txHash)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const matchPolicy = evt.policyId.toString().includes(query);
        const matchHash = evt.transactionHash.toLowerCase().includes(query);
        const matchName = evt.eventName.toLowerCase().includes(query);
        if (!matchPolicy && !matchHash && !matchName) return false;
      }
      return true;
    });
  }, [events, filterType, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ── Filters and Search Strip ────────────────────────────────────── */}
      <div className="flex flex-col gap-4 floating-panel p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase text-slate-500 mr-1 font-mono">Event:</span>
          {[
            { id: "ALL", label: "All Events" },
            { id: "ENROLLMENT", label: "Enrollments" },
            { id: "REPORT", label: "Oracle Reports" },
            { id: "CLAIM", label: "Claims Settled" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                filterType === tab.id
                  ? "bg-[#1a5b55] text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Policy ID or Tx..."
            className="w-full rounded-2xl bg-slate-100 dark:bg-[#070A0F] px-4 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#1a5b55]/50 shadow-inner border-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Results Summary ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 font-mono">
        <span>
          Showing <strong className="text-slate-900 dark:text-white">{filteredEvents.length}</strong> of {events.length} transactions
        </span>
        {(filterType !== "ALL" || searchQuery !== "") && (
          <button
            type="button"
            onClick={() => {
              setFilterType("ALL");
              setSearchQuery("");
            }}
            className="text-[#1a5b55] dark:text-[#4ea399] hover:underline font-bold cursor-pointer"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Transactions Table (Desktop & Mobile) ──────────────────────── */}
      {filteredEvents.length > 0 ? (
        <div className="overflow-hidden floating-panel shadow-xl">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800/60 text-left text-xs">
              <thead className="bg-slate-50 dark:bg-black/60 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                <tr>
                  <th scope="col" className="px-4 py-3.5">
                    Event Type
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Policy ID
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Activity &amp; Details
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Block
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Timestamp
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Transaction Hash
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 bg-transparent">
                {filteredEvents.map((evt) => {
                  const isCopied = copiedHash === evt.transactionHash;

                  // Event badge styling
                  let badgeClass = "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                  let eventLabel: string = evt.eventName;

                  if (evt.eventType === "ENROLLMENT") {
                    badgeClass = "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300";
                    eventLabel = "Policy Enrolled";
                  } else if (evt.eventType === "REPORT") {
                    badgeClass = "bg-purple-500/15 text-purple-700 dark:text-purple-300";
                    eventLabel = "Oracle Report";
                  } else if (evt.eventType === "CLAIM") {
                    badgeClass = "bg-[#1a5b55]/15 text-[#1a5b55] dark:text-[#4ea399]";
                    eventLabel = "Claim Paid";
                  }

                  return (
                    <tr key={evt.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      {/* Event Type Badge */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${badgeClass}`}
                          >
                            {eventLabel}
                          </span>
                          {evt.isMock && (
                            <span className="rounded bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 dark:text-purple-300">
                              MOCK
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Policy ID Link */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono">
                        <Link
                          href={ROUTES.POLICY(evt.policyId)}
                          className="font-bold text-[#1a5b55] dark:text-[#4ea399] hover:underline transition-colors"
                        >
                          Policy #{evt.policyId} &rarr;
                        </Link>
                      </td>

                      {/* Details / Summary */}
                      <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                        <div className="max-w-md">
                          <p className="font-semibold text-slate-900 dark:text-white">{evt.summary}</p>
                          <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {evt.details.optionId !== undefined && (
                              <span>Option #{evt.details.optionId}</span>
                            )}
                            {evt.details.rainfallMm !== undefined && (
                              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">Precipitation: {evt.details.rainfallMm} mm</span>
                            )}
                            {evt.details.amountRtt && (
                              <span className="font-bold text-amber-600 dark:text-amber-400">
                                Payout: {evt.details.amountRtt} RTT
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Block Number */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-slate-500 dark:text-slate-400">
                        #{evt.blockNumber}
                      </td>

                      {/* Timestamp */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {formatUnixTimestamp(evt.timestamp)}
                      </td>

                      {/* Transaction Hash with Copy Action (M3-H02) */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            title={evt.transactionHash}
                            className="text-slate-500 dark:text-slate-400 text-xs"
                          >
                            {shortenTxHash(evt.transactionHash, 5)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyHash(evt.transactionHash)}
                            className={`rounded-lg px-2 py-0.5 text-[10px] font-bold transition-all cursor-pointer ${
                              isCopied
                                ? "bg-[#1a5b55] text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                            title="Copy full transaction hash to clipboard"
                          >
                            {isCopied ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Empty Filter State */
        <div className="floating-panel p-12 text-center text-slate-500 dark:text-slate-400 shadow-xl">
          <p className="text-sm font-bold text-slate-900 dark:text-white">No transactions match your filter</p>
          <p className="mt-1 text-xs text-slate-500">
            Try switching event types or clearing your search term.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterType("ALL");
              setSearchQuery("");
            }}
            className="mt-4 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
