"use client";

/**
 * app/policies/[id]/page.tsx
 *
 * Comprehensive Policy Details, Rainfall Report, and Claim Screen (Screens 5 to 7 / M3-D02, M3-R01 to M3-R09):
 * - Displays policy terms, coordinates, and coverage timing.
 * - Dynamic status derivation according to RPD Section 8 precedence rules.
 * - RainfallReportCard with observed vs trigger comparison; NEVER displays 0 mm when report is missing (M3-R02).
 * - ResultCard with authoritative smart contract verdict and RTT payout terms (M3-R08).
 * - ClaimButton with ownership check, disabled reason explanations, and full claim transaction lifecycle (M3-R03–R06, M3-R09).
 * - Refreshes wallet RTT token balance upon confirmed claim settlement.
 * - Appropriate loading, empty/not-found, and error states.
 */

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatUnits } from "ethers";
import { useWallet } from "@/lib/wallet/walletContext";
import { getPolicy, getCatalogue } from "@/lib/contract/contractHelpers";
import { OnChainPolicy } from "@/lib/mock/mockPolicies";
import { CatalogueOption } from "@/lib/mock/mockCatalogue";
import { getStatusForPolicy } from "@/lib/contract/policyStatus";
import {
  formatDuration,
  formatRainfall,
  formatRtt,
  formatUnixTimestamp,
  shortenAddress,
} from "@/lib/utils/formatters";
import { formatUtcDateTime } from "@/lib/utils/dateHelpers";
import { CONTRACT_ADDRESS, MOCK_MODE, ROUTES, RTT_DECIMALS } from "@/lib/utils/constants";
import StatusBadge from "@/components/shared/StatusBadge";
import RainfallReportCard from "@/components/policies/RainfallReportCard";
import ResultCard from "@/components/policies/ResultCard";
import ClaimButton from "@/components/policies/ClaimButton";

