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
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">
              Selected Policy Option #{option.optionId}
            </h3>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                option.isDemo
                  ? "bg-purple-100 text-purple-800"
                  : option.riskLabel === "Severe"
                  ? "bg-red-100 text-red-800"
                  : option.riskLabel === "Moderate"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {option.riskLabel}
            </span>
          </div>
          <Link
            href={ROUTES.CATALOGUE}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Change Option
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-xs text-gray-500">Duration</span>
            <p className="mt-0.5 text-sm font-bold text-gray-900">
              {formatDuration(option.durationSeconds)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-xs text-gray-500">Trigger Threshold</span>
            <p className="mt-0.5 text-sm font-bold text-gray-900">
              {formatRainfall(option.triggerMm)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-xs text-gray-500">Guaranteed Payout</span>
            <p className="mt-0.5 text-sm font-bold text-gray-900">
              {formatRtt(option.payoutRtt.toString(), 0)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <span className="text-xs text-gray-500">Premium Cost</span>
            <p className="mt-0.5 text-sm font-bold text-emerald-600">0 RTT (Free)</p>
          </div>
        </div>

        <p className="mt-3 text-[11px] text-gray-600">
          * Policy triggers, durations, and payout amounts are fixed by the on-chain smart
          contract catalogue and cannot be customized.
        </p>
      </div>

      {/* 2. Coverage Window & Computed End Date Preview (M3-E02) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Coverage Window Preview</h3>
        <p className="text-xs text-gray-500">
          The smart contract computes the official on-chain end time from the start time and duration.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <span className="text-xs font-semibold text-gray-600">Start Time</span>
            {startTime > 0 ? (
              <div className="mt-1">
                <p className="font-mono text-xs font-bold text-gray-900">
                  {formatUtcDateTime(startTime)}
                </p>
                <p className="text-[11px] text-gray-500">
                  Local: {formatUnixTimestamp(startTime)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-red-500 font-medium">Please select a start date above</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <span className="text-xs font-semibold text-gray-600">
              Preview End Time (Start + Duration)
            </span>
            {previewEndTime > 0 ? (
              <div className="mt-1">
                <p className="font-mono text-xs font-bold text-gray-900">
                  {formatUtcDateTime(previewEndTime)}
                </p>
                <p className="text-[11px] text-gray-500">
                  Local: {formatUnixTimestamp(previewEndTime)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-400 font-mono">—</p>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-lg bg-blue-50/60 p-2.5 text-[11px] text-blue-900">
          <strong>Smart Contract Execution Notice:</strong> The on-chain end time is computed as{" "}
          <code className="font-mono text-blue-800">startTime + durationSeconds</code>. Rainfall oracle
          reports are submitted only after this coverage window ends.
        </div>
      </div>

      {/* 3. Farm Location & Crop (from Farmer Profile) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-sm font-bold text-gray-900">Farmer Farm Profile</h3>
          <Link
            href={ROUTES.PROFILE}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
          >
            Edit Profile
          </Link>
        </div>

        {profile ? (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <span className="text-xs text-gray-500">Latitude</span>
              <p className="mt-0.5 font-mono text-xs font-bold text-gray-900">
                {profile.latitude.toFixed(6)}°
              </p>
              <span className="text-[10px] text-gray-600">({latE6} E6)</span>
            </div>

            <div>
              <span className="text-xs text-gray-500">Longitude</span>
              <p className="mt-0.5 font-mono text-xs font-bold text-gray-900">
                {profile.longitude.toFixed(6)}°
              </p>
              <span className="text-[10px] text-gray-600">({lonE6} E6)</span>
            </div>

            <div>
              <span className="text-xs text-gray-500">Insured Crop</span>
              <p className="mt-0.5 text-xs font-bold text-gray-900">{profile.crop}</p>
            </div>

            <div>
              <span className="text-xs text-gray-500">Sowing Date</span>
              <p className="mt-0.5 text-xs font-bold text-gray-900">{profile.sowingDate}</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <p className="font-semibold">No Farmer Profile Saved</p>
            <p className="mt-1 text-amber-800">
              You must save your farm coordinates and crop before enrolling in a policy.
            </p>
            <Link
              href={ROUTES.PROFILE}
              className="mt-3 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
            >
              Complete Profile Now &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* 4. Option 0 Demo Notice */}
      {option.isDemo && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-xs text-purple-900">
          <p className="font-bold">Demo Mode Policy (Option 0)</p>
          <p className="mt-1 text-purple-800">
            Option 0 is a 2-hour demonstration policy designed for testing oracle reports and
            payouts during review. It is not an operational insurance policy and provides no
            real financial risk coverage.
          </p>
        </div>
      )}

      {/* 5. Mandatory Disclaimers (M3-E07) & Mock Status */}
      <div className="space-y-3">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
          <strong>Mandatory Disclosure (M3-E07):</strong> RTT (Rainfall Test Tokens) are simulated
          test tokens with no real financial value. No premium is charged to enroll in AgriShield
          policies.
        </div>

        {(MOCK_MODE || !CONTRACT_ADDRESS) && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-xs text-purple-800">
            <strong>Mock Mode Active:</strong> No live Member 1 smart contract is currently configured.
            This enrollment transaction will be executed via the in-browser mock contract adapter.
          </div>
        )}
      </div>

      {/* 6. Action & Guard Error Notices (M3-E06) */}
      <div className="pt-2">
        {!walletConnected && (
          <p className="mb-3 text-center text-xs font-semibold text-red-600">
            Please connect your MetaMask wallet using the button in the top navigation to enroll.
          </p>
        )}

        {walletConnected && isWrongNetwork && (
          <p className="mb-3 text-center text-xs font-semibold text-red-600">
            Wrong network detected. Please switch your wallet to Localhost Hardhat (Chain ID 31337).
          </p>
        )}

        {walletConnected && !isWrongNetwork && !profile && (
          <p className="mb-3 text-center text-xs font-semibold text-amber-700">
            Profile required: Save your farm coordinates before submitting an enrollment.
          </p>
        )}

        {walletConnected && !isWrongNetwork && profile && !isValidStartTime && (
          <p className="mb-3 text-center text-xs font-semibold text-red-600">
            Please select a valid future start date aligned to the contract rules above.
          </p>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={!canSubmit}
          className={`w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition focus:outline-none focus:ring-2 ${
            canSubmit
              ? option.isDemo
                ? "bg-purple-700 hover:bg-purple-800 focus:ring-purple-400"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-400"
              : "cursor-not-allowed bg-gray-300 text-gray-500 shadow-none"
          }`}
        >
          {isEnrolling
            ? "Submitting Enrollment..."
            : option.isDemo
            ? "Confirm & Enroll Demo Policy #0"
            : `Confirm & Enroll Option #${option.optionId}`}
        </button>

        {walletAddress && (
          <p className="mt-2 text-center text-xs text-gray-600">
            Enrolling with connected wallet: <span className="font-mono">{shortenAddress(walletAddress)}</span>
          </p>
        )}
      </div>
    </div>
  );
}
