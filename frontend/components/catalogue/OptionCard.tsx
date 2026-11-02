"use client";

/**
 * OptionCard.tsx
 *
 * Displays a single catalogue option card (M3-C02, M3-C04):
 * - Read-only option terms: ID, risk label, duration, trigger mm, payout RTT
 * - Option 0 marked clearly as Demo (2 hours)
 * - Risk-tier color badges
 * - AI Recommended highlight badge and probability display (M3-AP02, M3-AP03)
 * - "Select & Enroll" CTA button leading to /enroll?option=ID
 */

import React from "react";
import Link from "next/link";
import { CatalogueOption } from "@/lib/mock/mockCatalogue";
import { formatProbability, formatRainfall, formatRtt } from "@/lib/utils/formatters";
import { fromDateOnlyInputToUtc } from "@/lib/utils/dateHelpers";
import { ROUTES } from "@/lib/utils/constants";

interface OptionCardProps {
  option: CatalogueOption;
  recommended?: boolean;
  deficitProbability?: number | null;
  suggestedStartDate?: string | null;
}

const RISK_BADGES = {
  Demo: "bg-purple-100 text-purple-800 border-purple-200",
  Severe: "bg-red-100 text-red-800 border-red-200",
  Moderate: "bg-amber-100 text-amber-800 border-amber-200",
  Mild: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function OptionCard({
  option,
  recommended = false,
  deficitProbability,
  suggestedStartDate,
}: OptionCardProps) {
  const badgeStyle = RISK_BADGES[option.riskLabel] || "bg-gray-100 text-gray-800 border-gray-200";

  const suggestedStartUnix = suggestedStartDate ? fromDateOnlyInputToUtc(suggestedStartDate) : undefined;
  const enrollHref = `${ROUTES.ENROLL}?option=${option.optionId}${
    recommended && suggestedStartUnix ? `&suggestedStart=${suggestedStartUnix}` : ""
  }`;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
        recommended
          ? "border-emerald-500 ring-2 ring-emerald-500/20"
          : option.isDemo
          ? "border-purple-300 bg-purple-50/20"
          : "border-gray-200"
      }`}
    >
      {/* Demo or AI Recommended Banner */}
      {option.isDemo && (
        <div className="absolute -top-3 right-4 rounded-full bg-purple-700 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
          DEMO (2 HOURS)
        </div>
      )}

      {recommended && !option.isDemo && (
        <div className="absolute -top-3 right-4 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
          AI RECOMMENDED
        </div>
      )}

      <div>
        {/* Header: Option ID & Risk Tier */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-600">
            Option #{option.optionId}
          </span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}>
            {option.riskLabel} Cover
          </span>
        </div>

        {/* Duration */}
        <div className="mt-3">
          <p className="text-2xl font-extrabold text-gray-900">{option.durationLabel}</p>
          <p className="text-xs text-gray-600 mt-0.5">
            {option.isDemo ? "Fast-testing demo window" : "Standard agricultural window"}
          </p>
        </div>

        {/* Deficit Risk Probability Badge (M3-AP02 / M3-AP03) */}
        {!option.isDemo && deficitProbability !== undefined && deficitProbability !== null && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-indigo-50/70 px-3 py-1.5 text-xs text-indigo-950 border border-indigo-100">
            <span className="text-[11px] font-semibold text-indigo-700">AI Deficit Risk:</span>
            <span className="font-mono font-bold text-indigo-950">
              {formatProbability(deficitProbability)}
            </span>
          </div>
        )}

        {/* Parametric Trigger and Payout Details */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
          <div className="rounded-lg bg-gray-50 p-2.5">
            <p className="text-[11px] font-medium uppercase text-gray-600">Rainfall Trigger</p>
            <p className="mt-0.5 text-base font-bold text-gray-800">
              {formatRainfall(option.triggerMm)}
            </p>
            <p className="text-[10px] text-gray-600">Strictly below</p>
          </div>

          <div className="rounded-lg bg-gray-50 p-2.5">
            <p className="text-[11px] font-medium uppercase text-gray-600">Fixed Payout</p>
            <p className="mt-0.5 text-base font-bold text-blue-700">
              {formatRtt(option.payoutRtt.toString(), 0)}
            </p>
            <p className="text-[10px] text-gray-600">Simulated test RTT</p>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="mt-6 pt-3">
        <Link
          href={enrollHref}
          className={`block w-full rounded-lg py-2.5 text-center text-xs font-bold uppercase tracking-wider transition focus:outline-none focus:ring-2 ${
            option.isDemo
              ? "bg-purple-700 text-white hover:bg-purple-800 focus:ring-purple-400"
              : recommended
              ? "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400"
              : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400"
          }`}
        >
          {recommended ? `Enroll Recommended #${option.optionId}` : `Select Option #${option.optionId}`}
        </Link>
      </div>
    </div>
  );
}
