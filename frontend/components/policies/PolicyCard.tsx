"use client";

/**
 * PolicyCard.tsx
 *
 * Displays a single policy summary card on the Dashboard or Policy List (M3-D02, M3-D03):
 * - Policy ID & Option terms
 * - Farm location coordinates
 * - Coverage window start and end dates
 * - Trigger rainfall and guaranteed payout in RTT
 * - Derived dynamic status badge (Scheduled, Active, Awaiting report, Eligible, Not eligible, Claimed)
 * - Navigation to /policies/[id]
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
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
      <div>
        {/* Top Header: ID & Status Badge */}
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <span className="font-mono text-xs font-bold text-gray-500 uppercase tracking-wider">
              Policy #{policy.policyId}
            </span>
            <h3 className="mt-0.5 text-sm font-bold text-gray-900">
              {policy.optionId === 0
                ? "Demo Policy (2 Hours)"
                : `Option #${policy.optionId} (${formatDuration(durationSeconds)})`}
            </h3>
          </div>
          <StatusBadge code={status.code} label={status.label} size="sm" />
        </div>

        {/* Location & Crop */}
        <div className="mt-3 text-xs text-gray-600">
          <p className="flex items-center gap-1 font-mono text-[11px] text-gray-500">
            <svg
              className="h-3.5 w-3.5 text-gray-400"
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
            <span>
              {latDeg}°, {lonDeg}°
            </span>
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-2.5 text-xs">
          <div>
            <span className="text-[10px] uppercase font-semibold text-gray-400">Trigger</span>
            <p className="font-bold text-gray-900">{formatRainfall(policy.thresholdMm)}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-semibold text-gray-400">Payout</span>
            <p className="font-bold text-emerald-600">{payoutFormatted}</p>
          </div>
          <div className="col-span-2 pt-1 border-t border-gray-100">
            <span className="text-[10px] uppercase font-semibold text-gray-400">Coverage Window</span>
            <p className="text-[11px] text-gray-700">
              {formatUnixTimestamp(policy.startTime)} &rarr; {formatUnixTimestamp(policy.endTime)}
            </p>
          </div>
        </div>

        {/* Description or Reason Disabled note */}
        <p className="mt-3 text-[11px] text-gray-500 line-clamp-2">
          {status.description}
        </p>
      </div>

      {/* CTA Footer */}
      <div className="mt-5 pt-3 border-t border-gray-100">
        <Link
          href={ROUTES.POLICY(policy.policyId)}
          className={`block w-full rounded-lg py-2 text-center text-xs font-bold uppercase tracking-wider transition ${
            status.canClaim
              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {status.canClaim ? "Claim Payout \u2192" : "View Details \u2192"}
        </Link>
      </div>
    </div>
  );
}
