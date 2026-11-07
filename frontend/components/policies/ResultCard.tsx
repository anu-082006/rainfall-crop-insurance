"use client";

/**
 * ResultCard.tsx
 *
 * Displays policy outcome and payout eligibility (Screen 6 / M3-R08):
 * - Authoritative contract eligibility result
 * - Payout amount in RTT
 * - Clear explanation of deficit criteria
 * - Explicit notice that AI never determines eligibility or triggers payouts
 *
 * Upgraded to InsurTech dark Bento Grid styling with glowing outcome indicators and Geist typography.
 */

import React from "react";
import { formatUnits } from "ethers";
import { OnChainPolicy } from "@/lib/mock/mockPolicies";
import { PolicyStatusResult } from "@/lib/contract/policyStatus";
import { formatRtt } from "@/lib/utils/formatters";
import { RTT_DECIMALS } from "@/lib/utils/constants";
import {
  HarvestPayoutCoins,
  RainCloudCrop,
  LeafShield,
} from "@/components/shared/CropIllustrations";

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
    <div className="floating-panel p-6 shadow-xl">
      <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3.5">
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
          Contract Eligibility &amp; Payout Result
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Smart contract execution evaluation based on verified oracle data.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {/* Outcome 1: Claimed */}
        {status.code === "CLAIMED" && (
          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <HarvestPayoutCoins className="h-8 w-8 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status: Settled
                </span>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Payout Successfully Claimed
                </h4>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-white dark:bg-[#070A0F] p-4 shadow-inner">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">Total Payout Transferred:</span>
                <span className="font-mono text-base font-extrabold text-amber-600 dark:text-amber-400">{payoutFormatted}</span>
              </div>
            </div>
          </div>
        )}

        {/* Outcome 2: Eligible (Ready to claim) */}
        {status.code === "ELIGIBLE" && (
          <div className="rounded-2xl bg-[#1a5b55]/10 p-5 shadow-md">
            <div className="flex items-center gap-3">
              <HarvestPayoutCoins className="h-8 w-8 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#1a5b55] dark:text-[#4ea399]">
                  Deficit Condition Satisfied
                </span>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Policy is Eligible for Payout
                </h4>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white dark:bg-[#070A0F] p-4 shadow-sm">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-300 font-medium">Claimable Payout:</span>
                <span className="font-mono text-xl font-black text-amber-600 dark:text-amber-400">
                  {payoutFormatted}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Observed rainfall ({policy.rainfallMm} mm) was strictly below the {policy.thresholdMm} mm
                trigger threshold. Click the claim button below to transfer tokens to your connected wallet.
              </p>
            </div>
          </div>
        )}

        {/* Outcome 3: Not Eligible */}
        {status.code === "NOT_ELIGIBLE" && (
          <div className="rounded-2xl bg-rose-500/10 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <RainCloudCrop className="h-8 w-8 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Contract Verdict
                </span>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  Policy is Not Eligible for Payout
                </h4>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white dark:bg-[#070A0F] p-4 shadow-sm">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Payout Amount:</span>
                <span className="font-mono text-base font-bold text-slate-400">0 RTT</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
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
          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <LeafShield className="h-8 w-8 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  Evaluation Pending
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Eligibility Evaluation Pending Oracle Report
                </h4>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white dark:bg-[#070A0F] p-4 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Maximum Potential Payout:</span>
                <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400">{payoutFormatted}</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Eligibility will be computed on-chain once the coverage window concludes and the oracle report
                is accepted.
              </p>
            </div>
          </div>
        )}

        {/* Mandatory Architectural Disclosure */}
        <div className="rounded-2xl bg-cyan-500/10 p-4 text-xs text-cyan-800 dark:text-cyan-200">
          <strong className="text-cyan-700 dark:text-cyan-300">Smart Contract Authority:</strong> Payout eligibility is determined solely by the smart
          contract comparing recorded oracle precipitation against the fixed trigger. AI models are strictly
          advisory and have no role or authority in determining claim eligibility.
        </div>
      </div>
    </div>
  );
}
