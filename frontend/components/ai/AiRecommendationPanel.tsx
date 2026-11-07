"use client";

/**
 * AiRecommendationPanel.tsx
 *
 * Screen 3: AI Policy Recommendation Panel (M3-AP01 to M3-AP07, M3-AP09).
 * Upgraded to borderless shadowy floating layout with Primary Green #1a5b55.
 *
 * Preserves 100% of underlying state logic, recommendation hooks, and event handlers.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  fetchAiRecommendation,
  AiServiceError,
  RecommendResponse,
} from "@/lib/ai/aiClient";
import { CatalogueOption } from "@/lib/mock/mockCatalogue";
import { FarmerProfile } from "@/lib/profile/profileStorage";
import {
  formatProbability,
  formatRainfall,
  formatRtt,
  formatDuration,
} from "@/lib/utils/formatters";
import { fromDateOnlyInputToUtc } from "@/lib/utils/dateHelpers";
import { AI_API_URL, ROUTES } from "@/lib/utils/constants";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { CropTwinLeaves } from "@/components/shared/CropIllustrations";

interface AiRecommendationPanelProps {
  profile: FarmerProfile | null;
  catalogue: CatalogueOption[];
  onRecommendationLoaded?: (response: RecommendResponse | null) => void;
}

export default function AiRecommendationPanel({
  profile,
  catalogue,
  onRecommendationLoaded,
}: AiRecommendationPanelProps) {
  const [recommendation, setRecommendation] = useState<RecommendResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  // Fetch AI recommendation
  const loadRecommendation = useCallback(async () => {
    if (!profile) {
      setRecommendation(null);
      setError(null);
      setIsUnavailable(false);
      onRecommendationLoaded?.(null);
      return;
    }

    setLoading(true);
    setError(null);
    setIsUnavailable(false);

    try {
      const data = await fetchAiRecommendation(profile, catalogue);
      setRecommendation(data);
      onRecommendationLoaded?.(data);
    } catch (err: unknown) {
      let msg = "Could not fetch AI recommendation.";
      let unavailable = false;

      if (err instanceof AiServiceError) {
        msg = err.message;
        unavailable = err.isUnavailable;
      } else if (err instanceof Error) {
        msg = err.message;
      }

      setError(msg);
      setIsUnavailable(unavailable);
      setRecommendation(null);
      onRecommendationLoaded?.(null);
    } finally {
      setLoading(false);
    }
  }, [profile, catalogue, onRecommendationLoaded]);

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  // Find the recommended catalogue option details
  const recommendedOption = useMemo(() => {
    if (!recommendation) return null;
    return catalogue.find((opt) => opt.optionId === recommendation.recommended_option_id) || null;
  }, [recommendation, catalogue]);

  // Find applicability data for the recommended option
  const recommendedApplicability = useMemo(() => {
    if (!recommendation) return null;
    return recommendation.options.find(
      (opt) => opt.option_id === recommendation.recommended_option_id
    ) || null;
  }, [recommendation]);

  // Convert suggested start date (YYYY-MM-DD) to Unix timestamp
  const suggestedStartUnix = useMemo(() => {
    if (!recommendation?.suggested_start_date) return undefined;
    const ts = fromDateOnlyInputToUtc(recommendation.suggested_start_date);
    return ts > 0 ? ts : undefined;
  }, [recommendation]);

  // Flag if mock model is active
  const isMockModel = useMemo(() => {
    if (!recommendation) return false;
    return (
      recommendation.model_version.toLowerCase().includes("mock") ||
      recommendation.model_name.toLowerCase().includes("mock")
    );
  }, [recommendation]);

  // ── 1. No Profile State (M3-AP05) ──────────────────────────────────────────
  if (!profile) {
    return (
      <div className="rounded-3xl floating-panel p-6 sm:p-7 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <CropTwinLeaves className="h-6 w-6 mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-light text-slate-900 dark:text-white">
                  AI Policy Recommendation
                </h3>
                <span className="rounded-full bg-[#1a5b55]/10 dark:bg-[#1a5b55]/25 px-2.5 py-0.5 text-[10px] font-bold text-[#1a5b55] dark:text-[#4ea399]">
                  Advisory Layer
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-xl leading-relaxed">
                Configure your farmer profile with your farm coordinates, crop type, and sowing date to generate calibrated rainfall deficit risk analysis.
              </p>
            </div>
          </div>

          <Link
            href={ROUTES.PROFILE}
            className="inline-flex flex-shrink-0 items-center justify-center rounded-xl bg-[#1a5b55] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#22726b] hover:scale-105 transition-all"
          >
            Configure Farm Profile &rarr;
          </Link>
        </div>

        {/* Advisory disclaimer footer (M3-AP04) */}
        <div className="mt-5 border-t border-slate-100 dark:border-slate-800/60 pt-3.5 text-[11px] text-slate-500 font-mono">
          <strong className="text-slate-700 dark:text-slate-300">Advisory only:</strong> AI estimates historical risk; the smart contract solely determines on-chain claim eligibility.
        </div>
      </div>
    );
  }

  // ── 2. Loading State (M3-AP05) ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-3xl floating-panel p-10 text-center">
        <div className="flex flex-col items-center justify-center">
          <LoadingSpinner size="md" />
          <h3 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
            Querying AI Risk Engine…
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
            Analyzing 75-year ECMWF ERA5 distributions and aligning growth-stage deficit probabilities for your {profile.crop} crop.
          </p>
        </div>
      </div>
    );
  }

  // ── 3. Error / Service Unavailable State (M3-AP05, M3-AP06) ─────────────────
  if (error || !recommendation) {
    return (
      <div className="rounded-3xl floating-panel p-6 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-lg shadow-xs">
              !
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-amber-700 dark:text-amber-300">
                  AI Recommendation Service Offline
                </h3>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold">
                  Optional Service
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                {isUnavailable
                  ? `Could not reach the AI recommendation backend at ${AI_API_URL}. The service is optional; you can browse the catalogue below, manually select any policy option, and enroll directly.`
                  : error || "An unexpected error occurred while communicating with the AI service."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRecommendation}
            className="flex-shrink-0 rounded-xl bg-amber-500/15 px-4 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/25 transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <strong className="text-slate-700 dark:text-slate-300">Advisory note:</strong> The AI recommendation service is purely advisory. When unavailable, manual catalogue browsing, enrollment, and smart contract claim settlements remain 100% operational (M3-AP06).
        </div>
      </div>
    );
  }

  // ── 4. Active Recommendation State (M3-AP01 to AP04, AP07, AP09) ───────────
  const deficitProbability = recommendedApplicability?.probability_below_trigger ?? 0;
  const deficitPct = formatProbability(deficitProbability);

  return (
    <div className="rounded-3xl floating-panel p-6 sm:p-7 space-y-6 relative overflow-hidden">
      
      {/* ── Panel Header & Disclaimers (M3-AP01, M3-AP04) ────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <CropTwinLeaves className="h-6 w-6 flex-shrink-0" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-light tracking-tight text-slate-900 dark:text-white">
                AI Policy Recommendation
              </h2>
              {/* Mock Model Badge */}
              {isMockModel ? (
                <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 px-3 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  MOCK AI MODEL
                </span>
              ) : (
                <span className="rounded-full bg-[#1a5b55]/10 dark:bg-[#1a5b55]/30 px-3 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#1a5b55] dark:text-[#4ea399]">
                  Random Forest v1.0
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Calibrated agro-climatic assessment based on 75-year ECMWF ERA5 precipitation archives.
            </p>
          </div>
        </div>

        {/* Permanent Advisory Label (M3-AP04) */}
        <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] px-4 py-2 shadow-xs text-right">
          <p className="text-[11px] font-mono text-[#1a5b55] dark:text-[#4ea399] font-bold leading-tight">
            Advisory only &bull; Smart contract decides claim eligibility
          </p>
        </div>
      </div>

      {/* ── Farmer Context & Model Metadata Strip ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-[#080B0F] px-4 py-3 text-xs text-slate-600 dark:text-slate-300 font-mono shadow-xs">
        <div>
          <span className="text-slate-400">Profile Context:</span>{" "}
          <span className="capitalize font-bold text-[#1a5b55] dark:text-[#4ea399]">{profile.crop}</span> | Sown:{" "}
          <span className="text-slate-900 dark:text-slate-200 font-semibold">{profile.sowingDate}</span> | Farm:{" "}
          <span className="text-slate-900 dark:text-slate-200 font-semibold">
            {profile.latitude.toFixed(4)}°, {profile.longitude.toFixed(4)}°
          </span>
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Model: <span className="text-[#1a5b55] dark:text-[#4ea399] font-bold">{recommendation.model_name} ({recommendation.model_version})</span> | Range:{" "}
          <span className="text-slate-700 dark:text-slate-300">{recommendation.trained_on_range}</span>
        </div>
      </div>

      {/* ── Main Recommended Option Card (M3-AP02) ─────────────────────────── */}
      {recommendedOption && (
        <div className="relative overflow-hidden rounded-3xl floating-card p-6 sm:p-7 shadow-xl ring-2 ring-[#1a5b55] dark:ring-[#4ea399]/40">
          
          {/* Top-right Recommended Badge */}
          <div className="absolute top-0 right-0 rounded-bl-2xl bg-[#1a5b55] px-4 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-white shadow-md">
            Top Recommendation
          </div>

          <div className="space-y-4">
            {/* Header: Option ID and Risk Tier */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Option #{recommendedOption.optionId}
                </span>
                <span className="rounded-full bg-[#1a5b55]/15 dark:bg-[#1a5b55]/30 px-3 py-0.5 text-xs font-bold text-[#1a5b55] dark:text-[#4ea399]">
                  {recommendedOption.riskLabel} Protection
                </span>
              </div>
              <h3 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {recommendedOption.durationLabel} Coverage Window
              </h3>
            </div>

            {/* Plain Statement of Risk (M3-AP02) */}
            <div className="rounded-2xl bg-slate-50 dark:bg-[#080B0F] p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="text-[#1a5b55] dark:text-[#4ea399] flex-shrink-0 mt-0.5">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    Estimated {deficitPct} chance rainfall is below {formatRainfall(recommendedOption.triggerMm)}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {recommendation.rationale}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Parametric Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-y border-slate-100 dark:border-slate-800/60 py-4">
              
              {/* Metric 1: Deficit Probability */}
              <div className="rounded-2xl bg-slate-50 dark:bg-[#080B0F] p-3.5 shadow-xs">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Deficit Risk
                </span>
                <p className="mt-1 text-2xl font-black font-mono text-[#1a5b55] dark:text-[#4ea399]">
                  {deficitPct}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">probability_below_trigger</p>
              </div>

              {/* Metric 2: Trigger mm */}
              <div className="rounded-2xl bg-slate-50 dark:bg-[#080B0F] p-3.5 shadow-xs">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Rainfall Trigger
                </span>
                <p className="mt-1 text-2xl font-black font-mono text-slate-900 dark:text-white">
                  {formatRainfall(recommendedOption.triggerMm)}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">Strictly below (&lt;)</p>
              </div>

              {/* Metric 3: Payout in RTT */}
              <div className="rounded-2xl bg-slate-50 dark:bg-[#080B0F] p-3.5 shadow-xs">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Fixed Payout
                </span>
                <p className="mt-1 text-2xl font-black font-mono text-amber-600 dark:text-amber-300">
                  {formatRtt(recommendedOption.payoutRtt.toString(), 0)}
                </p>
                <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-mono">Simulated RTT Tokens</p>
              </div>

              {/* Metric 4: Suggested Start Date */}
              <div className="rounded-2xl bg-slate-50 dark:bg-[#080B0F] p-3.5 shadow-xs">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Suggested Start
                </span>
                <p className="mt-1 font-mono text-lg font-bold text-cyan-600 dark:text-cyan-300">
                  {recommendation.suggested_start_date}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">Stage alignment</p>
              </div>
            </div>

            {/* Action CTA Button */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Link
                  href={`${ROUTES.ENROLL}?option=${recommendedOption.optionId}${
                    suggestedStartUnix ? `&suggestedStart=${suggestedStartUnix}` : ""
                  }`}
                  className="inline-flex items-center justify-center rounded-xl bg-[#1a5b55] px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-md hover:shadow-lg hover:bg-[#22726b] hover:scale-[1.01] transition-all focus:outline-none"
                >
                  Select Recommended Option &amp; Pre-fill Date &rarr;
                </Link>

                <button
                  type="button"
                  onClick={() => setShowComparison(!showComparison)}
                  className="rounded-xl bg-slate-100 dark:bg-[#0D1218] px-5 py-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                >
                  {showComparison ? "Hide Comparison" : "Compare All Options (M3-AP03)"}
                </button>
              </div>

              <p className="mt-2 text-[11px] text-slate-500">
                * Clicking above pre-fills the enrollment terms. You can review or adjust parameters before submitting. No transaction is initiated automatically (M3-AP07).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comparative Evaluation List Across All Options */}
      {showComparison && (
        <div className="rounded-3xl floating-card p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Comparative Deficit Probability Across All Options (M3-AP03)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Estimated probability of seasonal rainfall falling strictly below each option&apos;s trigger threshold.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowComparison(false)}
              className="text-xs font-mono font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              [Close]
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 overflow-x-auto">
            {recommendation.options.map((optApp) => {
              const opt = catalogue.find((c) => c.optionId === optApp.option_id);
              if (!opt) return null;
              const isSelected = opt.optionId === recommendation.recommended_option_id;

              return (
                <div
                  key={opt.optionId}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-3 rounded-2xl transition ${
                    isSelected ? "bg-[#1a5b55]/10 dark:bg-[#1a5b55]/20 shadow-xs" : "hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  }`}
                >
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        Option #{opt.optionId}
                      </span>
                      {opt.isDemo ? (
                        <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 text-[10px] font-mono font-bold text-purple-700 dark:text-purple-300">
                          Demo (2h)
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                            opt.riskLabel === "Severe"
                              ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                              : opt.riskLabel === "Moderate"
                              ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                              : "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
                          }`}
                        >
                          {opt.riskLabel}
                        </span>
                      )}
                      {isSelected && (
                        <span className="rounded-full bg-[#1a5b55] px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase text-white shadow-xs">
                          AI Top Pick
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 font-mono">
                      {formatDuration(opt.durationSeconds)} | Trigger: {formatRainfall(opt.triggerMm)} | Payout: {opt.payoutRtt} RTT
                    </div>
                  </div>

                  <div className="flex-1 max-w-xs">
                    {optApp.applicable && optApp.probability_below_trigger !== null ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-500 text-[11px]">Deficit Probability:</span>
                          <span className="font-bold text-[#1a5b55] dark:text-[#4ea399]">
                            {formatProbability(optApp.probability_below_trigger)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              optApp.probability_below_trigger > 0.6
                                ? "bg-[#1a5b55] dark:bg-[#4ea399]"
                                : optApp.probability_below_trigger > 0.35
                                ? "bg-amber-500"
                                : "bg-sky-500"
                            }`}
                            style={{
                              width: `${Math.round(optApp.probability_below_trigger * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        {optApp.reason || "Not applicable for seasonal models"}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <Link
                      href={`${ROUTES.ENROLL}?option=${opt.optionId}${
                        suggestedStartUnix ? `&suggestedStart=${suggestedStartUnix}` : ""
                      }`}
                      className={`inline-block rounded-xl px-4 py-2 text-xs font-mono font-bold transition shadow-xs ${
                        isSelected
                          ? "bg-[#1a5b55] text-white hover:bg-[#22726b]"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      {isSelected ? "Select Pick" : `Select #${opt.optionId}`}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expandable Note on Model Limitations */}
      <details className="rounded-2xl bg-slate-50 dark:bg-[#080B0F] p-4 text-xs text-slate-500 dark:text-slate-400 transition shadow-xs">
        <summary className="cursor-pointer font-bold text-slate-800 dark:text-slate-200 hover:text-[#1a5b55]">
          Model Limitations &amp; Agricultural Methodology (RPD M3-AP09)
        </summary>
        <div className="mt-3 space-y-2 text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 pt-3 font-mono text-[11px]">
          <p>
            <strong className="text-slate-800 dark:text-slate-200">Methodology:</strong> Recommendations are derived by aligning the selected crop&apos;s critical growth stage window (40-70 DAS pegging &amp; pod formation for Groundnut) with historical precipitation data sourced from ECMWF ERA5 reanalysis archives (1950&ndash;2024).
          </p>
          <p>
            <strong className="text-slate-800 dark:text-slate-200">Statistical Baseline:</strong> In this evaluation build ({recommendation.model_name} v{recommendation.model_version}), probabilities reflect calibrated Random Forest ensemble distributions across duration windows.
          </p>
          <p>
            <strong className="text-slate-800 dark:text-slate-200">Key Limitations:</strong> Extreme anomalous climate events, microclimatic variations, and unseasonable localized weather patterns may deviate from long-term projections. Option 0 (2-hour Demo) is strictly intended for smart contract testing and is permanently excluded from agricultural AI recommendations.
          </p>
          <p>
            <strong className="text-slate-800 dark:text-slate-200">Authority Reminder:</strong> AI estimates are non-binding and advisory. Only the smart contract evaluates real-time oracle rainfall reports to decide claim settlement and eligibility.
          </p>
        </div>
      </details>
    </div>
  );
}
