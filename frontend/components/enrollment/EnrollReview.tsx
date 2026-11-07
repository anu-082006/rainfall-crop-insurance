"use client";

/**
 * EnrollReview.tsx
 *
 * Review screen and summary card for policy enrollment (M3-E02, M3-E03, M3-E06, M3-E07):
 * - Displays read-only option terms: optionId, risk tier, duration, trigger mm, payout RTT
 * - Displays farm location and crop from saved farmer profile (M3-E03)
 * - Shows calculated coverage end time preview with contract calculation notice (M3-E02)
 * - Enforces validation guards: wallet connection, correct network, saved profile (M3-E06)
 * - Displays mandatory RTT test token disclaimer and no-premium notice (M3-E07)
 * - Shows Option 0 Demo-only disclaimer preventing confusion with real seasonal policies
 * - Clearly discloses simulated transaction when running in mock mode
 *
 * Upgraded to InsurTech dark Bento Grid styling with Geist typography and neon accents.
 */

import React from "react";
import Link from "next/link";
import { CatalogueOption } from "@/lib/mock/mockCatalogue";
import { FarmerProfile } from "@/lib/profile/profileStorage";
import {
  calculatePreviewEndTime,
  formatUtcDateTime,
} from "@/lib/utils/dateHelpers";
import {
  formatDuration,
  formatRainfall,
  formatRtt,
  formatUnixTimestamp,
  shortenAddress,
} from "@/lib/utils/formatters";
import { CONTRACT_ADDRESS, MOCK_MODE, ROUTES } from "@/lib/utils/constants";

interface EnrollReviewProps {
  option: CatalogueOption;
  startTime: number;
  profile: FarmerProfile | null;
  walletConnected: boolean;
  walletAddress: string | null;
  isWrongNetwork: boolean;
  isValidStartTime: boolean;
  isEnrolling: boolean;
  onConfirm: () => void;
}

