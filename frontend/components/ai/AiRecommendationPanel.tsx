"use client";

/**
 * AiRecommendationPanel.tsx
 *
 * Screen 3: AI Policy Recommendation Panel (M3-AP01 to M3-AP07, M3-AP09).
 *
 * Implements:
 * - Visually distinct panel titled "AI Policy Recommendation" (M3-AP01)
 * - Displays recommended option, duration, suggested start date, trigger, payout,
 *   and plain statement with estimated probability_below_trigger (M3-AP02)
 * - Comparative evaluation across all applicable catalogue options with Option 0 excluded (M3-AP03)
 * - Permanent advisory label: "Advisory only. AI helps you choose; the contract decides eligibility and payout" (M3-AP04)
 * - Clear loading, empty, and unavailable/offline error states with retry support (M3-AP05, M3-AP06)
 * - Strict non-execution guard: AI suggestions pre-fill enrollment on Screen 4 but NEVER initiate transactions (M3-AP07)
 * - Expandable model limitations and assumptions note (M3-AP09)
 * - Clearly discloses "MOCK AI RECOMMENDATION" when mock model is active
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
      <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-blue-50/50 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-sm">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-indigo-950">
                  AI Policy Recommendation
                </h3>
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                  Advisory Only
                </span>
              </div>
              <p className="mt-1 text-xs text-indigo-900/80">
                Configure your farmer profile with your farm&apos;s coordinates, crop type, and sowing date to generate calibrated rainfall deficit risk analysis.
              </p>
            </div>
          </div>

          <Link
            href={ROUTES.PROFILE}
            className="inline-flex flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            Configure Profile
          </Link>
        </div>

        {/* Advisory disclaimer footer (M3-AP04) */}
        <div className="mt-4 border-t border-indigo-100 pt-3 text-[11px] text-indigo-800/80">
          <strong>Advisory only:</strong> AI helps you choose; the smart contract decides eligibility and payout.
        </div>
      </div>
    );
  }

  // ── 2. Loading State (M3-AP05) ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-blue-50/50 p-8 shadow-sm text-center">
        <div className="flex flex-col items-center justify-center">
          <LoadingSpinner size="md" />
          <h3 className="mt-4 text-sm font-bold text-indigo-950">
            Querying AI Recommendation Service...
          </h3>
          <p className="mt-1 text-xs text-indigo-700/80 max-w-md">
            Analyzing historical rainfall distributions and calculating growth-stage deficit probabilities for your {profile.crop} crop.
          </p>
        </div>
      </div>
    );
  }

  // ── 3. Error / Service Unavailable State (M3-AP05, M3-AP06) ─────────────────
  if (error || !recommendation) {
    return (
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white font-bold text-lg shadow-sm">
              !
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-amber-950">
                  AI Recommendation Service Offline
                </h3>
                <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  Optional Service
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
                {isUnavailable
                  ? `Could not reach the AI recommendation backend at ${AI_API_URL}. The service is optional; you can browse the catalogue below, manually select any policy option, and enroll directly.`
                  : error || "An unexpected error occurred while communicating with the AI service."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRecommendation}
            className="flex-shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100 transition"
          >
            Retry Connection
          </button>
        </div>

        <div className="border-t border-amber-200/60 pt-3 text-[11px] text-amber-900/80">
          <strong>Advisory note:</strong> The AI recommendation service is purely advisory. When unavailable, manual catalogue browsing, enrollment, and smart contract claim settlements remain 100% operational (M3-AP06).
        </div>
      </div>
    );
  }

  // ── 4. Active Recommendation State (M3-AP01 to AP04, AP07, AP09) ───────────
  const deficitProbability = recommendedApplicability?.probability_below_trigger ?? 0;
  const deficitPct = formatProbability(deficitProbability);

  return (
    <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-slate-50 p-6 shadow-md space-y-6">
      {/* ── Panel Header & Disclaimers (M3-AP01, M3-AP04) ────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-200/70 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-sm">
            AI
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-indigo-950">
                AI Policy Recommendation
              </h2>
              {/* Mock Model Badge */}
              {isMockModel && (
                <span className="rounded-full bg-purple-700 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                  MOCK AI RECOMMENDATION
                </span>
              )}
            </div>
            <p className="text-xs text-indigo-800/80">
              Calibrated agro-climatic assessment based on historical precipitation archives.
            </p>
          </div>
        </div>

        {/* Permanent Advisory Label (M3-AP04) */}
        <div className="rounded-xl border border-indigo-200 bg-white/80 px-3 py-1.5 shadow-xs">
          <p className="text-[11px] font-bold text-indigo-900 leading-tight">
            Advisory only. AI helps you choose; the contract decides eligibility and payout.
          </p>
        </div>
      </div>

      {/* ── Farmer Context & Model Metadata Strip ───────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-4 py-2.5 text-xs text-indigo-950 border border-indigo-100">
        <div>
          <span className="font-semibold text-indigo-900">Profile Context:</span>{" "}
          <span className="capitalize font-bold text-indigo-950">{profile.crop}</span> | Sown:{" "}
          <span className="font-mono text-gray-700">{profile.sowingDate}</span> | Farm:{" "}
          <span className="font-mono text-gray-700">
            {profile.latitude.toFixed(2)}°, {profile.longitude.toFixed(2)}°
          </span>
        </div>
        <div className="text-[11px] text-indigo-700">
          Model: <span className="font-mono font-medium">{recommendation.model_name} ({recommendation.model_version})</span> | Baseline:{" "}
          <span className="font-mono">{recommendation.trained_on_range}</span>
        </div>
      </div>

      {/* ── Main Recommended Option Card (M3-AP02) ─────────────────────────── */}
      {recommendedOption && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500 bg-white p-6 shadow-md ring-4 ring-emerald-500/10">
          {/* Top-right Recommended Badge */}
          <div className="absolute top-0 right-0 rounded-bl-xl bg-emerald-600 px-4 py-1 text-xs font-black uppercase tracking-wider text-white shadow-sm">
            Top Recommendation
          </div>

          <div className="space-y-4">
            {/* Header: Option ID and Risk Tier */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
                  Option #{recommendedOption.optionId}
                </span>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  {recommendedOption.riskLabel} Protection
                </span>
              </div>
              <h3 className="mt-1 text-2xl font-black text-gray-900">
                {recommendedOption.durationLabel} Coverage Window
              </h3>
            </div>

            {/* Plain Statement of Risk (M3-AP02) */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-indigo-950">
              <div className="flex items-start gap-3">
                <span className="text-xl">📊</span>
                <div>
                  <p className="text-sm font-black text-indigo-950">
                    Estimated {deficitPct} chance rainfall is below {formatRainfall(recommendedOption.triggerMm)}
                  </p>
                  <p className="mt-1 text-xs text-indigo-900/90 leading-relaxed">
                    {recommendation.rationale}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Parametric Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 border-y border-gray-100 py-4">
              {/* Metric 1: Deficit Probability */}
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Deficit Risk
                </span>
                <p className="mt-0.5 text-2xl font-black text-emerald-700">
                  {deficitPct}
                </p>
                <p className="text-[10px] text-gray-500">probability_below_trigger</p>
              </div>

              {/* Metric 2: Trigger mm */}
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Rainfall Trigger
                </span>
                <p className="mt-0.5 text-2xl font-black text-gray-900">
                  {formatRainfall(recommendedOption.triggerMm)}
                </p>
                <p className="text-[10px] text-gray-500">Strictly below</p>
              </div>

              {/* Metric 3: Payout in RTT */}
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Fixed Payout
                </span>
                <p className="mt-0.5 text-2xl font-black text-blue-700">
                  {formatRtt(recommendedOption.payoutRtt.toString(), 0)}
                </p>
                <p className="text-[10px] text-gray-500">Simulated test RTT</p>
              </div>

              {/* Metric 4: Suggested Start Date */}
              <div className="rounded-xl bg-gray-50 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Suggested Start
                </span>
                <p className="mt-0.5 font-mono text-base font-black text-gray-900">
                  {recommendation.suggested_start_date}
                </p>
                <p className="text-[10px] text-gray-500">Optimal stage alignment</p>
              </div>
            </div>

            {/* ── Action CTA Button (M3-AP07 & M3-E08) ───────────────────────── */}
            <div className="pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Link
                  href={`${ROUTES.ENROLL}?option=${recommendedOption.optionId}${
                    suggestedStartUnix ? `&suggestedStart=${suggestedStartUnix}` : ""
                  }`}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  Select Recommended Option &amp; Pre-fill Date &rarr;
                </Link>

                <button
                  type="button"
                  onClick={() => setShowComparison(!showComparison)}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                >
                  {showComparison ? "Hide Comparison" : "Compare All Options (M3-AP03)"}
                </button>
              </div>

              <p className="mt-2 text-[11px] text-gray-500">
                * Clicking above navigates to the enrollment review page with terms pre-filled. You can edit any parameter or reject the recommendation before confirming. No transaction is initiated automatically (M3-AP07).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Comparative Evaluation List Across All Options (M3-AP03) ──────────── */}
      {showComparison && (
        <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                Comparative Deficit Probability Across All Options (M3-AP03)
              </h3>
              <p className="text-xs text-gray-500">
                Estimated probability of seasonal rainfall falling strictly below each option&apos;s trigger threshold.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowComparison(false)}
              className="text-xs font-semibold text-gray-400 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          <div className="divide-y divide-gray-100 overflow-x-auto">
            {recommendation.options.map((optApp) => {
              const opt = catalogue.find((c) => c.optionId === optApp.option_id);
              if (!opt) return null;
              const isSelected = opt.optionId === recommendation.recommended_option_id;

              return (
                <div
                  key={opt.optionId}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-2 rounded-lg transition ${
                    isSelected ? "bg-emerald-50/60 font-semibold" : "hover:bg-gray-50"
                  }`}
                >
                  {/* Option identity & risk tier */}
                  <div className="min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-700">
                        Option #{opt.optionId}
                      </span>
                      {opt.isDemo ? (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                          Demo (2h)
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            opt.riskLabel === "Severe"
                              ? "bg-red-100 text-red-800"
                              : opt.riskLabel === "Moderate"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {opt.riskLabel}
                        </span>
                      )}
                      {isSelected && (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-extrabold uppercase text-white">
                          AI Top Pick
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      {formatDuration(opt.durationSeconds)} | Trigger: {formatRainfall(opt.triggerMm)} | Payout: {opt.payoutRtt} RTT
                    </div>
                  </div>

                  {/* Applicability / Probability display */}
                  <div className="flex-1 max-w-xs">
                    {optApp.applicable && optApp.probability_below_trigger !== null ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">Deficit Probability:</span>
                          <span className="font-mono font-bold text-gray-900">
                            {formatProbability(optApp.probability_below_trigger)}
                          </span>
                        </div>
                        {/* Probability Progress Bar */}
                        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              optApp.probability_below_trigger > 0.6
                                ? "bg-emerald-500"
                                : optApp.probability_below_trigger > 0.35
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                            style={{
                              width: `${Math.round(optApp.probability_below_trigger * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 italic">
                        {optApp.reason || "Not applicable for seasonal models"}
                      </div>
                    )}
                  </div>

                  {/* Manual selection action CTA */}
                  <div className="flex-shrink-0">
                    <Link
                      href={`${ROUTES.ENROLL}?option=${opt.optionId}${
                        suggestedStartUnix ? `&suggestedStart=${suggestedStartUnix}` : ""
                      }`}
                      className={`inline-block rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        isSelected
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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

      {/* ── Expandable Note on Model Limitations (M3-AP09) ───────────────────── */}
      <details className="rounded-xl border border-indigo-100 bg-white/60 p-4 text-xs text-indigo-950 transition">
        <summary className="cursor-pointer font-bold text-indigo-900 hover:text-indigo-950">
          Model Limitations &amp; Agricultural Methodology (RPD M3-AP09)
        </summary>
        <div className="mt-3 space-y-2 text-indigo-900/80 leading-relaxed border-t border-indigo-100 pt-3">
          <p>
            <strong>Methodology:</strong> Recommendations are derived by aligning the selected crop&apos;s critical growth stage window (e.g., flowering, grain development) with historical precipitation data sourced from Open-Meteo archives (2000&ndash;2023).
          </p>
          <p>
            <strong>Statistical Baseline:</strong> In this evaluation build ({recommendation.model_name} v{recommendation.model_version}), probabilities reflect empirical cumulative distributions across duration windows.
          </p>
          <p>
            <strong>Key Limitations:</strong> Extreme anomalous climate events, microclimatic variations, and unseasonable localized weather patterns may deviate from long-term projections. Option 0 (2-hour Demo) is strictly intended for smart contract testing and is permanently excluded from agricultural AI recommendations.
          </p>
          <p>
            <strong>Authority Reminder:</strong> AI estimates are non-binding and advisory. Only the smart contract evaluates real-time oracle rainfall reports to decide claim settlement and eligibility.
          </p>
        </div>
      </details>
    </div>
  );
}
