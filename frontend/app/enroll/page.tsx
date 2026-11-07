"use client";

/**
 * app/enroll/page.tsx
 *
 * Full Enrollment Flow implementation (M3-E01 through M3-E08):
 * - Selecting an insurance option from the catalogue (via URL query param ?option=ID or direct dropdown)
 * - Future start date selection with full-hour (Option 0) and whole-day UTC (Options 1–12) rules
 * - AI recommendation start date pre-fill support (M3-E08)
 * - Validation guards: wallet connection, correct network, saved farmer profile (M3-E06)
 * - Complete enrollment summary with computed end time preview (M3-E02, M3-E03)
 * - Confirmation step before submitting on-chain transaction
 * - Submits via contractHelpers.enrollPolicy (with mock adapter fallback)
 * - Full transaction lifecycle indicator: submitting, pending, confirmed with extracted policyId, failed (M3-E04, M3-E05)
 * - Strict adherence to RPD Version 2.0: user cannot customize triggers/duration/payout, test token disclaimer (M3-E07)
 *
 * Upgraded to InsurTech Bento Grid dark theme with Geist typography and glowing neon accents.
 */

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrowserProvider, type JsonRpcSigner } from "ethers";
import { useWallet } from "@/lib/wallet/walletContext";
import { getCatalogue, enrollPolicy } from "@/lib/contract/contractHelpers";
import { CatalogueOption } from "@/lib/mock/mockCatalogue";
import { loadProfile, FarmerProfile } from "@/lib/profile/profileStorage";
import {
  getNextFullHourUnix,
  getNextUtcDayUnix,
  validateStartTime,
} from "@/lib/utils/dateHelpers";
import { mapContractError } from "@/lib/contract/errorMapper";
import { ROUTES } from "@/lib/utils/constants";
import StartDatePicker from "@/components/enrollment/StartDatePicker";
import EnrollReview from "@/components/enrollment/EnrollReview";
import TxStatus, { TxDetails } from "@/components/enrollment/TxStatus";
import { CropTwinLeaves, CropSeedPacket } from "@/components/shared/CropIllustrations";

