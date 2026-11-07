"use client";

/**
 * Navbar.tsx
 * App-wide navigation bar styled in modern borderless floating aesthetic:
 * - Shadowy floating elevation without rigid borders.
 * - Primary Green #1a5b55 brand accents.
 * - Light Mode (#FFFFFF) / Dark Mode (#000000) interactive theme toggle button.
 * - Preserves all routes and wallet integration.
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "@/components/wallet/WalletButton";
import { useTheme } from "@/lib/theme/themeContext";
import { ROUTES } from "@/lib/utils/constants";

const NAV_LINKS = [
  { href: ROUTES.DASHBOARD, label: "Dashboard" },
  { href: ROUTES.PROFILE,   label: "My Profile" },
  { href: ROUTES.CATALOGUE, label: "Catalogue" },
  { href: ROUTES.HISTORY,   label: "History" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 floating-navbar">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8"
      >
        {/* Logo / app name */}
        <Link
          href={ROUTES.DASHBOARD}
          className="flex items-center gap-3 text-lg font-bold hover:opacity-90 transition-opacity focus:outline-none rounded-xl group"
        >
          {/* Cartoon Crop Mascot (Borderless, Friendly Sprout) */}
          <div className="flex h-10 w-10 items-center justify-center group-hover:scale-110 transition-transform">
            <svg
              className="h-9 w-9"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Friendly Soil Mound */}
              <ellipse cx="18" cy="31" rx="10" ry="2.8" fill="#8B4513" fillOpacity="0.4" />
              <ellipse cx="18" cy="30.5" rx="7.5" ry="2" fill="#5D2E0C" fillOpacity="0.3" />

              {/* Main Sprout Stem */}
              <path
                d="M18 30C18 20 18 14 18 10"
                stroke="#1a5b55"
                strokeWidth="3.2"
                strokeLinecap="round"
              />

              {/* Left Plump Cartoon Leaf */}
              <path
                d="M18 21C11.5 21 6.5 16.5 8 9.5C14 9 17 14.5 18 21Z"
                fill="#34d399"
                stroke="#1a5b55"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Left Leaf Inner Highlight */}
              <path
                d="M10 13C12.5 11 15 13.5 17 18"
                stroke="#a7f3d0"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              {/* Right Plump Cartoon Leaf */}
              <path
                d="M18 16C24.5 16 29.5 11.5 28 4.5C22 4 19 9.5 18 16Z"
                fill="#4ade80"
                stroke="#1a5b55"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              {/* Right Leaf Inner Highlight */}
              <path
                d="M26 8C23.5 6 21 8.5 19 13"
                stroke="#bbf7d0"
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              {/* Top Golden Harvest Grain Seed */}
              <path
                d="M18 10C16.2 7 16.8 4 18 2.5C19.2 4 19.8 7 18 10Z"
                fill="#FBBF24"
                stroke="#D97706"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="18" cy="5.5" r="1.2" fill="#FEF3C7" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-light tracking-wide text-slate-900 dark:text-white">
              AgriShield
            </span>
            <span className="text-[10px] font-normal uppercase tracking-widest text-[#1a5b55] dark:text-[#4ea399] -mt-0.5">
              Parametric Protocol
            </span>
          </div>
        </Link>

        {/* Desktop links (Floating minimal pills) */}
        <ul className="hidden md:flex items-center gap-1 p-1 rounded-2xl bg-slate-100/80 dark:bg-[#0D1218] shadow-inner" role="list">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none ${
                    isActive
                      ? "bg-white dark:bg-[#1a5b55] text-slate-950 dark:text-white shadow-sm dark:shadow-md"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right side controls: Theme Toggle & Wallet Button */}
        <div className="hidden md:flex items-center gap-3">
          {/* Light / Dark Mode Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#0D1218] text-slate-700 dark:text-slate-300 shadow-sm hover:scale-105 active:scale-95 transition-all focus:outline-none"
          >
            {theme === "dark" ? (
              /* Sun icon for dark mode (click to go light) */
              <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              /* Moon icon for light mode (click to go dark) */
              <svg className="h-4 w-4 text-[#1a5b55]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          {/* Wallet button (desktop) */}
          <WalletButton />
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#0D1218] text-slate-700 dark:text-slate-300"
          >
            {theme === "dark" ? (
              <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="h-4 w-4 text-[#1a5b55]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          <button
            className="rounded-xl p-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#0D1218] focus:outline-none"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-white/95 dark:bg-[#0B0F14]/95 backdrop-blur-2xl px-4 py-4 space-y-2 shadow-2xl">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-[#1a5b55] text-white shadow-md"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                }`}
              >
                {label}
              </Link>
            );
          })}
          <div className="pt-3">
            <WalletButton />
          </div>
        </div>
      )}
    </header>
  );
}
