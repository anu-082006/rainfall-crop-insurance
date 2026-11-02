"use client";

/**
 * app/page.tsx – Farmer Dashboard (/)
 *
 * Full Dashboard implementation (M3-D01 through M3-D05):
 * - Connected wallet card with address, network, and RTT balance
 * - Quick action links to Profile, Catalogue, and History
 * - On-chain policy list loaded dynamically for the connected wallet (M3-D01)
 * - Policy cards with derived status badges, metrics, and direct links to /policies/[id] (M3-D02, M3-D03)
 * - Empty state with call-to-action to complete profile or browse catalogue (M3-D04)
 * - Manual and post-transaction refresh capability (M3-D05)
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

export default function DashboardPage() {
  const {
    status,
    address,
    chainName,
    rttBalance,
    balanceLoading,
    error,
    isMetaMaskInstalled,
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
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Smart Rainfall-Based Crop Protection
        </p>
      </div>

      {/* ── Wallet status card ─────────────────────────────────────────── */}
      <section aria-labelledby="wallet-heading" className="mb-8">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 id="wallet-heading" className="text-lg font-semibold text-gray-800">
              Wallet Status
            </h2>
          </div>
          <div className="p-6">
            {/* MetaMask missing */}
            {!isMetaMaskInstalled && (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <p className="text-gray-600">
                  MetaMask is not installed. Please install the browser extension to interact with AgriShield.
                </p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-orange-700 focus:outline-none"
                >
                  Install MetaMask &rarr;
                </a>
              </div>
            )}

            {/* Disconnected */}
            {status === "disconnected" && isMetaMaskInstalled && (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <p className="text-gray-600">
                  Connect your MetaMask wallet to view your policies and enroll in crop insurance.
                </p>
                <button
                  onClick={connect}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Connect Wallet
                </button>
                {error && <ErrorNotice message={error} className="mt-2 w-full max-w-sm" />}
              </div>
            )}

            {/* Connected (correct or wrong network) */}
            {(status === "connected" || status === "wrong_network") && address && (
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Address */}
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Wallet Address
                  </p>
                  <p
                    className="mt-1 font-mono text-sm font-semibold text-gray-800 break-all"
                    title={address}
                  >
                    {shortenAddress(address, 6)}
                  </p>
                </div>

                {/* Network */}
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Network
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {chainName ?? "Unknown"}
                  </p>
                </div>

                {/* RTT Balance */}
                <div className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    RTT Balance
                  </p>
                  {balanceLoading ? (
                    <LoadingSpinner message="Loading…" size="sm" className="mt-1" />
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {formatRtt(rttBalance)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-gray-400">
                    Test tokens — no real value
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Quick actions ──────────────────────────────────────────────── */}
      {(status === "connected" || status === "wrong_network") && (
        <section aria-labelledby="actions-heading" className="mb-8">
          <h2 id="actions-heading" className="mb-4 text-lg font-semibold text-gray-800">
            Quick Actions
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ActionCard
              href={ROUTES.PROFILE}
              title="My Profile"
              description="Set your farm location, crop type and sowing date. Used for AI recommendations."
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <ActionCard
              href={ROUTES.CATALOGUE}
              title="Browse Catalogue"
              description="View all 13 policy options and get an AI recommendation tailored to your crop."
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
              }
            />
            <ActionCard
              href={ROUTES.HISTORY}
              title="Transaction History"
              description="View your enrollment, rainfall report and claim events."
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
        </section>
      )}

      {/* ── My Policies section (M3-D01 to M3-D05) ────────────────────── */}
      {(status === "connected" || status === "wrong_network") && (
        <section aria-labelledby="policies-heading" className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="policies-heading" className="text-lg font-semibold text-gray-800">
                My Policies
              </h2>
              <p className="text-xs text-gray-500">
                On-chain coverage policies registered to your wallet address.
              </p>
            </div>

            {/* Refresh Button (M3-D05) */}
            <button
              type="button"
              onClick={fetchPolicies}
              disabled={loadingPolicies}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none disabled:opacity-50"
            >
              <svg
                className={`h-3.5 w-3.5 ${loadingPolicies ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loadingPolicies ? "Refreshing..." : "Refresh Policies"}</span>
            </button>
          </div>

          {policyError && <ErrorNotice message={policyError} className="mb-4" />}

          {loadingPolicies ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <LoadingSpinner message="Reading policies from the blockchain…" />
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
            <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-gray-500">
              <svg
                className="mx-auto mb-3 h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
                />
              </svg>
              <h3 className="text-base font-bold text-gray-800">No Insurance Policies Yet</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-md mx-auto">
                You haven&apos;t enrolled in any crop protection policies yet. Configure your farm
                coordinates or choose an option from the catalogue to get started.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <Link
                  href={ROUTES.PROFILE}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Set Up Profile
                </Link>
                <Link
                  href={ROUTES.CATALOGUE}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                >
                  Browse Catalogue &rarr;
                </Link>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2 text-blue-600 group-hover:bg-blue-100 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  );
}
