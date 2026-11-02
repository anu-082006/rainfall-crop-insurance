"use client";

/**
 * CatalogueTable.tsx
 *
 * Displays the full 13-option policy catalogue with filtering (M3-C01 to M3-C04):
 * - Risk label filter (All, Severe, Moderate, Mild, Demo)
 * - Duration filter (All, 2 hours, 30 days, 60 days, 90 days, 120 days)
 * - Renders grid of OptionCard components
 * - Clear notice that policy terms are fixed by the contract and cannot be edited
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
      {/* ── Fixed Terms Policy Notice ──────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs sm:text-sm text-gray-600 shadow-sm flex items-start gap-3">
        <svg className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        <div>
          <p className="font-semibold text-gray-900">Fixed Contract Terms</p>
          <p className="mt-0.5 text-gray-500">
            All policy parameters (duration, trigger threshold, and payout) are predefined on-chain in the
            smart contract catalogue. Farmers select an established policy option and specify a future start date;
            terms cannot be manually altered.
          </p>
        </div>
      </div>

      {/* ── Filters Bar ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
        {/* Risk Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-400 uppercase mr-1">Risk:</span>
          {RISK_FILTERS.map((risk) => (
            <button
              key={risk}
              type="button"
              onClick={() => setSelectedRisk(risk)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                selectedRisk === risk
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {risk}
            </button>
          ))}
        </div>

        {/* Duration Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="duration-filter" className="text-xs font-semibold text-gray-400 uppercase">
            Duration:
          </label>
          <select
            id="duration-filter"
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            {DURATION_FILTERS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>
          Showing <strong>{filteredOptions.length}</strong> of {options.length} options
        </span>
        {(selectedRisk !== "All" || selectedDuration !== "All") && (
          <button
            type="button"
            onClick={() => {
              setSelectedRisk("All");
              setSelectedDuration("All");
            }}
            className="text-blue-600 hover:underline font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Grid of Options ────────────────────────────────────────── */}
      {filteredOptions.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredOptions.map((opt) => (
            <OptionCard
              key={opt.optionId}
              option={opt}
              recommended={opt.optionId === recommendedOptionId}
              deficitProbability={probabilitiesMap ? probabilitiesMap[opt.optionId] : undefined}
              suggestedStartDate={opt.optionId === recommendedOptionId ? suggestedStartDate : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-400">
          <p className="font-semibold text-gray-700">No options match your filter</p>
          <p className="mt-1 text-xs text-gray-500">Try selecting a different risk tier or duration window.</p>
          <button
            type="button"
            onClick={() => {
              setSelectedRisk("All");
              setSelectedDuration("All");
            }}
            className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}
