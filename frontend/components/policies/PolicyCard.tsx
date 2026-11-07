"use client";

/**
 * PolicyCard.tsx
 *
 * Displays a single policy summary card on the Dashboard or Policy List (M3-D02, M3-D03):
 * - Policy ID & Option terms
 * - Farm location coordinates
 * - Coverage window start and end dates
 * - Trigger rainfall and guaranteed payout in RTT
 * - Derived dynamic status badge
 * - Navigation to /policies/[id]
 *
 * Upgraded to borderless shadowy floating card with Primary Green #1a5b55.
 */

import React, { useMemo } from "react";
import Link from "next/link";
import { formatUnits } from "ethers";
import { OnChainPolicy } from "@/lib/mock/mockPolicies";
import { getStatusForPolicy } from "@/lib/contract/policyStatus";
import {
  formatDuration,
  formatRainfall,
  formatRtt,
  formatUnixTimestamp,
} from "@/lib/utils/formatters";
import { ROUTES, RTT_DECIMALS } from "@/lib/utils/constants";
import StatusBadge from "@/components/shared/StatusBadge";
import { CropLeaf } from "@/components/shared/CropIllustrations";

interface PolicyCardProps {
  policy: OnChainPolicy;
}

export default function PolicyCard({ policy }: PolicyCardProps) {
  // Derive current status dynamically from contract fields and clock (M3-D03)
  const status = useMemo(() => getStatusForPolicy(policy), [policy]);

  const latDeg = (policy.latitudeE6 / 1_000_000).toFixed(4);
  const lonDeg = (policy.longitudeE6 / 1_000_000).toFixed(4);
  const payoutFormatted = formatRtt(formatUnits(policy.payoutAmount, RTT_DECIMALS), 0);
  const durationSeconds = policy.endTime - policy.startTime;

  return (
    <div className="flex flex-col justify-between rounded-3xl floating-card p-6 relative overflow-hidden group">
      <div>
        {/* Top Header: ID & Status Badge */}
        <div className="flex items-start justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-slate-800/60">
          <div>
            <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Policy #{policy.policyId}
            </span>
            <h3 className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#1a5b55] dark:group-hover:text-[#4ea399] transition-colors flex items-center gap-1.5">
              <CropLeaf className="h-4 w-4 flex-shrink-0" />
              <span>
                {policy.optionId === 0
                  ? "Demo Policy (2 Hours)"
                  : `Option #${policy.optionId} (${formatDuration(durationSeconds)})`}
              </span>
            </h3>
          </div>
          <StatusBadge code={status.code} label={status.label} size="sm" />
        </div>

        {/* Location & Coordinates */}
        <div className="mt-3.5 flex items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          <svg
            className="h-3.5 w-3.5 text-[#1a5b55] dark:text-[#4ea399] flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-slate-700 dark:text-slate-300 font-semibold">
            {latDeg}°, {lonDeg}°
          </span>
        </div>

        {/* Metrics Box (Floating look, borderless) */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl bg-slate-50 dark:bg-[#080B0F] p-3.5 text-xs shadow-xs">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400">
              Rainfall Trigger
            </span>
            <p className="font-mono text-sm font-extrabold text-slate-900 dark:text-slate-200 mt-0.5">
              {formatRainfall(policy.thresholdMm)}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400">
              Payout Target
            </span>
            <p className="font-mono text-sm font-extrabold text-amber-600 dark:text-amber-300 mt-0.5">
              {payoutFormatted} <span className="text-[10px] font-normal text-amber-600/80 dark:text-amber-400/80">RTT</span>
            </p>
          </div>
          <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="text-[10px] uppercase font-mono text-slate-500">Window:</span>
            <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
              {formatUnixTimestamp(policy.startTime)} &rarr; {formatUnixTimestamp(policy.endTime)}
            </span>
          </div>
        </div>

        {/* Description or Reason Disabled note */}
        <p className="mt-3.5 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {status.description}
        </p>
      </div>

      {/* CTA Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/60">
        <Link
          href={ROUTES.POLICY(policy.policyId)}
          className={`block w-full rounded-xl py-2.5 text-center text-xs font-bold uppercase tracking-wider transition-all ${
            status.canClaim
              ? "bg-[#1a5b55] text-white shadow-md hover:shadow-lg hover:bg-[#22726b] hover:scale-[1.01]"
              : "bg-slate-100 dark:bg-[#0D1218] text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white"
          }`}
        >
          {status.canClaim ? "Claim Payout \u2192" : "View Telemetry & Details \u2192"}
        </Link>
      </div>
    </div>
  );
}
