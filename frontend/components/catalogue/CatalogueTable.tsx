"use client";

/**
 * CatalogueTable.tsx
 *
 * Displays the full 13-option policy catalogue with filtering (M3-C01 to M3-C04):
 * - Risk label filter (All, Severe, Moderate, Mild, Demo)
 * - Duration filter (All, 2 hours, 30 days, 60 days, 90 days, 120 days)
 * - Renders grid of OptionCard components
 * - Clear notice that policy terms are fixed by the contract and cannot be edited
 *
 * Upgraded to borderless shadowy floating layout with Primary Green #1a5b55.
 */

import React, { useMemo, useState } from "react";
import { CatalogueOption } from "@/lib/mock/mockCatalogue";
import OptionCard from "./OptionCard";

interface CatalogueTableProps {
  options: CatalogueOption[];
  recommendedOptionId?: number;
  probabilitiesMap?: Record<number, number | null>;
  suggestedStartDate?: string | null;
}

const RISK_FILTERS = ["All", "Demo", "Severe", "Moderate", "Mild"] as const;
const DURATION_FILTERS = ["All", "2 hours", "30 days", "60 days", "90 days", "120 days"] as const;

export default function CatalogueTable({
  options,
  recommendedOptionId,
  probabilitiesMap,
  suggestedStartDate,
}: CatalogueTableProps) {
  const [selectedRisk, setSelectedRisk] = useState<string>("All");
  const [selectedDuration, setSelectedDuration] = useState<string>("All");

  // Filter options based on user selections
  const filteredOptions = useMemo(() => {
    return options.filter((opt) => {
      const matchRisk =
        selectedRisk === "All" || opt.riskLabel.toLowerCase() === selectedRisk.toLowerCase();
      const matchDuration =
        selectedDuration === "All" || opt.durationLabel.toLowerCase() === selectedDuration.toLowerCase();
      return matchRisk && matchDuration;
    });
  }, [options, selectedRisk, selectedDuration]);

  return (
    <div className="space-y-6">
      {/* ── Fixed Terms Policy Notice ─────────────────────────────────── */}
      <div className="rounded-3xl floating-panel p-5 sm:p-6 flex items-start gap-3.5">
        <div className="text-[#1a5b55] dark:text-[#4ea399] flex-shrink-0 mt-0.5">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </div>
        <div>
          <p className="font-extrabold text-slate-900 dark:text-white">Deterministic Smart Contract Catalogue</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            All policy durations, triggers, and guaranteed payouts are pre-committed on-chain in <code className="text-[#1a5b55] dark:text-[#4ea399] font-mono text-[11px] font-bold">CropInsurance.sol</code>. Select any catalogue option and specify your future start date.
          </p>
        </div>
      </div>

      {/* ── Filters Bar (Borderless Floating Strip) ──────────────────── */}
      <div className="rounded-3xl floating-panel p-4 sm:p-5 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Risk Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase mr-1">Risk Tier:</span>
          {RISK_FILTERS.map((risk) => (
            <button
              key={risk}
              type="button"
              onClick={() => setSelectedRisk(risk)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                selectedRisk === risk
                  ? "bg-[#1a5b55] text-white shadow-md hover:bg-[#22726b]"
                  : "bg-slate-100 dark:bg-[#0D1218] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {risk}
            </button>
          ))}
        </div>

        {/* Duration Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="duration-filter" className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
            Duration:
          </label>
          <select
            id="duration-filter"
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(e.target.value)}
            className="rounded-xl border-none bg-slate-100 dark:bg-[#0D1218] px-3.5 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-200 outline-none shadow-xs"
          >
            {DURATION_FILTERS.map((d) => (
              <option key={d} value={d} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Policy Cards Grid ───────────────────────────────────────── */}
      {filteredOptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOptions.map((opt) => (
            <OptionCard
              key={opt.optionId}
              option={opt}
              recommended={opt.optionId === recommendedOptionId}
              deficitProbability={probabilitiesMap ? probabilitiesMap[opt.optionId] : undefined}
              suggestedStartDate={suggestedStartDate}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl floating-panel p-12 text-center text-slate-500 dark:text-slate-400">
          <p className="font-bold text-slate-900 dark:text-white">No Policy Options Match Your Filter</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try resetting the risk or duration filters above.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedRisk("All");
              setSelectedDuration("All");
            }}
            className="mt-4 rounded-xl bg-[#1a5b55] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#22726b] transition"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
