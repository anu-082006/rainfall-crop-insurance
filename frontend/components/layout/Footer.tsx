"use client";

/**
 * Footer.tsx
 * AgriShield app footer.
 */

import React from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/utils/constants";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-gray-500">
            AgriShield &mdash; Smart Rainfall-Based Crop Protection
          </p>
          <nav aria-label="Footer navigation" className="flex gap-4 text-xs text-gray-400">
            <Link href={ROUTES.DASHBOARD} className="hover:text-gray-600 focus:outline-none focus:underline">
              Dashboard
            </Link>
            <Link href={ROUTES.PROFILE} className="hover:text-gray-600 focus:outline-none focus:underline">
              Profile
            </Link>
            <Link href={ROUTES.CATALOGUE} className="hover:text-gray-600 focus:outline-none focus:underline">
              Catalogue
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
