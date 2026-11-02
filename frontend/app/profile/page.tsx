"use client";

/**
 * app/profile/page.tsx
 *
 * Screen 1: Farmer Profile (M3-PR01 to M3-PR04).
 */

import React from "react";
import ProfileForm from "@/components/profile/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Farmer Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your farm location, primary crop, and sowing date to enable AI advisory recommendations.
        </p>
      </div>

      {/* Main Profile Form Card */}
      <ProfileForm />
    </div>
  );
}
