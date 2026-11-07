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
 *
 * Upgraded to borderless shadowy floating card with Primary Green #1a5b55.
 */

import React from "react";
import Link from "next/link";
import { CatalogueOption } from "@/lib/mock/mockCatalogue";
import { formatProbability, formatRainfall, formatRtt } from "@/lib/utils/formatters";
import { fromDateOnlyInputToUtc } from "@/lib/utils/dateHelpers";
import { ROUTES } from "@/lib/utils/constants";
import { CropSeedPacket, CropLeaf } from "@/components/shared/CropIllustrations";

interface OptionCardProps {
  option: CatalogueOption;
  recommended?: boolean;
  deficitProbability?: number | null;
  suggestedStartDate?: string | null;
}

const RISK_BADGES: Record<string, string> = {
  Demo: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300",
  Severe: "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
  Moderate: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300",
  Mild: "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300",
};

export default function OptionCard({
  option,
  recommended = false,
  deficitProbability,
  suggestedStartDate,
}: OptionCardProps) {
  const badgeStyle = RISK_BADGES[option.riskLabel] || "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";

  const suggestedStartUnix = suggestedStartDate ? fromDateOnlyInputToUtc(suggestedStartDate) : undefined;
  const enrollHref = `${ROUTES.ENROLL}?option=${option.optionId}${
    recommended && suggestedStartUnix ? `&suggestedStart=${suggestedStartUnix}` : ""
  }`;

  return (
    <div
      className={`relative flex flex-col justify-between rounded-3xl floating-card p-6 shadow-md transition-all duration-300 ${
        recommended
          ? "ring-2 ring-[#1a5b55] dark:ring-[#4ea399]/50 shadow-xl"
          : ""
      }`}
    >
      {/* Demo or AI Recommended Top Badge */}
      {option.isDemo && (
        <div className="absolute -top-3 right-5 rounded-full bg-purple-700 px-3.5 py-0.5 text-[10px] font-mono font-bold text-white shadow-md">
          DEMO (2 HOURS)
        </div>
      )}

      {recommended && !option.isDemo && (
        <div className="absolute -top-3 right-5 rounded-full bg-[#1a5b55] px-3 py-0.5 text-[10px] font-mono font-bold text-white shadow-sm flex items-center gap-1">
          <CropLeaf className="h-3 w-3" />
          <span>AI RECOMMENDED</span>
        </div>
      )}

      <div>
        {/* Header: Option ID & Risk Tier */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CropSeedPacket className="h-4 w-4" />
            <span>Option #{option.optionId}</span>
          </span>
          <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-mono font-bold shadow-xs ${badgeStyle}`}>
            {option.riskLabel} Cover
          </span>
        </div>

        {/* Duration */}
        <div className="mt-3.5">
          <p className="text-2xl font-light tracking-tight text-slate-900 dark:text-white">{option.durationLabel}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            {option.isDemo ? "Contract simulation window" : "Seasonal agricultural window"}
          </p>
        </div>

        {/* Deficit Risk Probability Badge (M3-AP02 / M3-AP03) */}
        {!option.isDemo && deficitProbability !== undefined && deficitProbability !== null && (
          <div className="mt-3.5 flex items-center justify-between rounded-2xl bg-slate-50 dark:bg-[#080B0F] px-3.5 py-2 text-xs shadow-xs">
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Shortfall Probability:</span>
            <span className="font-mono font-bold text-[#1a5b55] dark:text-[#4ea399]">
              {formatProbability(deficitProbability)}
            </span>
          </div>
        )}

        {/* Parametric Trigger and Payout Details */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 dark:bg-[#080B0F] p-3.5 shadow-xs">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">Rainfall Trigger</p>
            <p className="mt-0.5 text-base font-mono font-extrabold text-slate-900 dark:text-slate-100">
              {formatRainfall(option.triggerMm)}
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">Strictly below (&lt;)</p>
          </div>

          <div>
            <p className="text-[10px] font-mono font-bold uppercase text-slate-500 dark:text-slate-400">Guaranteed Payout</p>
            <p className="mt-0.5 text-base font-mono font-extrabold text-amber-600 dark:text-amber-300">
              {formatRtt(option.payoutRtt.toString(), 0)}
            </p>
            <p className="text-[9px] text-amber-600/80 dark:text-amber-400/80 font-mono">Simulated RTT Tokens</p>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/60">
        <Link
          href={enrollHref}
          className={`block w-full rounded-xl py-2.5 text-center text-xs font-bold uppercase tracking-wider transition-all focus:outline-none ${
            option.isDemo
              ? "bg-purple-700 text-white hover:bg-purple-600 shadow-md"
              : recommended
              ? "bg-[#1a5b55] text-white shadow-md hover:shadow-lg hover:bg-[#22726b] hover:scale-[1.01]"
              : "bg-slate-100 dark:bg-[#0D1218] text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-950 dark:hover:text-white"
          }`}
        >
          {recommended ? `Enroll Recommended #${option.optionId}` : `Select Option #${option.optionId} \u2192`}
        </Link>
      </div>
    </div>
  );
}
