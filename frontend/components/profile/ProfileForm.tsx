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
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800">Connect Wallet to Manage Profile</h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Your farmer profile is stored in your local browser and keyed specifically to your MetaMask account address.
        </p>
        <button
          onClick={connect}
          className="mt-6 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700 transition"
        >
          Connect MetaMask Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── M3-PR04: Architectural Notice ──────────────────────────── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900">
        <div className="flex gap-3">
          <svg className="h-5 w-5 flex-shrink-0 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <div>
            <p className="font-semibold text-blue-950">Off-Chain Profile &amp; AI Scope</p>
            <p className="mt-0.5 text-blue-800 text-xs sm:text-sm">
              Your profile data is stored entirely in local browser storage and is never uploaded to a database.
              This information feeds the <strong>AI recommendation service</strong> only. The policy coordinates
              recorded on-chain for oracle verification are chosen when you submit your enrollment.
            </p>
          </div>
        </div>
      </div>

      {/* ── Status Feedback Banner ─────────────────────────────────── */}
      {statusMessage && (
        <div
          className={`rounded-lg p-4 text-sm font-medium ${
            statusMessage.variant === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* ── View Mode: Active Profile Summary Card ──────────────────── */}
      {profile && !isEditing ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Active Profile Saved
              </span>
              <p className="mt-1 text-xs text-gray-400">
                Keyed to wallet: <span className="font-mono text-gray-600">{profile.walletAddress}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Edit Profile
              </button>
              <button
                onClick={handleClear}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
              >
                Clear Profile
              </button>
            </div>
          </div>

          <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase text-gray-400">Crop Type</p>
              <p className="mt-1 text-base font-bold capitalize text-gray-800">{profile.crop}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase text-gray-400">Sowing Date</p>
              <p className="mt-1 text-base font-bold text-gray-800">{profile.sowingDate}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase text-gray-400">Latitude</p>
              <p className="mt-1 font-mono text-base font-bold text-gray-800">{profile.latitude.toFixed(4)}° N</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase text-gray-400">Longitude</p>
              <p className="mt-1 font-mono text-base font-bold text-gray-800">{profile.longitude.toFixed(4)}° E</p>
            </div>
          </div>
        </div>
      ) : (
        /* ── Edit / Create Form ─────────────────────────────────────── */
        <form onSubmit={handleSave} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-800">
              {profile ? "Edit Farmer Profile" : "Create Farmer Profile"}
            </h2>
            {profile && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 underline"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
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
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Latitude */}
            <div>
              <label htmlFor="latitude" className="block text-sm font-semibold text-gray-700">
                Farm Latitude (degrees) <span className="text-red-500">*</span>
              </label>
              <input
                id="latitude"
                type="number"
                step="any"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                placeholder="e.g. 14.6819"
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  fieldErrors.latitude
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.latitude && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.latitude}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">Valid range: -90.0 to +90.0</p>
            </div>

            {/* Longitude */}
            <div>
              <label htmlFor="longitude" className="block text-sm font-semibold text-gray-700">
                Farm Longitude (degrees) <span className="text-red-500">*</span>
              </label>
              <input
                id="longitude"
                type="number"
                step="any"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                placeholder="e.g. 77.6006"
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  fieldErrors.longitude
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.longitude && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.longitude}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">Valid range: -180.0 to +180.0</p>
            </div>

            {/* Crop selection */}
            <div>
              <label htmlFor="crop" className="block text-sm font-semibold text-gray-700">
                Crop Type <span className="text-red-500">*</span>
              </label>
              <select
                id="crop"
                value={cropInput}
                onChange={(e) => setCropInput(e.target.value)}
                className={`mt-1.5 w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm capitalize outline-none transition focus:ring-2 ${
                  fieldErrors.crop
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                }`}
              >
                {SUPPORTED_CROPS.map((c) => (
                  <option key={c} value={c} className="capitalize">
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.crop && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.crop}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">Currently supported agricultural crops</p>
            </div>

            {/* Sowing Date */}
            <div>
              <label htmlFor="sowingDate" className="block text-sm font-semibold text-gray-700">
                Sowing Date <span className="text-red-500">*</span>
              </label>
              <input
                id="sowingDate"
                type="date"
                value={sowingDateInput}
                onChange={(e) => setSowingDateInput(e.target.value)}
                className={`mt-1.5 w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 ${
                  fieldErrors.sowingDate
                    ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:border-blue-500 focus:ring-blue-100"
                }`}
              />
              {fieldErrors.sowingDate && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.sowingDate}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">Date seeds were or will be planted</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            {profile && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition"
            >
              Save Profile
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
