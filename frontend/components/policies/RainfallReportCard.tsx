"use client";

/**
 * RainfallReportCard.tsx
 *
 * Displays oracle rainfall report results (M3-R01, M3-R02, M3-R07):
 * - Displays observed rainfall total (mm) vs trigger threshold (mm) with clear comparison: below, equal, or above (M3-R01).
 * - CRITICAL: If no report exists, shows Scheduled, Active, or Awaiting Report. NEVER displays zero mm (M3-R02).
 * - Displays provenance tag / data-source label: CRE simulation, CRE live, or local fallback reporter (M3-R07).
 *
 * Upgraded to InsurTech dark Bento Grid design with glowing comparison meters and telemetry tags.
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
        badgeStyle: "bg-[#1a5b55]/15 text-[#1a5b55] dark:text-[#4ea399] shadow-xs",
        message: `Observed rainfall (${rainfallMm} mm) is strictly below the ${thresholdMm} mm trigger threshold.`,
      };
    } else if (rainfallMm === thresholdMm) {
      return {
        type: "equal" as const,
        label: "Equal to Trigger (Not Eligible)",
        badgeStyle: "bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-sm",
        message: `Observed rainfall (${rainfallMm} mm) equals the ${thresholdMm} mm trigger. Per contract terms, equal counts as not below.`,
      };
    } else {
      return {
        type: "above" as const,
        label: "Above Trigger (Not Eligible)",
        badgeStyle: "bg-rose-500/15 text-rose-700 dark:text-rose-300 shadow-sm",
        message: `Observed rainfall (${rainfallMm} mm) exceeds the ${thresholdMm} mm trigger threshold.`,
      };
    }
  }, [reportReceived, rainfallMm, thresholdMm]);

  // Provenance label (M3-R07)
  const dataSource = MOCK_MODE ? "CRE Simulation" : "Chainlink CRE Live";

  return (
    <div className="floating-panel p-6 shadow-xl">
      {/* Header with Provenance Tag */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Oracle Rainfall Report</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Authoritative precipitation data recorded on-chain by the weather oracle.
          </p>
        </div>

        {/* Provenance Tag (M3-R07) */}
        <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-[#1a5b55]/15 px-3 py-1 text-xs font-bold text-[#1a5b55] dark:text-[#4ea399] shadow-xs">
          <span className="h-2 w-2 rounded-full bg-[#1a5b55] dark:bg-[#4ea399]" />
          <span>Source: {dataSource}</span>
        </div>
      </div>

      {/* Case 1: Report Received */}
      {reportReceived && comparison ? (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Observed Rainfall */}
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Observed Rainfall
              </span>
              <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white font-mono">
                {formatRainfall(rainfallMm)}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">Total accumulated</p>
            </div>

            {/* Trigger Threshold */}
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Trigger Threshold
              </span>
              <p className="mt-1 text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                {formatRainfall(thresholdMm)}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">Contract deficit line</p>
            </div>

            {/* Comparison Outcome Badge */}
            <div className={`rounded-2xl p-4 ${comparison.badgeStyle}`}>
              <span className="text-xs font-semibold uppercase tracking-wider">
                Comparison Result
              </span>
              <p className="mt-1 text-lg font-extrabold">
                {comparison.label}
              </p>
              <p className="text-[11px] opacity-90 font-mono mt-0.5">
                {rainfallMm} mm vs {thresholdMm} mm
              </p>
            </div>
          </div>

          {/* Detailed explanation */}
          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
            <strong className="text-slate-900 dark:text-white">Analysis:</strong> {comparison.message}
          </div>
        </div>
      ) : (
        /* Case 2: No Report Received (M3-R02 - NEVER display 0 mm) */
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-amber-500/10 p-4 shadow-sm">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                Reported Rainfall
              </span>
              <p className="mt-1 text-base font-extrabold text-amber-800 dark:text-amber-200 font-mono">
                &mdash; Pending Oracle Report &mdash;
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-1">
                * Rainfall is never displayed as zero while awaiting verification.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Trigger Threshold
              </span>
              <p className="mt-1 text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
                {formatRainfall(thresholdMm)}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">Deficit threshold</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 text-xs text-slate-600 dark:text-slate-400 shadow-sm">
            <strong className="text-slate-900 dark:text-white">Current Stage:</strong> {status.description}
          </div>
        </div>
      )}
    </div>
  );
}
