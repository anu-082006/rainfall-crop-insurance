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
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold uppercase text-gray-400 mr-1">Event:</span>
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
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterType === tab.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Policy ID or Tx..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1.5 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Results Summary ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Showing <strong>{filteredEvents.length}</strong> of {events.length} transactions
        </span>
        {(filterType !== "ALL" || searchQuery !== "") && (
          <button
            type="button"
            onClick={() => {
              setFilterType("ALL");
              setSearchQuery("");
            }}
            className="text-blue-600 hover:underline font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Transactions Table (Desktop & Mobile) ──────────────────────── */}
      {filteredEvents.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
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
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredEvents.map((evt) => {
                  const isCopied = copiedHash === evt.transactionHash;

                  // Event badge styling
                  let badgeClass = "bg-gray-100 text-gray-800 border-gray-200";
                  let eventLabel: string = evt.eventName;

                  if (evt.eventType === "ENROLLMENT") {
                    badgeClass = "bg-blue-100 text-blue-800 border-blue-200";
                    eventLabel = "Policy Enrolled";
                  } else if (evt.eventType === "REPORT") {
                    badgeClass = "bg-purple-100 text-purple-800 border-purple-200";
                    eventLabel = "Oracle Report";
                  } else if (evt.eventType === "CLAIM") {
                    badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    eventLabel = "Claim Paid";
                  }

                  return (
                    <tr key={evt.id} className="hover:bg-gray-50/70 transition">
                      {/* Event Type Badge */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                          >
                            {eventLabel}
                          </span>
                          {evt.isMock && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
                              MOCK
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Policy ID Link */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono">
                        <Link
                          href={ROUTES.POLICY(evt.policyId)}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Policy #{evt.policyId} &rarr;
                        </Link>
                      </td>

                      {/* Details / Summary */}
                      <td className="px-4 py-3.5 text-gray-700">
                        <div className="max-w-md">
                          <p className="font-medium text-gray-900">{evt.summary}</p>
                          <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-gray-500">
                            {evt.details.optionId !== undefined && (
                              <span>Option #{evt.details.optionId}</span>
                            )}
                            {evt.details.rainfallMm !== undefined && (
                              <span>Precipitation: {evt.details.rainfallMm} mm</span>
                            )}
                            {evt.details.amountRtt && (
                              <span className="font-semibold text-emerald-700">
                                Payout: {evt.details.amountRtt} RTT
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Block Number */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-gray-500">
                        #{evt.blockNumber}
                      </td>

                      {/* Timestamp */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-gray-600">
                        {formatUnixTimestamp(evt.timestamp)}
                      </td>

                      {/* Transaction Hash with Copy Action (M3-H02) */}
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono">
                        <div className="flex items-center gap-2">
                          <span
                            title={evt.transactionHash}
                            className="text-gray-600"
                          >
                            {shortenTxHash(evt.transactionHash, 5)}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleCopyHash(evt.transactionHash)}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                              isCopied
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500 shadow-sm">
          <p className="text-sm font-semibold text-gray-700">No transactions match your filter</p>
          <p className="mt-1 text-xs text-gray-400">
            Try switching event types or clearing your search term.
          </p>
          <button
            type="button"
            onClick={() => {
              setFilterType("ALL");
              setSearchQuery("");
            }}
            className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
