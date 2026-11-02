"use client";

/**
 * app/catalogue/page.tsx
 *
 * Screen 2 & Screen 3: Policy Catalogue & AI Advisory (M3-C01 to M3-C04, M3-AP01 to AP07, M3-AP09).
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Policy Catalogue
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Choose from 13 fixed parametric crop insurance options. Coverage triggers and payouts are predetermined by the smart contract.
        </p>
      </div>

      {/* Profile Prompt Banner (if profile missing) */}
      {!profile && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm font-medium">
              You haven&apos;t set up your farmer profile yet. Configure your location and crop to receive calibrated AI advisory recommendations.
            </p>
          </div>
          <Link
            href={ROUTES.PROFILE}
            className="flex-shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
          >
            Set Up Profile
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
