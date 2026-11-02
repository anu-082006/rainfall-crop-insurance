"use client";

/**
 * ResultCard.tsx
 *
 * Displays policy outcome and payout eligibility (Screen 6 / M3-R08):
 * - Authoritative contract eligibility result
 * - Payout amount in RTT
 * - Clear explanation of deficit criteria
 * - Explicit notice that AI never determines eligibility or triggers payouts
 */

import React from "react";
import { formatUnits } from "ethers";
import { OnChainPolicy } from "@/lib/mock/mockPolicies";
import { PolicyStatusResult } from "@/lib/contract/policyStatus";
import { formatRtt } from "@/lib/utils/formatters";
import { RTT_DECIMALS } from "@/lib/utils/constants";

interface ResultCardProps {
  policy: OnChainPolicy;
  status: PolicyStatusResult;
}

export default function ResultCard({ policy, status }: ResultCardProps) {
  const payoutFormatted = formatRtt(
    formatUnits(policy.payoutAmount, RTT_DECIMALS),
    0
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="border-b border-gray-100 pb-3">
        <h3 className="text-base font-bold text-gray-900">
          Contract Eligibility &amp; Payout Result
        </h3>
        <p className="text-xs text-gray-500">
          Smart contract execution evaluation based on verified oracle data.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {/* Outcome 1: Claimed */}
        {status.code === "CLAIMED" && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-700">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Status: Settled
                </span>
                <h4 className="text-lg font-bold text-gray-900">
                  Payout Successfully Claimed
                </h4>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-white p-4 border border-gray-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Total Payout Transferred:</span>
                <span className="font-mono text-base font-bold text-gray-900">{payoutFormatted}</span>
              </div>
            </div>
          </div>
        )}

        {/* Outcome 2: Eligible (Ready to claim) */}
        {status.code === "ELIGIBLE" && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Deficit Condition Satisfied
                </span>
                <h4 className="text-lg font-bold text-emerald-950">
                  Policy is Eligible for Payout
                </h4>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-white p-4 border border-emerald-200 shadow-sm">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 font-medium">Claimable Payout:</span>
                <span className="font-mono text-lg font-black text-emerald-600">
                  {payoutFormatted}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Observed rainfall ({policy.rainfallMm} mm) was strictly below the {policy.thresholdMm} mm
                trigger threshold. Click the claim button below to transfer tokens to your connected wallet.
              </p>
            </div>
          </div>
        )}

        {/* Outcome 3: Not Eligible */}
        {status.code === "NOT_ELIGIBLE" && (
          <div className="rounded-xl border border-red-200 bg-red-50/40 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                  Contract Verdict
                </span>
                <h4 className="text-lg font-bold text-red-950">
                  Policy is Not Eligible for Payout
                </h4>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-white p-4 border border-red-200">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-600 font-medium">Payout Amount:</span>
                <span className="font-mono text-base font-bold text-gray-500">0 RTT</span>
              </div>
              <p className="mt-2 text-[11px] text-gray-600">
                The oracle reported {policy.rainfallMm} mm of rainfall, which meets or exceeds the{" "}
                {policy.thresholdMm} mm deficit threshold. Parametric coverage triggers only when rainfall
                falls strictly below the threshold.
              </p>
            </div>
          </div>
        )}

        {/* Outcome 4: Pending (Scheduled / Active / Awaiting Report) */}
        {(status.code === "SCHEDULED" ||
          status.code === "ACTIVE" ||
          status.code === "AWAITING_REPORT") && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Evaluation Pending
                </span>
                <h4 className="text-base font-bold text-gray-900">
                  Eligibility Evaluation Pending Oracle Report
                </h4>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-white p-4 border border-gray-200 text-xs text-gray-600">
              <div className="flex justify-between items-center">
                <span>Maximum Potential Payout:</span>
                <span className="font-mono font-bold text-gray-800">{payoutFormatted}</span>
              </div>
              <p className="mt-2 text-[11px] text-gray-500">
                Eligibility will be computed on-chain once the coverage window concludes and the oracle report
                is accepted.
              </p>
            </div>
          </div>
        )}

        {/* Mandatory Architectural Disclosure */}
        <div className="rounded-lg bg-blue-50/50 p-3 text-[11px] text-blue-900">
          <strong>Smart Contract Authority:</strong> Payout eligibility is determined solely by the smart
          contract comparing recorded oracle precipitation against the fixed trigger. AI models are strictly
          advisory and have no role or authority in determining claim eligibility.
        </div>
      </div>
    </div>
  );
}
