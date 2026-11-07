"use client";

/**
 * ProfileForm.tsx
 *
 * Farmer Profile form component implementing M3-PR01 to M3-PR04:
 * - Farm location coordinates (latitude and longitude)
 * - Supported crop selection dropdown
 * - Sowing date picker
 * - Browser localStorage persistence keyed strictly to wallet address
 * - Live field validation
 * - Clear explanation that profile data feeds AI only, not contract terms
 *
 * Upgraded to InsurTech Bento Grid dark theme with Geist typography and glowing accents.
 */

import React, { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet/walletContext";
import {
  clearProfile,
  FarmerProfile,
  loadProfile,
  saveProfile,
  validateProfile,
} from "@/lib/profile/profileStorage";
import { SUPPORTED_CROPS, SupportedCrop } from "@/lib/utils/constants";

const PRESET_LOCATIONS = [
  { name: "Anantapur, AP (Groundnut belt)", lat: 14.6819, lng: 77.6006 },
  { name: "Bengaluru, KA", lat: 12.9716, lng: 77.5946 },
  { name: "Guntur, AP (Cotton / Chilli)", lat: 16.3067, lng: 80.4365 },
  { name: "Hyderabad, TS", lat: 17.385, lng: 78.4867 },
];

export default function ProfileForm() {
  const { address, status, connect } = useWallet();

  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form fields
  const [latInput, setLatInput] = useState<string>("");
  const [lngInput, setLngInput] = useState<string>("");
  const [cropInput, setCropInput] = useState<string>("groundnut");
  const [sowingDateInput, setSowingDateInput] = useState<string>("");

  // Feedback states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    variant: "success" | "error";
  } | null>(null);

  // Load profile whenever connected address changes
  useEffect(() => {
    if (address) {
      const existing = loadProfile(address);
      setProfile(existing);
      if (existing) {
        setLatInput(existing.latitude.toString());
        setLngInput(existing.longitude.toString());
        setCropInput(existing.crop);
        setSowingDateInput(existing.sowingDate);
        setIsEditing(false);
      } else {
        // Default values for new profile
        setLatInput("14.6819");
        setLngInput("77.6006");
        setCropInput("groundnut");
        const today = new Date().toISOString().split("T")[0];
        setSowingDateInput(today);
        setIsEditing(true);
      }
      setStatusMessage(null);
      setFieldErrors({});
    } else {
      setProfile(null);
      setIsEditing(false);
    }
  }, [address]);

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setStatusMessage(null);

    const validation = validateProfile({
      latitude: latInput,
      longitude: lngInput,
      crop: cropInput,
      sowingDate: sowingDateInput,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors as Record<string, string>);
      return;
    }

    setFieldErrors({});

    try {
      const saved = saveProfile(address, {
        latitude: parseFloat(latInput),
        longitude: parseFloat(lngInput),
        crop: cropInput as SupportedCrop,
        sowingDate: sowingDateInput,
      });

      setProfile(saved);
      setIsEditing(false);
      setStatusMessage({
        text: "Farmer profile saved successfully! Profile data will be used to calibrate your AI recommendations.",
        variant: "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile.";
      setStatusMessage({ text: msg, variant: "error" });
    }
  };

  // Handle Clear
  const handleClear = () => {
    if (!address) return;
    if (window.confirm("Are you sure you want to clear your saved farmer profile?")) {
      clearProfile(address);
      setProfile(null);
      setLatInput("");
      setLngInput("");
      setCropInput("groundnut");
      setSowingDateInput("");
      setIsEditing(true);
      setStatusMessage({
        text: "Profile data cleared from local browser storage.",
        variant: "success",
      });
    }
  };

  // Wallet Guard
  if (status !== "connected" || !address) {
    return (
      <div className="floating-panel p-8 sm:p-12 text-center shadow-xl">
        <div className="mx-auto mb-4 flex items-center justify-center text-[#1a5b55] dark:text-[#4ea399]">
          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Connect Wallet to Manage Profile</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Your farmer profile is stored securely in your local browser and keyed specifically to your MetaMask account address.
        </p>
        <button
          onClick={connect}
          className="mt-6 rounded-2xl bg-[#1a5b55] hover:bg-[#22726b] px-6 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99]"
        >
          Connect MetaMask Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── M3-PR04: Architectural Notice ──────────────────────────── */}
      <div className="rounded-2xl bg-cyan-500/10 p-4 text-sm text-cyan-800 dark:text-cyan-200 shadow-sm">
        <div className="flex gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-cyan-600 dark:text-cyan-400 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <div>
            <p className="font-bold text-cyan-700 dark:text-cyan-300">Off-Chain Profile &amp; AI Scope</p>
            <p className="mt-0.5 text-cyan-800/80 dark:text-cyan-200/80 text-xs sm:text-sm leading-relaxed">
              Your profile data is stored entirely in local browser storage and is never uploaded to a centralized database.
              This information feeds the <strong>AI recommendation service</strong> only. The policy coordinates
              recorded on-chain for oracle verification are chosen when you submit your enrollment.
            </p>
          </div>
        </div>
      </div>

      {/* ── Status Feedback Banner ─────────────────────────────────── */}
      {statusMessage && (
        <div
          className={`rounded-2xl p-4 text-sm font-medium shadow-sm ${
            statusMessage.variant === "success"
              ? "bg-[#1a5b55]/15 text-[#1a5b55] dark:text-[#4ea399]"
              : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* ── View Mode: Active Profile Summary Card ──────────────────── */}
      {profile && !isEditing ? (
        <div className="floating-panel p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60 gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a5b55]/15 px-3 py-1 text-xs font-bold text-[#1a5b55] dark:text-[#4ea399]">
                <span className="h-2 w-2 rounded-full bg-[#1a5b55] dark:bg-[#4ea399]" />
                Active Profile Saved
              </span>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Keyed to wallet: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{profile.walletAddress}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Edit Profile
              </button>
              <button
                onClick={handleClear}
                className="rounded-xl bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 transition-colors cursor-pointer"
              >
                Clear Profile
              </button>
            </div>
          </div>

          <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Crop Type</p>
              <p className="mt-1 text-base font-bold capitalize text-slate-900 dark:text-white">{profile.crop}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sowing Date</p>
              <p className="mt-1 text-base font-bold font-mono text-slate-900 dark:text-white">{profile.sowingDate}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Latitude</p>
              <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">{profile.latitude.toFixed(4)}° N</p>
            </div>
            <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Longitude</p>
              <p className="mt-1 font-mono text-base font-bold text-slate-900 dark:text-white">{profile.longitude.toFixed(4)}° E</p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Edit / Create Form ─────────────────────────────────────── */
        <form onSubmit={handleSave} className="floating-panel p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/60">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {profile ? "Edit Farmer Profile" : "Create Farmer Profile"}
            </h2>
            {profile && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Quick Presets (Coordinates for Demo)
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_LOCATIONS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setLatInput(preset.lat.toString());
                    setLngInput(preset.lng.toString());
                  }}
                  className="rounded-full bg-slate-100 dark:bg-slate-800 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-[#1a5b55]/15 hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Latitude */}
            <div>
              <label htmlFor="latitude" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Farm Latitude (degrees) <span className="text-rose-500">*</span>
              </label>
              <input
                id="latitude"
                type="number"
                step="any"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                placeholder="e.g. 14.6819"
                className={`mt-1.5 w-full rounded-2xl bg-slate-100 dark:bg-[#070A0F] px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 shadow-inner outline-none transition focus:ring-2 border-none ${
                  fieldErrors.latitude
                    ? "focus:ring-rose-500/50"
                    : "focus:ring-[#1a5b55]/50"
                }`}
              />
              {fieldErrors.latitude && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.latitude}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">Valid range: -90.0 to +90.0</p>
            </div>

            {/* Longitude */}
            <div>
              <label htmlFor="longitude" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Farm Longitude (degrees) <span className="text-rose-500">*</span>
              </label>
              <input
                id="longitude"
                type="number"
                step="any"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                placeholder="e.g. 77.6006"
                className={`mt-1.5 w-full rounded-2xl bg-slate-100 dark:bg-[#070A0F] px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 shadow-inner outline-none transition focus:ring-2 border-none ${
                  fieldErrors.longitude
                    ? "focus:ring-rose-500/50"
                    : "focus:ring-[#1a5b55]/50"
                }`}
              />
              {fieldErrors.longitude && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.longitude}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">Valid range: -180.0 to +180.0</p>
            </div>

            {/* Crop selection */}
            <div>
              <label htmlFor="crop" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Crop Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="crop"
                value={cropInput}
                onChange={(e) => setCropInput(e.target.value)}
                className={`mt-1.5 w-full rounded-2xl bg-slate-100 dark:bg-[#070A0F] px-4 py-2.5 text-sm capitalize text-slate-900 dark:text-slate-100 shadow-inner outline-none transition focus:ring-2 border-none ${
                  fieldErrors.crop
                    ? "focus:ring-rose-500/50"
                    : "focus:ring-[#1a5b55]/50"
                }`}
              >
                {SUPPORTED_CROPS.map((c) => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white capitalize">
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.crop && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.crop}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">Currently supported agricultural crops</p>
            </div>

            {/* Sowing Date */}
            <div>
              <label htmlFor="sowingDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Sowing Date <span className="text-rose-500">*</span>
              </label>
              <input
                id="sowingDate"
                type="date"
                value={sowingDateInput}
                onChange={(e) => setSowingDateInput(e.target.value)}
                className={`mt-1.5 w-full rounded-2xl bg-slate-100 dark:bg-[#070A0F] px-4 py-2.5 text-sm font-mono text-slate-900 dark:text-slate-100 shadow-inner outline-none transition focus:ring-2 border-none ${
                  fieldErrors.sowingDate
                    ? "focus:ring-rose-500/50"
                    : "focus:ring-[#1a5b55]/50"
                }`}
              />
              {fieldErrors.sowingDate && (
                <p className="mt-1 text-xs text-rose-500">{fieldErrors.sowingDate}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">Date seeds were or will be planted</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
            {profile && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="rounded-2xl bg-[#1a5b55] hover:bg-[#22726b] px-6 py-3 text-sm font-black text-white shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-[0.99]"
            >
              Save Profile
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
