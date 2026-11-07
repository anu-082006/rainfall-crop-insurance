"use client";

/**
 * app/profile/page.tsx
 *
 * Screen 1: Farmer Profile (M3-PR01 to M3-PR04).
 * Upgraded to InsurTech dark theme with Geist typography and glowing status indicators.
 */

import React from "react";
import Link from "next/link";
import ProfileForm from "@/components/profile/ProfileForm";
import { ROUTES } from "@/lib/utils/constants";
import { FarmFieldPlot } from "@/components/shared/CropIllustrations";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header & Breadcrumb */}
      <div>
        <nav className="mb-2 text-xs font-mono text-slate-500">
          <Link href={ROUTES.DASHBOARD} className="hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors">
            Dashboard
          </Link>{" "}
          &gt;{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-300">Farmer Profile</span>
        </nav>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a5b55]/15 px-3 py-1 text-xs font-bold text-[#1a5b55] dark:text-[#4ea399]">
            <FarmFieldPlot className="h-4 w-4" />
            <span>AI Calibration &amp; Farm Context</span>
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-slate-900 dark:text-white">
          Farmer Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure your farm location coordinates, primary crop, and sowing date to enable calibrated AI risk advisory recommendations.
        </p>
      </div>

      {/* Main Profile Form Card */}
      <ProfileForm />
    </div>
  );
}
