"use client";

/**
 * RainfallReportCard.tsx
 *
 * Displays oracle rainfall report results (M3-R01, M3-R02, M3-R07):
 * - Displays observed rainfall total (mm) vs trigger threshold (mm) with clear comparison: below, equal, or above (M3-R01).
 * - CRITICAL: If no report exists, shows Scheduled, Active, or Awaiting Report. NEVER displays zero mm (M3-R02).
 * - Displays provenance tag / data-source label: CRE simulation, CRE live, or local fallback reporter (M3-R07).
 */

import React from "react";
import { OnChainPolicy } from "@/lib/mock/mockPolicies";
import { PolicyStatusResult } from "@/lib/contract/policyStatus";
import { formatRainfall } from "@/lib/utils/formatters";
import { MOCK_MODE } from "@/lib/utils/constants";

interface RainfallReportCardProps {
  policy: OnChainPolicy;
  status: PolicyStatusResult;
}

export default function RainfallReportCard({ policy, status }: RainfallReportCardProps) {
  const { reportReceived, rainfallMm, thresholdMm } = policy;

  // Comparison evaluation (M3-R01)
  const comparison = React.useMemo(() => {
    if (!reportReceived) return null;
    if (rainfallMm < thresholdMm) {
      return {
        type: "below" as const,
        label: "Below Trigger (Eligible)",
        badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-300",
        message: `Observed rainfall (${rainfallMm} mm) is strictly below the ${thresholdMm} mm trigger threshold.`,
      };
    } else if (rainfallMm === thresholdMm) {
      return {
        type: "equal" as const,
        label: "Equal to Trigger (Not Eligible)",
        badgeStyle: "bg-amber-100 text-amber-800 border-amber-300",
        message: `Observed rainfall (${rainfallMm} mm) equals the ${thresholdMm} mm trigger. Per contract terms, equal counts as not below.`,
      };
    } else {
      return {
        type: "above" as const,
        label: "Above Trigger (Not Eligible)",
        badgeStyle: "bg-red-100 text-red-800 border-red-300",
        message: `Observed rainfall (${rainfallMm} mm) exceeds the ${thresholdMm} mm trigger threshold.`,
      };
    }
  }, [reportReceived, rainfallMm, thresholdMm]);

  // Provenance label (M3-R07)
  const dataSource = MOCK_MODE ? "CRE Simulation" : "Chainlink CRE Live";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header with Provenance Tag */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Oracle Rainfall Report</h3>
          <p className="text-xs text-gray-500">
            Authoritative precipitation data recorded on-chain by the weather oracle.
          </p>
        </div>

        {/* Provenance Tag (M3-R07) */}
        <div className="inline-flex items-center gap-1.5 self-start rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          <span>Source: {dataSource}</span>
        </div>
      </div>

      {/* Case 1: Report Received */}
      {reportReceived && comparison ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Observed Rainfall */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Observed Rainfall
              </span>
              <p className="mt-1 text-2xl font-black text-gray-900">
                {formatRainfall(rainfallMm)}
              </p>
              <p className="text-[11px] text-gray-500">Total accumulated</p>
            </div>

            {/* Trigger Threshold */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trigger Threshold
              </span>
              <p className="mt-1 text-2xl font-black text-gray-900">
                {formatRainfall(thresholdMm)}
              </p>
              <p className="text-[11px] text-gray-500">Contract deficit line</p>
            </div>

            {/* Comparison Outcome Badge */}
            <div className={`rounded-lg border p-4 ${comparison.badgeStyle}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">
                Comparison Result
              </span>
              <p className="mt-1 text-lg font-bold">
                {comparison.label}
              </p>
              <p className="text-[11px] opacity-90 mt-0.5">
                {rainfallMm} mm vs {thresholdMm} mm
              </p>
            </div>
          </div>

          {/* Detailed explanation */}
          <div className="rounded-lg bg-gray-50 p-3.5 text-xs text-gray-700">
            <strong>Analysis:</strong> {comparison.message}
          </div>
        </div>
      ) : (
        /* Case 2: No Report Received (M3-R02 - NEVER display 0 mm) */
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Reported Rainfall
              </span>
              <p className="mt-1 text-xl font-bold text-amber-900">
                &mdash; Pending Oracle Report &mdash;
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                * Rainfall is never displayed as zero while awaiting verification.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trigger Threshold
              </span>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {formatRainfall(thresholdMm)}
              </p>
              <p className="text-[11px] text-gray-500">Deficit threshold</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 text-xs text-gray-600">
            <strong>Current Stage:</strong> {status.description}
          </div>
        </div>
      )}
    </div>
  );
}
