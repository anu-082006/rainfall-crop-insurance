"use client";

/**
 * app/catalogue/page.tsx
 *
 * Screen 2 & Screen 3: Policy Catalogue & AI Advisory (M3-C01 to M3-C04, M3-AP01 to AP07, M3-AP09).
 * Upgraded to InsurTech Bento Grid dark theme with Geist typography and neon accents.
 *
 * Requirements:
 * - Reads catalogue dynamically from contract or mock reader (never hardcoded in UI).
 * - Displays all 13 options with risk badges and duration filters.
 * - Prominently flags Option 0 as the Demo option (2 hours).
 * - Mounts AiRecommendationPanel (Screen 3) with AI advisory, deficit probabilities, and pre-fill CTA.
 * - Connects recommended option and probability indicators to CatalogueTable & OptionCard.
 */

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useWallet } from "@/lib/wallet/walletContext";
import { getCatalogue } from "@/lib/contract/contractHelpers";
import { CatalogueOption } from "@/lib/mock/mockCatalogue";
import { loadProfile, FarmerProfile } from "@/lib/profile/profileStorage";
import { RecommendResponse } from "@/lib/ai/aiClient";
import CatalogueTable from "@/components/catalogue/CatalogueTable";
import AiRecommendationPanel from "@/components/ai/AiRecommendationPanel";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ErrorNotice from "@/components/shared/ErrorNotice";
import { ROUTES } from "@/lib/utils/constants";
import { CropSeedPacket, CropTwinLeaves } from "@/components/shared/CropIllustrations";

export default function CataloguePage() {
  const { address } = useWallet();

  const [options, setOptions] = useState<CatalogueOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<RecommendResponse | null>(null);

  // Load catalogue data
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCatalogue();
        if (active) {
          setOptions(data);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : "Failed to load policy catalogue.";
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  // Check and load connected wallet's saved profile
  useEffect(() => {
    if (address) {
      const p = loadProfile(address);
      setProfile(p);
    } else {
      setProfile(null);
    }
  }, [address]);

  // Map option_id -> probability_below_trigger for quick card lookup
  const probabilitiesMap = useMemo(() => {
    if (!aiRecommendation?.options) return undefined;
    const map: Record<number, number | null> = {};
    for (const opt of aiRecommendation.options) {
      map[opt.option_id] = opt.probability_below_trigger;
    }
    return map;
  }, [aiRecommendation]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a5b55]/15 px-3 py-1 text-xs font-bold text-[#1a5b55] dark:text-[#4ea399] shadow-xs">
              <CropSeedPacket className="h-4 w-4" />
              <span>On-Chain Catalogue &bull; 13 Options</span>
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
              Zero Premium (RTT)
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 dark:text-white">
            Policy Catalogue
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Choose from 13 fixed parametric crop insurance options. Coverage triggers and payouts are predetermined by the smart contract.
          </p>
        </div>

        {profile && (
          <div className="floating-card px-4 py-3 rounded-2xl text-xs flex items-center gap-3 self-start sm:self-auto shadow-md">
            <CropTwinLeaves className="h-6 w-6" />
            <div>
              <p className="text-slate-500 dark:text-slate-400">Insured Farm Profile</p>
              <p className="text-slate-900 dark:text-white font-mono font-bold">
                {profile.crop.toUpperCase()} &bull; {profile.latitude.toFixed(2)}°N, {profile.longitude.toFixed(2)}°E
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Profile Prompt Banner (if profile missing) */}
      {!profile && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 floating-panel p-5 text-amber-800 dark:text-amber-200 shadow-xl bg-amber-500/10">
          <div className="flex items-center gap-3">
            <CropTwinLeaves className="h-8 w-8 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-amber-100">
                Farmer profile not configured
              </p>
              <p className="text-xs text-slate-600 dark:text-amber-300/80 mt-0.5">
                Set up your coordinates and crop to unlock calibrated AI risk advisory and deficit probabilities.
              </p>
            </div>
          </div>
          <Link
            href={ROUTES.PROFILE}
            className="flex-shrink-0 rounded-2xl bg-[#1a5b55] hover:bg-[#22726b] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Set Up Profile &rarr;
          </Link>
        </div>
      )}

      {/* ── Screen 3: AI Policy Recommendation Panel (M3-AP01 to M3-AP07, M3-AP09) ── */}
      <AiRecommendationPanel
        profile={profile}
        catalogue={options}
        onRecommendationLoaded={setAiRecommendation}
      />

      {/* ── Main Catalogue Grid (Screen 2 / M3-C01 to M3-C04) ────────────────────── */}
      {loading ? (
        <div className="py-24">
          <LoadingSpinner message="Reading policy catalogue from contract..." centered size="lg" />
        </div>
      ) : error ? (
        <ErrorNotice
          title="Could Not Load Policy Catalogue"
          message={error}
          variant="error"
        />
      ) : (
        <CatalogueTable
          options={options}
          recommendedOptionId={aiRecommendation?.recommended_option_id}
          probabilitiesMap={probabilitiesMap}
          suggestedStartDate={aiRecommendation?.suggested_start_date}
        />
      )}
    </div>
  );
}