export default function PolicyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string | undefined;
  const policyId = rawId ? parseInt(rawId, 10) : NaN;

  const { status: walletStatus, address, refreshBalance } = useWallet();
  const isWrongNetwork = walletStatus === "wrong_network";

  const [policy, setPolicy] = useState<OnChainPolicy | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch policy and catalogue data
  const loadData = useCallback(async () => {
    if (isNaN(policyId)) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [loadedPolicy, loadedCatalogue] = await Promise.all([
        getPolicy(policyId, address || ""),
        getCatalogue(),
      ]);

      setPolicy(loadedPolicy);
      setCatalogue(loadedCatalogue);
    } catch (err: unknown) {
      console.error("Error loading policy detail:", err);
      setError("Failed to load policy details from the blockchain.");
    } finally {
      setLoading(false);
    }
  }, [policyId, address]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived current policy status (RPD Section 8)
  const status = useMemo(() => {
    if (!policy) return null;
    return getStatusForPolicy(policy);
  }, [policy]);

  // Matched catalogue option
  const matchedOption = useMemo(() => {
    if (!policy || catalogue.length === 0) return null;
    return catalogue.find((o) => o.optionId === policy.optionId) || null;
  }, [policy, catalogue]);

  // Handler when claim is confirmed on-chain
  const handleClaimSuccess = () => {
    // Optimistically update policy to claimed state
    setPolicy((prev) => (prev ? { ...prev, claimed: true } : prev));
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <h2 className="mt-4 text-base font-semibold text-gray-800">
          Loading Policy #{rawId}…
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Querying on-chain state and oracle data…
        </p>
      </div>
    );
  }

  // 2. Error / Invalid ID State
  if (isNaN(policyId)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-8">
          <h2 className="text-lg font-bold text-red-900">Invalid Policy ID</h2>
          <p className="mt-2 text-sm text-red-700">
            The URL contains an invalid policy identifier.
          </p>
          <Link
            href={ROUTES.DASHBOARD}
            className="mt-5 inline-block rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 3. Not Found State
  if (!policy || !status) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="mt-3 text-lg font-bold text-gray-900">
            Policy #{policyId} Not Found
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {error ||
              "No policy with this ID could be found for your account on the smart contract."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Go Back
            </button>
            <Link
              href={ROUTES.DASHBOARD}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwner =
    address !== null &&
    address.toLowerCase() === policy.owner.toLowerCase();

  const latDeg = (policy.latitudeE6 / 1_000_000).toFixed(6);
  const lonDeg = (policy.longitudeE6 / 1_000_000).toFixed(6);
  const payoutFormatted = formatRtt(
    formatUnits(policy.payoutAmount, RTT_DECIMALS),
    0
  );
  const durationSeconds = policy.endTime - policy.startTime;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Breadcrumb & Navigation ────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-gray-500">
        <Link href={ROUTES.DASHBOARD} className="hover:text-gray-700">
          Dashboard
        </Link>{" "}
        &gt;{" "}
        <span className="font-semibold text-gray-800">
          Policy #{policy.policyId}
        </span>
      </nav>

      {/* ── Policy Header & Status ─────────────────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-gray-600">
                Policy #{policy.policyId}
              </span>
              <StatusBadge code={status.code} label={status.label} size="lg" />
              {policy.optionId === 0 && (
                <span className="rounded-full bg-purple-700 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                  DEMO (2 HOURS)
                </span>
              )}
              {matchedOption && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    matchedOption.riskLabel === "Severe"
                      ? "bg-red-100 text-red-800"
                      : matchedOption.riskLabel === "Moderate"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {matchedOption.riskLabel}
                </span>
              )}
            </div>

            <h1 className="mt-2 text-2xl font-black text-gray-900">
              {matchedOption
                ? `Option #${policy.optionId}: ${matchedOption.riskLabel} Risk (${formatDuration(durationSeconds)})`
                : `Policy #${policy.policyId} Details`}
            </h1>

            <p className="mt-1 text-xs text-gray-600">{status.description}</p>
          </div>

          {/* Ownership Pill */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs sm:text-right">
            <span className="text-gray-500">Policy Owner</span>
            <p className="font-mono font-semibold text-gray-800">
              {shortenAddress(policy.owner, 6)}
            </p>
            {isOwner ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                &#10003; Connected Wallet (Owner)
              </span>
            ) : (
              <span className="text-[11px] text-gray-500">Read-only view</span>
            )}
          </div>
        </div>

        {/* ── Fixed Terms Metric Strip ─────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-4">
          <div>
            <span className="text-xs text-gray-500 font-medium">Trigger Threshold</span>
            <p className="mt-0.5 text-base font-bold text-gray-900">
              {formatRainfall(policy.thresholdMm)}
            </p>
            <p className="text-[10px] text-gray-600">Fixed deficit trigger</p>
          </div>

          <div>
            <span className="text-xs text-gray-500 font-medium">Guaranteed Payout</span>
            <p className="mt-0.5 text-base font-bold text-emerald-600">
              {payoutFormatted}
            </p>
            <p className="text-[10px] text-gray-600">Simulated test RTT</p>
          </div>

          <div>
            <span className="text-xs text-gray-500 font-medium">Duration</span>
            <p className="mt-0.5 text-base font-bold text-gray-900">
              {formatDuration(durationSeconds)}
            </p>
            <p className="text-[10px] text-gray-600">On-chain window</p>
          </div>

          <div>
            <span className="text-xs text-gray-500 font-medium">Farm Coordinates</span>
            <p className="mt-0.5 font-mono text-xs font-bold text-gray-900">
              {latDeg}°, {lonDeg}°
            </p>
            <p className="text-[10px] text-gray-600 font-mono">
              ({policy.latitudeE6}, {policy.longitudeE6} E6)
            </p>
          </div>
        </div>

        {/* Coverage Window Dates */}
        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-semibold text-gray-800">Coverage Window:</span>{" "}
              <span className="font-mono text-gray-700">{formatUtcDateTime(policy.startTime)}</span>
              {" "}&rarr;{" "}
              <span className="font-mono text-gray-700">{formatUtcDateTime(policy.endTime)}</span>
            </div>
            <div className="text-[11px] text-gray-600">
              (Local: {formatUnixTimestamp(policy.startTime)} &ndash; {formatUnixTimestamp(policy.endTime)})
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Detail Grid: Rainfall Report & Outcomes ───────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Rainfall Report & Result Cards */}
        <div className="space-y-6 lg:col-span-7">
          {/* Section 1: Rainfall Report (M3-R01, M3-R02, M3-R07) */}
          <RainfallReportCard policy={policy} status={status} />

          {/* Section 2: Result Outcome (Screen 6 / M3-R08) */}
          <ResultCard policy={policy} status={status} />
        </div>

        {/* Right Column (5 cols): Claim Action & Notice Cards */}
        <div className="space-y-6 lg:col-span-5">
          {/* Section 3: Claim Execution Card (M3-R03 to M3-R06, M3-R09) */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900">Claim Insurance Payout</h3>
            <p className="text-xs text-gray-500 mb-4">
              Payouts can be claimed once the weather oracle submits a verified deficit report.
            </p>

            <ClaimButton
              policy={policy}
              status={status}
              walletAddress={address}
              isWrongNetwork={isWrongNetwork}
              onClaimSuccess={handleClaimSuccess}
              refreshBalance={refreshBalance}
            />
          </div>

          {/* Explanatory Disclaimers */}
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs text-yellow-800 space-y-2">
            <p className="font-bold">Test Environment Disclaimer (M3-NF07 / M3-E07)</p>
            <p className="text-yellow-700">
              RTT (Rainfall Test Tokens) are simulated tokens with no monetary value. No real funds,
              premiums, or operational indemnities are involved in this prototype.
            </p>
          </div>

          {/* Mock disclosure if active */}
          {(MOCK_MODE || !CONTRACT_ADDRESS) && (
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-xs text-purple-900">
              <p className="font-bold">Simulated Contract Adapter Active</p>
              <p className="mt-1 text-purple-700">
                Connected in mock mode. State updates and transactions are handled by the local mock contract
                adapter in accordance with RPD Appendix A.3.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
