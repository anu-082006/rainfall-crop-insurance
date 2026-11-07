"use client";

/**
 * Footer.tsx
 * AgriShield app footer with system heartbeat and InsurTech architecture telemetry.
 * Styled in borderless shadowy floating aesthetic supporting both Light (#FFFFFF) and Dark (#000000).
 */

import React from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/utils/constants";
import { CropSproutMascot } from "@/components/shared/CropIllustrations";

export default function Footer() {
  return (
    <footer className="mt-auto bg-transparent py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="floating-panel p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            
            {/* Brand & Mission */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <CropSproutMascot className="h-6 w-6" />
                <span className="text-base font-light tracking-wide text-slate-900 dark:text-white">AgriShield</span>
                <span className="rounded-full bg-[#1a5b55]/10 dark:bg-[#1a5b55]/30 px-2.5 py-0.5 text-[10px] font-medium text-[#1a5b55] dark:text-[#4ea399]">
                  Parametric DApp
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
                Decentralized rainfall-deficit crop protection. Automated payouts executed solely via verified Chainlink CRE weather reports and on-chain smart contracts.
              </p>
            </div>

            {/* System Telemetry Badges (Floating style, calm matte dots) */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-[#0D1218] px-3 py-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-[#1a5b55] dark:bg-[#4ea399]" />
                <span>Chainlink CRE: Online</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-[#0D1218] px-3 py-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-cyan-600 dark:bg-cyan-500" />
                <span>Weather: ERA5 / Open-Meteo</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-[#0D1218] px-3 py-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Contract: Chain ID 31337</span>
              </div>
            </div>

            {/* Footer links */}
            <nav aria-label="Footer navigation" className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <Link href={ROUTES.DASHBOARD} className="hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors focus:outline-none">
                Dashboard
              </Link>
              <Link href={ROUTES.PROFILE} className="hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors focus:outline-none">
                Farm Profile
              </Link>
              <Link href={ROUTES.CATALOGUE} className="hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors focus:outline-none">
                Catalogue
              </Link>
              <Link href={ROUTES.HISTORY} className="hover:text-[#1a5b55] dark:hover:text-[#4ea399] transition-colors focus:outline-none">
                Audit History
              </Link>
            </nav>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-500 gap-2 font-mono">
            <p>© 2026 AgriShield Parametric Protocol. Academic & Demonstration Sandbox.</p>
            <p className="text-slate-500">
              Parametric risk score reflects historical climatology and does not guarantee future rainfall.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
