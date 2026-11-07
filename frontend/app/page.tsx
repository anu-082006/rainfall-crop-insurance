"use client";

/**
 * app/page.tsx – Farmer Dashboard (/)
 *
 * Upgraded to:
 * - Pure Pitch Black (#000000) in Dark Mode, Pure Crisp White (#FFFFFF) in Light Mode.
 * - Primary Green #1a5b55 brand accents.
 * - Borderless floating cards with deep, multi-layered diffuse drop shadows.
 * - Interactive Bento Grid & 4-step automated settlement flow.
 * - 100% preservation of wallet state, mock adapters, and contract calls (M3-D01 to M3-D05).
 */

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet/walletContext";
import { shortenAddress, formatRtt } from "@/lib/utils/formatters";
import { ROUTES } from "@/lib/utils/constants";
import { getPoliciesForOwner } from "@/lib/contract/contractHelpers";
import { OnChainPolicy } from "@/lib/mock/mockPolicies";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorNotice from "@/components/shared/ErrorNotice";
import PolicyCard from "@/components/policies/PolicyCard";
import {
  CropSproutMascot,
  CropLeaf,
  CropTwinLeaves,
  RainCloudCrop,
  LeafShield,
  ContractSeedling,
  HarvestPayoutCoins,
  GoldenHarvestSheaf,
  FarmFieldPlot,
  CropSeedPacket,
  FieldLedger,
  ProtectedSproutUmbrella,
} from "@/components/shared/CropIllustrations";