export default function EnrollReview({
  option,
  startTime,
  profile,
  walletConnected,
  walletAddress,
  isWrongNetwork,
  isValidStartTime,
  isEnrolling,
  onConfirm,
}: EnrollReviewProps) {
  // Preview calculated end time (M3-E02)
  const previewEndTime = startTime > 0 ? calculatePreviewEndTime(startTime, option.durationSeconds) : 0;

  // Coordinate integer conversion (degrees * 1,000,000 per Appendix A.2)
  const latE6 = profile ? Math.round(profile.latitude * 1_000_000) : null;
  const lonE6 = profile ? Math.round(profile.longitude * 1_000_000) : null;

  // Validation guards (M3-E06)
  const canSubmit =
    walletConnected &&
    !isWrongNetwork &&
    profile !== null &&
    isValidStartTime &&
    !isEnrolling;

  return (
    <div className="space-y-6">
      {/* 1. Policy Terms Summary (Read-only, derived strictly from contract catalogue) */}
      <div className="floating-panel p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3.5">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Selected Policy Option #{option.optionId}
            </h3>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-bold shadow-sm ${
                option.isDemo
                  ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                  : option.riskLabel === "Severe"
                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                  : option.riskLabel === "Moderate"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
              }`}
            >
              {option.riskLabel}
            </span>
          </div>
          <Link
            href={ROUTES.CATALOGUE}
            className="text-xs font-bold text-[#1a5b55] dark:text-[#4ea399] hover:underline transition-colors"
          >
            Change Option
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-3.5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Duration</span>
            <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white font-mono">
              {formatDuration(option.durationSeconds)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-3.5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trigger Threshold</span>
            <p className="mt-0.5 text-sm font-bold text-cyan-600 dark:text-cyan-400 font-mono">
              {formatRainfall(option.triggerMm)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-3.5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Guaranteed Payout</span>
            <p className="mt-0.5 text-sm font-bold text-amber-600 dark:text-amber-400 font-mono">
              {formatRtt(option.payoutRtt.toString(), 0)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-3.5 shadow-sm">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Premium Cost</span>
            <p className="mt-0.5 text-sm font-extrabold text-[#1a5b55] dark:text-[#4ea399]">0 RTT (Free)</p>
          </div>
        </div>

        <p className="mt-3.5 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-mono">
          * Policy triggers, durations, and payout amounts are fixed by the on-chain smart
          contract catalogue and cannot be customized.
        </p>
      </div>

      {/* 2. Coverage Window & Computed End Date Preview (M3-E02) */}
      <div className="floating-panel p-6 shadow-xl">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Coverage Window Preview</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          The smart contract computes the official on-chain end time from the start time and duration.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Start Time</span>
            {startTime > 0 ? (
              <div className="mt-1">
                <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                  {formatUtcDateTime(startTime)}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Local: {formatUnixTimestamp(startTime)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-rose-500 font-medium">Please select a start date above</p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Preview End Time (Start + Duration)
            </span>
            {previewEndTime > 0 ? (
              <div className="mt-1">
                <p className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                  {formatUtcDateTime(previewEndTime)}
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Local: {formatUnixTimestamp(previewEndTime)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-400 font-mono">—</p>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-cyan-500/10 p-3.5 text-xs text-cyan-800 dark:text-cyan-200">
          <strong className="text-cyan-700 dark:text-cyan-300">Smart Contract Execution Notice:</strong> The on-chain end time is computed as{" "}
          <code className="font-mono font-bold text-cyan-800 dark:text-cyan-200 bg-cyan-500/15 px-1.5 py-0.5 rounded">startTime + durationSeconds</code>. Rainfall oracle
          reports are submitted only after this coverage window ends.
        </div>
      </div>

      {/* 3. Farm Location & Crop (from Farmer Profile) */}
      <div className="floating-panel p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3.5">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Farmer Farm Profile</h3>
          <Link
            href={ROUTES.PROFILE}
            className="text-xs font-bold text-[#1a5b55] dark:text-[#4ea399] hover:underline transition-colors"
          >
            Edit Profile
          </Link>
        </div>

        {profile ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Latitude</span>
              <p className="mt-0.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                {profile.latitude.toFixed(6)}°
              </p>
              <span className="text-[10px] text-slate-500 font-mono">({latE6} E6)</span>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Longitude</span>
              <p className="mt-0.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                {profile.longitude.toFixed(6)}°
              </p>
              <span className="text-[10px] text-slate-500 font-mono">({lonE6} E6)</span>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Insured Crop</span>
              <p className="mt-0.5 text-xs font-bold capitalize text-slate-900 dark:text-white">{profile.crop}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-3.5 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sowing Date</span>
              <p className="mt-0.5 text-xs font-bold font-mono text-slate-900 dark:text-white">{profile.sowingDate}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-bold text-amber-700 dark:text-amber-300">No Farmer Profile Saved</p>
            <p className="mt-1 text-amber-700/80 dark:text-amber-200/80">
              You must save your farm coordinates and crop before enrolling in a policy.
            </p>
            <Link
              href={ROUTES.PROFILE}
              className="mt-3 inline-block rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
            >
              Complete Profile Now &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* 4. Option 0 Demo Notice */}
      {option.isDemo && (
        <div className="rounded-2xl bg-purple-500/10 p-4 text-xs text-purple-800 dark:text-purple-200 shadow-sm">
          <p className="font-bold text-purple-700 dark:text-purple-300">Demo Mode Policy (Option 0)</p>
          <p className="mt-1 text-purple-700/80 dark:text-purple-200/80 leading-relaxed">
            Option 0 is a 2-hour demonstration policy designed for testing oracle reports and
            payouts during review. It is not an operational insurance policy and provides no
            real financial risk coverage.
          </p>
        </div>
      )}

      {/* 5. Mandatory Disclaimers (M3-E07) & Mock Status */}
      <div className="space-y-3">
        <div className="rounded-2xl bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200 leading-relaxed shadow-sm">
          <strong className="text-amber-700 dark:text-amber-300">Mandatory Disclosure (M3-E07):</strong> RTT (Rainfall Test Tokens) are simulated
          test tokens with no real financial value. No premium is charged to enroll in AgriShield
          policies.
        </div>

        {(MOCK_MODE || !CONTRACT_ADDRESS) && (
          <div className="rounded-2xl bg-purple-500/10 px-4 py-3 text-xs text-purple-800 dark:text-purple-200 leading-relaxed shadow-sm">
            <strong className="text-purple-700 dark:text-purple-300">Mock Mode Active:</strong> No live Member 1 smart contract is currently configured.
            This enrollment transaction will be executed via the in-browser mock contract adapter.
          </div>
        )}
      </div>

      {/* 6. Action & Guard Error Notices (M3-E06) */}
      <div className="pt-2">
        {!walletConnected && (
          <p className="mb-3 text-center text-xs font-semibold text-rose-500">
            Please connect your MetaMask wallet using the button in the top navigation to enroll.
          </p>
        )}

        {walletConnected && isWrongNetwork && (
          <p className="mb-3 text-center text-xs font-semibold text-rose-500">
            Wrong network detected. Please switch your wallet to Localhost Hardhat (Chain ID 31337).
          </p>
        )}

        {walletConnected && !isWrongNetwork && !profile && (
          <p className="mb-3 text-center text-xs font-semibold text-amber-500">
            Profile required: Save your farm coordinates before submitting an enrollment.
          </p>
        )}

        {walletConnected && !isWrongNetwork && profile && !isValidStartTime && (
          <p className="mb-3 text-center text-xs font-semibold text-rose-500">
            Please select a valid future start date aligned to the contract rules above.
          </p>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={!canSubmit}
          className={`w-full rounded-2xl py-4 text-sm font-black uppercase tracking-wider transition-all focus:outline-none ${
            canSubmit
              ? option.isDemo
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-600/30 cursor-pointer active:scale-[0.99]"
                : "bg-[#1a5b55] hover:bg-[#22726b] text-white shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99]"
              : "cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-none"
          }`}
        >
          {isEnrolling
            ? "Submitting Enrollment..."
            : option.isDemo
            ? "Confirm & Enroll Demo Policy #0"
            : `Confirm & Enroll Option #${option.optionId}`}
        </button>

        {walletAddress && (
          <p className="mt-2.5 text-center text-xs text-slate-500 font-mono">
            Enrolling with connected wallet: <span className="text-slate-700 dark:text-slate-300 font-semibold">{shortenAddress(walletAddress)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