function EnrollContent() {
  const searchParams = useSearchParams();
  const optionParam = searchParams.get("option");
  const suggestedStartParam = searchParams.get("suggestedStart");

  const { status, address } = useWallet();
  const isConnected = status === "connected";
  const isWrongNetwork = status === "wrong_network";

  const [catalogue, setCatalogue] = useState<CatalogueOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(
    optionParam !== null ? parseInt(optionParam, 10) : 0,
  );
  const [startTime, setStartTime] = useState<number>(0);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [loadingCatalogue, setLoadingCatalogue] = useState<boolean>(true);
  const [tx, setTx] = useState<TxDetails>({ step: "idle" });

  // Optional AI suggested start date from query params (M3-E08)
  const aiSuggestedDate = useMemo(() => {
    if (!suggestedStartParam) return undefined;
    const parsed = parseInt(suggestedStartParam, 10);
    return isNaN(parsed) || parsed <= 0 ? undefined : parsed;
  }, [suggestedStartParam]);

  // Load catalogue on mount
  useEffect(() => {
    let mounted = true;
    getCatalogue()
      .then((opts) => {
        if (mounted) {
          setCatalogue(opts);
          setLoadingCatalogue(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load catalogue:", err);
        if (mounted) setLoadingCatalogue(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Update selectedOptionId if URL query changes
  useEffect(() => {
    if (optionParam !== null) {
      const parsed = parseInt(optionParam, 10);
      if (!isNaN(parsed)) {
        setSelectedOptionId(parsed);
      }
    }
  }, [optionParam]);

  // Load profile whenever connected wallet address changes
  useEffect(() => {
    if (address) {
      const stored = loadProfile(address);
      setProfile(stored);
    } else {
      setProfile(null);
    }
  }, [address]);

  // Active option object
  const selectedOption = useMemo(() => {
    if (selectedOptionId === null || catalogue.length === 0) return null;
    return catalogue.find((o) => o.optionId === selectedOptionId) || null;
  }, [selectedOptionId, catalogue]);

  // Initialize or adjust start time when option changes
  useEffect(() => {
    if (!selectedOption) return;

    // If an AI suggested date is provided and valid, use it
    if (aiSuggestedDate) {
      setStartTime(aiSuggestedDate);
      return;
    }

    // Default to the next valid boundary:
    // Option 0 (Demo): next full hour
    // Options 1–12 (Standard): tomorrow at 00:00:00 UTC
    if (selectedOption.isDemo) {
      setStartTime(getNextFullHourUnix());
    } else {
      setStartTime(getNextUtcDayUnix());
    }
  }, [selectedOption, aiSuggestedDate]);

  // Validation of chosen start time
  const startTimeValidation = useMemo(() => {
    if (!selectedOption || !startTime) return { isValid: false };
    return validateStartTime(startTime, selectedOption.isDemo);
  }, [selectedOption, startTime]);

  // Handler for blockchain submission (M3-E04)
  const handleConfirmEnroll = async () => {
    if (!selectedOption || !profile || !isConnected || isWrongNetwork) {
      return;
    }

    const freshValidation = validateStartTime(startTime, selectedOption.isDemo);
    if (!freshValidation.isValid) {
      setTx({
        step: "failed",
        error: {
          title: "Invalid Start Time",
          message: freshValidation.error || "Coverage start time must be in the future.",
          isUserRejection: false,
        },
      });
      return;
    }

    try {
      setTx({ step: "submitting" });

      let signer: JsonRpcSigner | null = null;
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          signer = await provider.getSigner();
        } catch {
          // In mock mode or fallback, proceed with callerAddress
        }
      }

      const latE6 = Math.round(profile.latitude * 1_000_000);
      const lonE6 = Math.round(profile.longitude * 1_000_000);

      const result = await enrollPolicy(
        selectedOption.optionId,
        startTime,
        latE6,
        lonE6,
        signer,
        address || undefined,
      );

      setTx({
        step: "confirmed",
        txHash: result.transactionHash,
        blockNumber: result.blockNumber,
        policyId: result.policyId,
      });
    } catch (err: unknown) {
      console.error("Enrollment error:", err);
      const mapped = mapContractError(err);
      setTx({
        step: "failed",
        error: mapped,
      });
    }
  };

  const handleResetTx = () => {
    setTx({ step: "idle" });
  };

  if (loadingCatalogue) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#1a5b55] border-t-transparent" />
          <p className="mt-4 text-sm font-mono text-slate-400">Loading policy terms from catalogue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Heading & Breadcrumb */}
      <div>
        <nav className="mb-2 text-xs font-mono text-slate-500">
          <Link href={ROUTES.DASHBOARD} className="hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors">
            Dashboard
          </Link>{" "}
          &gt;{" "}
          <Link href={ROUTES.CATALOGUE} className="hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors">
            Catalogue
          </Link>{" "}
          &gt; <span className="text-slate-700 dark:text-slate-300 font-semibold">Review &amp; Enroll</span>
        </nav>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a5b55]/15 px-3 py-1 text-xs font-bold text-[#1a5b55] dark:text-[#4ea399] shadow-xs">
            <CropSeedPacket className="h-4 w-4" />
            <span>Parametric Smart Contract Enrollment</span>
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light text-slate-900 dark:text-white flex items-center gap-2.5">
          <CropTwinLeaves className="h-8 w-8" />
          <span>Review &amp; Enroll Policy</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure coverage start time, review terms and confirm your smart contract policy.
        </p>
      </div>

      {/* Option Selector Dropdown */}
      <div className="floating-panel p-5 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="option-select" className="text-xs font-bold uppercase tracking-wider text-[#1a5b55] dark:text-[#4ea399]">
              Select Catalogue Option
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose from the 13 fixed contract options (Option 0 Demo or Options 1–12 Seasonal)
            </p>
          </div>
          <select
            id="option-select"
            value={selectedOptionId ?? ""}
            disabled={tx.step === "submitting" || tx.step === "pending"}
            onChange={(e) => {
              setSelectedOptionId(Number(e.target.value));
              setTx({ step: "idle" });
            }}
            className="rounded-2xl bg-slate-100 dark:bg-[#070A0F] px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-[#1a5b55]/50 border-none cursor-pointer"
          >
            {catalogue.map((opt) => (
              <option key={opt.optionId} value={opt.optionId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {opt.isDemo ? "[DEMO 2H] " : `[${opt.riskLabel.toUpperCase()}] `}
                Option #{opt.optionId} &mdash; Trigger: {opt.triggerMm} mm | Payout: {opt.payoutRtt} RTT
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedOption ? (
        <div className="rounded-2xl bg-rose-500/15 p-8 text-center text-rose-700 dark:text-rose-300 shadow-xl">
          <p className="font-bold text-base text-rose-700 dark:text-rose-200">Invalid Policy Option</p>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            The requested policy option ID was not found in the smart contract catalogue.
          </p>
          <Link
            href={ROUTES.CATALOGUE}
            className="mt-4 inline-block rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
          >
            Browse Catalogue &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Step 1 - Start Date Configuration */}
          <div className="space-y-6 lg:col-span-6">
            <div className="floating-panel p-6 shadow-xl">
              <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3.5">
                <span className="inline-block rounded-full bg-cyan-500/15 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 shadow-sm">
                  Step 1 of 2
                </span>
                <h2 className="mt-2 text-base font-extrabold text-slate-900 dark:text-white">
                  Select Coverage Start Date
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {selectedOption.isDemo
                    ? "Option 0 requires a full-hour start time strictly in the future."
                    : "Standard seasonal policies start at 00:00:00 UTC on whole-day boundaries."}
                </p>
              </div>

              <div className="mt-5">
                <StartDatePicker
                  isDemo={selectedOption.isDemo}
                  value={startTime}
                  onChange={(val) => {
                    setStartTime(val);
                    if (tx.step === "failed") setTx({ step: "idle" });
                  }}
                  aiSuggestedDate={aiSuggestedDate}
                  disabled={tx.step === "submitting" || tx.step === "pending"}
                />
              </div>
            </div>

            {/* Profile Check Card */}
            <div className="floating-card p-5 shadow-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Farmer Profile Status
              </h3>
              {profile ? (
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Farm Location:</span>{" "}
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{profile.latitude.toFixed(4)}°, {profile.longitude.toFixed(4)}°</span>
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Crop:</span>{" "}
                    <span className="capitalize text-slate-900 dark:text-white font-bold">{profile.crop}</span>{" "}
                    <span className="text-slate-500 font-mono">(Sown: {profile.sowingDate})</span>
                  </p>
                  <p className="mt-2 text-[#1a5b55] dark:text-[#4ea399] font-bold flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#1a5b55] dark:bg-[#4ea399]" />
                    Profile is ready for on-chain submission
                  </p>
                </div>
              ) : (
                <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-bold">Profile missing for connected wallet.</p>
                  <p className="mt-0.5 text-amber-700/80 dark:text-amber-200/80">
                    Please configure your farm coordinates and crop before enrolling.
                  </p>
                  <Link
                    href={ROUTES.PROFILE}
                    className="mt-2.5 inline-block font-bold text-[#1a5b55] dark:text-[#4ea399] hover:underline"
                  >
                    Go to Profile Setup &rarr;
                  </Link>
                </div>
              )}
            </div>

            {/* Transaction Lifecycle Status (M3-E04, M3-E05) */}
            <TxStatus tx={tx} onReset={handleResetTx} />
          </div>

          {/* Right Column: Step 2 - Review Summary & Confirm */}
          <div className="space-y-6 lg:col-span-6">
            <div className="floating-panel p-6 shadow-xl">
              <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3.5">
                <span className="inline-block rounded-full bg-[#1a5b55]/15 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-[#1a5b55] dark:text-[#4ea399] shadow-xs">
                  Step 2 of 2
                </span>
                <h2 className="mt-2 text-base font-extrabold text-slate-900 dark:text-white">
                  Enrollment Review &amp; Confirmation
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Verify terms, coverage window preview, and submit transaction to the smart contract.
                </p>
              </div>

              <div className="mt-5">
                <EnrollReview
                  option={selectedOption}
                  startTime={startTime}
                  profile={profile}
                  walletConnected={isConnected}
                  walletAddress={address}
                  isWrongNetwork={isWrongNetwork}
                  isValidStartTime={startTimeValidation.isValid}
                  isEnrolling={tx.step === "submitting" || tx.step === "pending"}
                  onConfirm={handleConfirmEnroll}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EnrollPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#1a5b55] border-t-transparent" />
            <p className="mt-4 text-sm font-mono text-slate-400">Loading enrollment review...</p>
          </div>
        </div>
      }
    >
      <EnrollContent />
    </Suspense>
  );
}