export default function DashboardPage() {
  const {
    status,
    address,
    chainName,
    rttBalance,
    balanceLoading,
    error,
    connect,
  } = useWallet();

  const [policies, setPolicies] = useState<OnChainPolicy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState<boolean>(false);
  const [policyError, setPolicyError] = useState<string | null>(null);

  // Fetch policies for connected owner (M3-D01)
  const fetchPolicies = useCallback(async () => {
    if (!address) {
      setPolicies([]);
      return;
    }

    try {
      setLoadingPolicies(true);
      setPolicyError(null);
      const results = await getPoliciesForOwner(address);
      setPolicies(results);
    } catch (err: unknown) {
      console.error("Failed to load policies for owner:", err);
      setPolicyError("Could not retrieve policies from the contract.");
    } finally {
      setLoadingPolicies(false);
    }
  }, [address]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      
      {/* ── Page Header & Subtitle ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a5b55]/10 dark:bg-[#1a5b55]/20 text-[#1a5b55] dark:text-[#4ea399] text-xs font-bold mb-2">
            <CropLeaf className="h-3.5 w-3.5" />
            <span>Decentralized Rainfall Risk Protocol</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Farmer Dashboard</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Automated weather shortfall coverage powered by ECMWF ERA5 reanalysis, Chainlink CRE runtime, and autonomous EVM settlements.
          </p>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#0D1218] px-4 py-2.5 text-xs font-mono shadow-sm">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">System:</span>
            <span className="text-[#1a5b55] dark:text-[#4ea399] font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#1a5b55] dark:bg-[#4ea399] inline-block" />
              Operational
            </span>
          </div>
        </div>
      </div>

      {/* ── Hero Bento Grid Row: Wallet Hub & Automated Telemetry Pipeline ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bento 1: Wallet & Capital Hub (5 cols) */}
        <div className="lg:col-span-5 rounded-3xl floating-panel p-6 sm:p-7 relative overflow-hidden group">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2.5">
              <GoldenHarvestSheaf className="h-5 w-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Wallet & Liquidity Hub
              </h2>
            </div>
            {address && (
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Connected
              </span>
            )}
          </div>

          <div className="mt-5 space-y-4">
            {/* Disconnected / Connect Prompt */}
            {status !== "connected" && status !== "wrong_network" && (
              <div className="flex flex-col items-center gap-3.5 py-6 text-center">
                <GoldenHarvestSheaf className="h-10 w-10" />
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
                  Connect your Web3 wallet to inspect your active coverage windows, view claim entitlements, or enroll in crop protection.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-1">
                  <button
                    type="button"
                    onClick={connect}
                    className="rounded-xl bg-[#1a5b55] px-6 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg hover:bg-[#22726b] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Connect Wallet
                  </button>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors"
                  >
                    Get MetaMask &rarr;
                  </a>
                </div>
                {error && <ErrorNotice message={error} className="mt-2 w-full" />}
              </div>
            )}

            {/* Connected State Details */}
            {(status === "connected" || status === "wrong_network") && address && (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0D1218] shadow-xs">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Wallet Address
                    </p>
                    <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-slate-100" title={address}>
                      {shortenAddress(address, 6)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#0D1218] shadow-xs">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Active Network
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#1a5b55] dark:text-[#4ea399] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1a5b55] dark:bg-[#4ea399]" />
                      {chainName ?? "Localhost 8545"}
                    </p>
                  </div>
                </div>

                {/* RTT Balance Highlight Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-transparent shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 font-bold">
                        Available Balance
                      </p>
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        {balanceLoading ? (
                          <span className="text-xl font-bold font-mono text-amber-500">…</span>
                        ) : (
                          <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-300 tracking-tight">
                            {formatRtt(rttBalance)}
                          </span>
                        )}
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">RTT</span>
                      </div>
                    </div>
                    {/* Harvest Grain Payout Icon */}
                    <HarvestPayoutCoins className="h-8 w-8" />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    ERC-20 test tokens used for policy premiums and automated payouts.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bento 2: Automated Telemetry Pipeline (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl floating-panel p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2.5">
                {/* Pipeline Icon */}
                <LeafShield className="h-5 w-5" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Automated Settlement Pipeline
                </h2>
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full">
                Zero Human Intervention
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Parametric insurance eliminates loss adjusters. Verified rainfall observations trigger smart contracts directly at policy maturity.
            </p>
          </div>

          {/* Floating Flow Diagram - Friendly Crop Cartoon Telemetry */}
          <div className="my-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center relative">
            
            {/* Step 1 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1218] shadow-md hover:-translate-y-1 transition-all flex flex-col items-center">
              <RainCloudCrop className="h-8 w-8 mb-1.5" />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">1. Weather API</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">ERA5 Archive</p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1218] shadow-md hover:-translate-y-1 transition-all flex flex-col items-center">
              <LeafShield className="h-8 w-8 mb-1.5" />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">2. Chainlink CRE</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">BFT Consensus</p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1218] shadow-md hover:-translate-y-1 transition-all flex flex-col items-center">
              <ContractSeedling className="h-8 w-8 mb-1.5" />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">3. Contract</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">Deficit Trigger</p>
            </div>

            {/* Step 4 */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1218] shadow-md hover:-translate-y-1 transition-all flex flex-col items-center">
              <HarvestPayoutCoins className="h-8 w-8 mb-1.5" />
              <p className="text-xs font-bold text-slate-900 dark:text-slate-200">4. Auto Payout</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">Immediate Transfer</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#080B0F] text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs">
            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium">
              Rule: If Cumulative Rainfall &lt; Trigger Threshold → Full Payout Disbursed
            </span>
            <span className="font-mono text-[10px] font-bold text-[#1a5b55] dark:text-[#4ea399] bg-[#1a5b55]/10 px-2.5 py-0.5 rounded-full">
              Guaranteed
            </span>
          </div>
        </div>

      </div>

      {/* ── Quick Action Cards (Bento Row 2) ─────────────────────────── */}
      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Quick Launchpads
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          
          <ActionCard
            href={ROUTES.PROFILE}
            title="Farm Profile & Geolocation"
            description="Configure your farm coordinates, crop variety and sowing date to enable calibrated AI recommendations."
            badge="Personalize"
            icon={<FarmFieldPlot className="h-7 w-7" />}
          />

          <ActionCard
            href={ROUTES.CATALOGUE}
            title="Browse Policy Catalogue"
            description="Explore the 13 fixed contract options (30-120 days) and view live Random Forest advisory risk scores."
            badge="13 Options"
            icon={<CropSeedPacket className="h-7 w-7" />}
          />

          <ActionCard
            href={ROUTES.HISTORY}
            title="Transaction Audit Ledger"
            description="Review immutable on-chain logs for policy enrollments, verified rainfall reports, and claim payouts."
            badge="EVM Ledger"
            icon={<FieldLedger className="h-7 w-7" />}
          />

        </div>
      </section>

      {/* ── My Policies section (M3-D01 to M3-D05) ────────────────────── */}
      <section aria-labelledby="policies-heading" className="space-y-4 pt-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="policies-heading" className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Active & Past Policies
              </h2>
              {policies.length > 0 && (
                <span className="rounded-full bg-[#1a5b55]/15 dark:bg-[#1a5b55]/30 px-3 py-0.5 text-xs font-mono font-bold text-[#1a5b55] dark:text-[#4ea399]">
                  {policies.length} {policies.length === 1 ? "Policy" : "Policies"}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Smart insurance contracts registered to your connected wallet address.
            </p>
          </div>

          {/* Refresh Button (M3-D05) */}
          <button
            type="button"
            onClick={fetchPolicies}
            disabled={loadingPolicies}
            className="inline-flex items-center gap-1.5 self-start rounded-xl bg-white dark:bg-[#0D1218] px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-md hover:-translate-y-0.5 transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
          >
            <svg
              className={`h-3.5 w-3.5 text-[#1a5b55] dark:text-[#4ea399] ${loadingPolicies ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loadingPolicies ? "Syncing..." : "Refresh Policies"}</span>
          </button>
        </div>

        {policyError && <ErrorNotice message={policyError} className="mb-4" />}

        {loadingPolicies ? (
          <div className="rounded-3xl floating-panel p-16 text-center">
            <LoadingSpinner message="Querying on-chain policy registry…" />
          </div>
        ) : policies.length > 0 ? (
          /* Grid of Policy Cards (M3-D02) */
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy) => (
              <PolicyCard key={policy.policyId} policy={policy} />
            ))}
          </div>
        ) : (
          /* Empty State with CTA (M3-D04) */
          <div className="rounded-3xl floating-panel p-12 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center">
              <ProtectedSproutUmbrella className="h-16 w-16" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Insurance Policies Yet</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              You haven&apos;t enrolled in any crop protection policies yet. Set up your farm profile to get AI-calibrated recommendations or select a policy option directly from the catalogue.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href={ROUTES.PROFILE}
                className="rounded-xl bg-slate-100 dark:bg-[#0D1218] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:scale-105 transition-all"
              >
                Set Up Farm Profile
              </Link>
              <Link
                href={ROUTES.CATALOGUE}
                className="rounded-xl bg-[#1a5b55] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#22726b] hover:scale-105 transition-all"
              >
                Browse Catalogue &rarr;
              </Link>
            </div>
          </div>
        )}
      </section>

    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  badge,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl floating-card p-6 focus:outline-none flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-3.5">
          {/* Action Icon (No Square Border) */}
          <div className="text-[#1a5b55] dark:text-[#4ea399] group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1a5b55] dark:text-[#4ea399] bg-[#1a5b55]/10 dark:bg-[#1a5b55]/20 px-2.5 py-1 rounded-full">
            {badge}
          </span>
        </div>
        <h3 className="font-extrabold text-slate-900 dark:text-white group-hover:text-[#1a5b55] dark:group-hover:text-[#4ea399] transition-colors text-sm">
          {title}
        </h3>
        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs font-bold text-[#1a5b55] dark:text-[#4ea399]">
        <span>Explore Launchpad &rarr;</span>
        <span className="h-2 w-2 rounded-full bg-[#1a5b55] dark:bg-[#4ea399] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}
