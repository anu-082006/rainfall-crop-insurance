"use client";

/**
 * StartDatePicker.tsx
 *
 * Date and time picker accepting future times only (M3-E01, M3-E08):
 * - Option 0 (Demo 2h): Requires a full-hour start time (minutes:seconds = :00:00).
 * - Options 1–12 (>= 30 days): Requires whole-day starts (00:00:00 UTC).
 * - Pre-fill support for AI recommendation suggested date (M3-E08).
 * - Displays both local and UTC representations.
 *
 * Upgraded to InsurTech dark Bento design with monospace time displays and glowing indicators.
 */

import React, { useId, useMemo } from "react";
import {
  getNextFullHourUnix,
  getNextUtcDayUnix,
  isWholeDayUtc,
  toDateOnlyInput,
  fromDateOnlyInputToUtc,
  formatUtcDateTime,
  validateStartTime,
} from "@/lib/utils/dateHelpers";
import { formatUnixTimestamp } from "@/lib/utils/formatters";

interface StartDatePickerProps {
  isDemo: boolean;
  value: number; // Unix timestamp in seconds
  onChange: (unixSeconds: number) => void;
  aiSuggestedDate?: number; // Optional Unix timestamp suggested by AI (M3-E08)
  disabled?: boolean;
}

export default function StartDatePicker({
  isDemo,
  value,
  onChange,
  aiSuggestedDate,
  disabled = false,
}: StartDatePickerProps) {
  const dateInputId = useId();
  const hourSelectId = useId();

  // Reference for minimum future date
  const minUtcDaySeconds = useMemo(() => getNextUtcDayUnix(), []);
  const minUtcDayString = useMemo(() => toDateOnlyInput(minUtcDaySeconds), [minUtcDaySeconds]);

  // Validation
  const validation = useMemo(() => {
    if (!value) return { isValid: false, error: "Please select a start date." };
    return validateStartTime(value, isDemo);
  }, [value, isDemo]);

  // For Demo Option (Option 0): Date string and Hour (0-23 UTC)
  const demoDateUtcString = useMemo(() => {
    return value ? toDateOnlyInput(value) : toDateOnlyInput(getNextFullHourUnix());
  }, [value]);

  const demoHourUtc = useMemo(() => {
    if (!value) return new Date(getNextFullHourUnix() * 1000).getUTCHours();
    return new Date(value * 1000).getUTCHours();
  }, [value]);

  const handleDemoDateOrHourChange = (newDateStr: string, newHourUtc: number) => {
    const parts = newDateStr.split("-").map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      const ms = Date.UTC(year, month - 1, day, newHourUtc, 0, 0);
      onChange(Math.floor(ms / 1000));
    }
  };

  // For Standard Options (Options 1–12): Whole Day UTC
  const standardDateString = useMemo(() => {
    return value && isWholeDayUtc(value) ? toDateOnlyInput(value) : "";
  }, [value]);

  const handleStandardDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      onChange(0);
      return;
    }
    const unix = fromDateOnlyInputToUtc(val);
    onChange(unix);
  };

  // Quick preset handlers
  const setNextHour = () => {
    onChange(getNextFullHourUnix());
  };

  const setTomorrowUtc = () => {
    onChange(getNextUtcDayUnix());
  };

  const setNextMondayUtc = () => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay() + 1) % 7 || 7));
    const mondayUtc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0);
    onChange(Math.floor(mondayUtc / 1000));
  };

  const applyAiSuggestion = () => {
    if (aiSuggestedDate) {
      onChange(aiSuggestedDate);
    }
  };

  const isAiSuggestionApplied = aiSuggestedDate && value === aiSuggestedDate;

  return (
    <div className="space-y-4">
      {/* AI Pre-fill Notification (M3-E08) */}
      {aiSuggestedDate && (
        <div className="flex items-center justify-between rounded-2xl bg-[#1a5b55]/15 px-4 py-3 text-xs text-[#1a5b55] dark:text-[#4ea399] shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#1a5b55] dark:bg-[#4ea399]" />
            <span>
              <strong className="font-extrabold">AI Suggested Start:</strong>{" "}
              <span className="font-mono font-bold">{formatUtcDateTime(aiSuggestedDate)}</span>
            </span>
          </div>
          {!isAiSuggestionApplied && (
            <button
              type="button"
              onClick={applyAiSuggestion}
              disabled={disabled}
              className="text-xs font-bold underline hover:opacity-80 focus:outline-none transition-opacity cursor-pointer"
            >
              Apply AI Date
            </button>
          )}
        </div>
      )}

      {/* Mode 1: Option 0 (2-Hour Demo Option: Full Hour Alignment) */}
      {isDemo ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={dateInputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Start Date (UTC) <span className="text-rose-500">*</span>
              </label>
              <input
                id={dateInputId}
                type="date"
                disabled={disabled}
                value={demoDateUtcString}
                min={toDateOnlyInput(Math.floor(Date.now() / 1000))}
                onChange={(e) => handleDemoDateOrHourChange(e.target.value, demoHourUtc)}
                className="mt-1.5 block w-full rounded-2xl bg-slate-100 dark:bg-[#070A0F] px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50 border-none"
              />
            </div>

            <div>
              <label htmlFor={hourSelectId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Start Hour (UTC, Full Hour) <span className="text-rose-500">*</span>
              </label>
              <select
                id={hourSelectId}
                disabled={disabled}
                value={demoHourUtc}
                onChange={(e) =>
                  handleDemoDateOrHourChange(demoDateUtcString, Number(e.target.value))
                }
                className="mt-1.5 block w-full rounded-2xl bg-slate-100 dark:bg-[#070A0F] px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-50 border-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {String(i).padStart(2, "0")}:00:00 UTC
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Quick presets:</span>
            <button
              type="button"
              disabled={disabled}
              onClick={setNextHour}
              className="rounded-xl bg-purple-500/15 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              Next Full Hour
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(getNextFullHourUnix() + 3600 * 2)}
              className="rounded-xl bg-purple-500/15 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/25 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              +2 Hours
            </button>
          </div>

          <p className="text-xs text-purple-700 dark:text-purple-300/80">
            <strong className="font-bold">Full-Hour Rule:</strong> Demo policy start time is locked to exact full hours
            (:00:00) per contract specifications.
          </p>
        </div>
      ) : (
        /* Mode 2: Options 1–12 (Standard Seasonal Policies: Whole Day UTC Alignment) */
        <div className="space-y-3">
          <div>
            <label htmlFor={dateInputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Coverage Start Date (00:00:00 UTC) <span className="text-rose-500">*</span>
            </label>
            <input
              id={dateInputId}
              type="date"
              disabled={disabled}
              min={minUtcDayString}
              value={standardDateString}
              onChange={handleStandardDateChange}
              className="mt-1.5 block w-full rounded-2xl bg-slate-100 dark:bg-[#070A0F] px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#1a5b55]/50 disabled:opacity-50 border-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Quick presets:</span>
            <button
              type="button"
              disabled={disabled}
              onClick={setTomorrowUtc}
              className="rounded-xl bg-[#1a5b55]/15 px-3 py-1.5 text-xs font-bold text-[#1a5b55] dark:text-[#4ea399] hover:bg-[#1a5b55]/25 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Tomorrow (00:00 UTC)
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={setNextMondayUtc}
              className="rounded-xl bg-[#1a5b55]/15 px-3 py-1.5 text-xs font-bold text-[#1a5b55] dark:text-[#4ea399] hover:bg-[#1a5b55]/25 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Next Monday (00:00 UTC)
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            <strong className="text-slate-700 dark:text-slate-300 font-bold">Whole-Day Rule:</strong> Standard crop insurance policies start at 00:00:00 UTC
            on the selected day.
          </p>
        </div>
      )}

      {/* Selected Time Display & Verification */}
      {value > 0 && (
        <div
          className={`rounded-2xl p-4 text-xs shadow-md transition-all ${
            validation.isValid
              ? "bg-slate-100 dark:bg-[#0D1218] text-slate-700 dark:text-slate-300"
              : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
          }`}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">Selected Start:</span>{" "}
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatUtcDateTime(value)}</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              (Local: {formatUnixTimestamp(value)})
            </div>
          </div>
          {!validation.isValid && validation.error && (
            <p className="mt-1.5 font-bold text-rose-600 dark:text-rose-400">{validation.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
