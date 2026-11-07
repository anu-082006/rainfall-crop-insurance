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
 *
 * Upgraded to InsurTech dark Bento Grid design with Geist typography and neon telemetry accents.
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
import { CropSproutMascot, ProtectedSproutUmbrella } from "@/components/shared/CropIllustrations";

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
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#1a5b55] border-t-transparent" />
        <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          Loading Policy #{rawId}…
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
          Querying on-chain state and oracle data…
        </p>
      </div>
    );
  }

  // 2. Error / Invalid ID State
  if (isNaN(policyId)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-3xl floating-panel p-8 text-center bg-rose-50/50 dark:bg-rose-950/20 shadow-xl">
          <h2 className="text-lg font-bold text-rose-800 dark:text-rose-200">Invalid Policy ID</h2>
          <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
            The URL contains an invalid policy identifier.
          </p>
          <Link
            href={ROUTES.DASHBOARD}
            className="mt-5 inline-block rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors shadow-md"
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
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="floating-panel p-8 shadow-xl">
          <ProtectedSproutUmbrella className="mx-auto h-16 w-16 mb-2" />
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">
            Policy #{policyId} Not Found
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {error ||
              "No policy with this ID could be found for your account on the smart contract."}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Go Back
            </button>
            <Link
              href={ROUTES.DASHBOARD}
              className="rounded-xl bg-[#1a5b55] hover:bg-[#22726b] px-4 py-2 text-xs font-bold text-white shadow-md transition-all"
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* ── Breadcrumb & Navigation ────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="text-xs font-mono text-slate-500">
        <Link href={ROUTES.DASHBOARD} className="hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors">
          Dashboard
        </Link>{" "}
        &gt;{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Policy #{policy.policyId}
        </span>
      </nav>

      {/* ── Policy Header & Status ─────────────────────────────────────────── */}
      <div className="floating-panel p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CropSproutMascot className="h-6 w-6" />
              <span className="font-mono text-sm font-bold text-slate-600 dark:text-slate-300">
                Policy #{policy.policyId}
              </span>
              <StatusBadge code={status.code} label={status.label} size="lg" />
              {policy.optionId === 0 && (
                <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 shadow-sm">
                  DEMO (2 HOURS)
                </span>
              )}
              {matchedOption && (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-sm ${
                    matchedOption.riskLabel === "Severe"
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      : matchedOption.riskLabel === "Moderate"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                  }`}
                >
                  {matchedOption.riskLabel}
                </span>
              )}
            </div>

            <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {matchedOption
                ? `Option #${policy.optionId}: ${matchedOption.riskLabel} Risk (${formatDuration(durationSeconds)})`
                : `Policy #${policy.policyId} Details`}
            </h1>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{status.description}</p>
          </div>

          {/* Ownership Pill */}
          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 text-xs sm:text-right shadow-sm">
            <span className="text-slate-500 dark:text-slate-400">Policy Owner</span>
            <p className="font-mono font-bold text-slate-900 dark:text-white">
              {shortenAddress(policy.owner, 6)}
            </p>
            {isOwner ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1a5b55] dark:text-[#4ea399] mt-0.5">
                &#10003; Connected Wallet (Owner)
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 mt-0.5">Read-only view</span>
            )}
          </div>
        </div>

        {/* ── Fixed Terms Metric Strip ─────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-5 sm:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Trigger Threshold</span>
            <p className="mt-0.5 text-base font-bold text-cyan-600 dark:text-cyan-400 font-mono">
              {formatRainfall(policy.thresholdMm)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">Fixed deficit trigger</p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Guaranteed Payout</span>
            <p className="mt-0.5 text-base font-bold text-amber-600 dark:text-amber-400 font-mono">
              {payoutFormatted}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">Simulated test RTT</p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Duration</span>
            <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white font-mono">
              {formatDuration(durationSeconds)}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">On-chain window</p>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Farm Coordinates</span>
            <p className="mt-0.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
              {latDeg}°, {lonDeg}°
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              ({policy.latitudeE6}, {policy.longitudeE6} E6)
            </p>
          </div>
        </div>

        {/* Coverage Window Dates */}
        <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 text-xs text-slate-700 dark:text-slate-300 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-semibold text-slate-500 dark:text-slate-400">Coverage Window:</span>{" "}
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatUtcDateTime(policy.startTime)}</span>
              {" "}&rarr;{" "}
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatUtcDateTime(policy.endTime)}</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              (Local: {formatUnixTimestamp(policy.startTime)} &ndash; {formatUnixTimestamp(policy.endTime)})
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Detail Grid: Rainfall Report & Outcomes ───────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (7 cols): Rainfall Report & Result Cards */}
        <div className="space-y-6 lg:col-span-7">
          {/* Section 1: Rainfall Report (M3-R01, M3-R02, M3-R07) */}
          <RainfallReportCard policy={policy} status={status} />

          {/* Section 2: Result Outcome (Screen 6 / M3-R08) */}
          <ResultCard policy={policy} status={status} />
        </div>

        {/* Right Column (5 cols): Claim Action & Notice Cards */}
        <div className="space-y-6 lg:col-span-5">
          {/* Section 3: Claim Execution Card (M3-R03 to M3-R06, M3-R09) */}
          <div className="floating-panel p-6 shadow-xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Claim Insurance Payout</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 mt-0.5">
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
          <div className="rounded-2xl bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200 space-y-2 shadow-sm">
            <p className="font-bold text-amber-700 dark:text-amber-300">Test Environment Disclaimer (M3-NF07 / M3-E07)</p>
            <p className="text-amber-700/80 dark:text-amber-200/80 leading-relaxed">
              RTT (Rainfall Test Tokens) are simulated tokens with no monetary value. No real funds,
              premiums, or operational indemnities are involved in this prototype.
            </p>
          </div>

          {/* Mock disclosure if active */}
          {(MOCK_MODE || !CONTRACT_ADDRESS) && (
            <div className="rounded-2xl bg-purple-500/10 p-4 text-xs text-purple-800 dark:text-purple-200 shadow-sm">
              <p className="font-bold text-purple-700 dark:text-purple-300">Simulated Contract Adapter Active</p>
              <p className="mt-1 text-purple-700/80 dark:text-purple-200/80 leading-relaxed">
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
