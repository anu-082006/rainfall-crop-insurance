"use client";

import React from "react";

interface CropIconProps {
  className?: string;
  size?: number;
}

/**
 * CropSproutMascot
 * Signature friendly seedling mascot from the AgriShield brand identity.
 */
export function CropSproutMascot({ className = "h-8 w-8" }: CropIconProps) {
  return (
    <svg
      className={className}
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
  );
}

/**
 * CropLeaf
 * Single graceful leaf extracted directly from the mascot.
 * Ideal for small badges, inline accents, and pills.
 */
export function CropLeaf({ className = "h-4 w-4" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Leaf stem */}
      <path d="M5 19C7 17 9 15.5 10 13" stroke="#1a5b55" strokeWidth="2" strokeLinecap="round" />
      {/* Leaf body from mascot */}
      <path
        d="M20 4C13 4 7.5 8.5 9 16C15.5 15.5 19 9.5 20 4Z"
        fill="#34d399"
        stroke="#1a5b55"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Leaf inner highlight */}
      <path
        d="M11 12.5C13.5 14 16.5 11.5 18 7"
        stroke="#a7f3d0"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * CropTwinLeaves
 * Natural twin leaf sprig extracted directly from the mascot (without soil mound).
 * Used for cards, sections, and headers to add botanical variety.
 */
export function CropTwinLeaves({ className = "h-5 w-5" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Stem */}
      <path d="M16 28V14" stroke="#1a5b55" strokeWidth="2.5" strokeLinecap="round" />
      {/* Left Plump Leaf */}
      <path
        d="M16 21C9.5 21 4.5 16.5 6 9.5C12 9 15 14.5 16 21Z"
        fill="#34d399"
        stroke="#1a5b55"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 13C10.5 11 13 13.5 15 18"
        stroke="#a7f3d0"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Right Plump Leaf */}
      <path
        d="M16 17C22.5 17 27.5 12.5 26 5.5C20 5 17 10.5 16 17Z"
        fill="#4ade80"
        stroke="#1a5b55"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M24 9C21.5 7 19 9.5 17 14"
        stroke="#bbf7d0"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Subtle Golden Apex Accent */}
      <circle cx="16" cy="11.5" r="1.5" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * RainCloudCrop
 * Cartoon rain cloud gently watering a young sprout. Used for Step 1: Weather API / ERA5 telemetry.
 */
export function RainCloudCrop({ className = "h-8 w-8" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cloud body */}
      <path
        d="M12 21C9.2 21 7 18.8 7 16C7 13.5 8.8 11.4 11.2 11.1C12.1 7.6 15.3 5 19 5C23.4 5 27 8.6 27 13C29.8 13.2 32 15.5 32 18.3C32 21.2 29.6 23.5 26.7 23.5H12C12 23.5 12 22 12 21Z"
        fill="#E0F2FE"
        stroke="#0284C7"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Raindrops falling */}
      <path
        d="M13 25L11.5 28M19 25L17.5 28.5M25 25L23.5 28"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Little Sprout receiving rain at base */}
      <path
        d="M20 37C20 33 20 31 20 30"
        stroke="#1a5b55"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 32C17 32 15 30 16 28C19 28 20 30 20 32Z"
        fill="#34d399"
        stroke="#1a5b55"
        strokeWidth="1.2"
      />
      <path
        d="M20 31C23 31 25 29 24 27C21 27 20 29 20 31Z"
        fill="#4ade80"
        stroke="#1a5b55"
        strokeWidth="1.2"
      />
      {/* Gentle Soil Base */}
      <ellipse cx="20" cy="37" rx="6" ry="1.5" fill="#8B4513" fillOpacity="0.3" />
    </svg>
  );
}

/**
 * LeafShield
 * Cartoon botanical shield with an interwoven leaf protecting crops. Used for Step 2: Chainlink CRE consensus.
 */
export function LeafShield({ className = "h-8 w-8" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Shield Base */}
      <path
        d="M20 5L31 9V19C31 26.5 26.3 33.5 20 36C13.7 33.5 9 26.5 9 19V9L20 5Z"
        fill="#ECFDF5"
        stroke="#1a5b55"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner Leaf Emblem */}
      <path
        d="M20 11C20 18 14 23 20 29C26 23 20 18 20 11Z"
        fill="#34d399"
        stroke="#1a5b55"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Leaf Vein */}
      <path
        d="M20 14V27M17 19L20 21M23 18L20 20"
        stroke="#1a5b55"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Golden CRE Star Accent */}
      <circle cx="20" cy="9" r="1.8" fill="#FBBF24" stroke="#D97706" strokeWidth="0.8" />
    </svg>
  );
}

/**
 * ContractSeedling
 * Cartoon automated EVM smart contract scroll with a sprouting leaf seal. Used for Step 3: Contract Deficit Trigger.
 */
export function ContractSeedling({ className = "h-8 w-8" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Parchment Contract Body */}
      <rect
        x="10"
        y="6"
        width="20"
        height="28"
        rx="3"
        fill="#FDF4FF"
        stroke="#9333EA"
        strokeWidth="1.8"
      />
      {/* Code / Text Lines */}
      <line x1="14" y1="11" x2="26" y2="11" stroke="#A855F7" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="14" y1="16" x2="23" y2="16" stroke="#C084FC" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="14" y1="21" x2="26" y2="21" stroke="#C084FC" strokeWidth="1.6" strokeLinecap="round" />
      {/* Sprouting Wax Seal at Bottom */}
      <circle cx="20" cy="27" r="3.5" fill="#1a5b55" />
      <path
        d="M20 25C18.5 24 18 22 19 21C20.5 22 20 24 20 25Z"
        fill="#4ade80"
      />
      <path
        d="M20 25C21.5 24 22 22 21 21C19.5 22 20 24 20 25Z"
        fill="#34d399"
      />
    </svg>
  );
}

/**
 * HarvestPayoutCoins
 * Cartoon golden token coins with fresh green leaves. Used for Step 4: Auto Payout & RTT test balance.
 */
export function HarvestPayoutCoins({ className = "h-8 w-8" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Back Coin */}
      <circle cx="24" cy="18" r="9" fill="#FDE68A" stroke="#D97706" strokeWidth="1.8" />
      <text x="24" y="21" textAnchor="middle" fill="#B45309" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
        $
      </text>

      {/* Front Coin */}
      <circle cx="16" cy="24" r="9" fill="#FBBF24" stroke="#D97706" strokeWidth="1.8" />
      <text x="16" y="27.5" textAnchor="middle" fill="#78350F" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
        RTT
      </text>

      {/* Fresh sprout emerging from the coin */}
      <path
        d="M16 15C16 11 15 9 13 8C14 11 15 13 16 15Z"
        fill="#34d399"
        stroke="#1a5b55"
        strokeWidth="1.2"
      />
      <path
        d="M16 15C16 10 18 8 20 7C19 10 18 13 16 15Z"
        fill="#4ade80"
        stroke="#1a5b55"
        strokeWidth="1.2"
      />
    </svg>
  );
}

/**
 * GoldenHarvestSheaf
 * Sheaf of golden wheat/grain for yields, catalogues and successful harvests.
 */
export function GoldenHarvestSheaf({ className = "h-8 w-8" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Center Wheat Ear */}
      <path d="M18 32V8" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="18" cy="8" rx="2.5" ry="4" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
      <ellipse cx="18" cy="14" rx="2.5" ry="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />
      <ellipse cx="18" cy="20" rx="2.5" ry="3.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />

      {/* Left Grain Ear */}
      <path d="M18 24C14 22 11 18 10 14" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="10" cy="13" rx="2.2" ry="3.2" transform="rotate(-25 10 13)" fill="#FCD34D" stroke="#D97706" strokeWidth="1.2" />
      <ellipse cx="13" cy="18" rx="2" ry="3" transform="rotate(-20 13 18)" fill="#FCD34D" stroke="#D97706" strokeWidth="1.2" />

      {/* Right Grain Ear */}
      <path d="M18 24C22 22 25 18 26 14" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="26" cy="13" rx="2.2" ry="3.2" transform="rotate(25 26 13)" fill="#FCD34D" stroke="#D97706" strokeWidth="1.2" />
      <ellipse cx="23" cy="18" rx="2" ry="3" transform="rotate(20 23 18)" fill="#FCD34D" stroke="#D97706" strokeWidth="1.2" />

      {/* Natural Ribbon Tie */}
      <rect x="15" y="24" width="6" height="3" rx="1.5" fill="#1a5b55" />
    </svg>
  );
}

/**
 * FarmFieldPlot
 * Cartoon farm plot with furrows and fresh crop rows. Used for Farm Profile.
 */
export function FarmFieldPlot({ className = "h-8 w-8" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Soil Hill */}
      <path
        d="M4 27C10 24 26 24 32 27L30 32H6L4 27Z"
        fill="#8B4513"
        fillOpacity="0.7"
        stroke="#5D2E0C"
        strokeWidth="1.5"
      />
      {/* Furrow Lines */}
      <path d="M8 29C14 27 22 27 28 29" stroke="#5D2E0C" strokeWidth="1.2" strokeLinecap="round" />

      {/* Crop Shoots in the plot */}
      {/* Plant 1 */}
      <path d="M11 25V20" stroke="#1a5b55" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 22C9.5 21 9 19 10 18C11.5 19 11 21 11 22Z" fill="#34d399" />
      <path d="M11 21C12.5 20 13 18 12 17C10.5 18 11 20 11 21Z" fill="#4ade80" />

      {/* Plant 2 (Center) */}
      <path d="M18 24V16" stroke="#1a5b55" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M18 19C16 18 15 15 16.5 14C18.5 15 18 18 18 19Z" fill="#34d399" />
      <path d="M18 18C20 17 21 14 19.5 13C17.5 14 18 17 18 18Z" fill="#4ade80" />
      <circle cx="18" cy="12" r="1.2" fill="#FBBF24" />

      {/* Plant 3 */}
      <path d="M25 25V20" stroke="#1a5b55" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M25 22C23.5 21 23 19 24 18C25.5 19 25 21 25 22Z" fill="#34d399" />
      <path d="M25 21C26.5 20 27 18 26 17C24.5 18 25 20 25 21Z" fill="#4ade80" />

      {/* Farm Pin / Geolocation Marker */}
      <path
        d="M27 6C25.3 6 24 7.3 24 9C24 11.5 27 15 27 15C27 15 30 11.5 30 9C30 7.3 28.7 6 27 6Z"
        fill="#EF4444"
        stroke="#B91C1C"
        strokeWidth="1"
      />
      <circle cx="27" cy="9" r="1" fill="white" />
    </svg>
  );
}

/**
 * CropSeedPacket
 * Cartoon seed envelope for catalogue browsing.
 */
export function CropSeedPacket({ className = "h-8 w-8" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Packet Outline */}
      <path
        d="M8 7C8 5.9 8.9 5 10 5H26C27.1 5 28 5.9 28 7V29C28 30.1 27.1 31 26 31H10C8.9 31 8 30.1 8 29V7Z"
        fill="#F0FDF4"
        stroke="#1a5b55"
        strokeWidth="1.8"
      />
      {/* Packet Top Banner */}
      <path d="M8 12H28" stroke="#1a5b55" strokeWidth="1.5" />
      <rect x="8" y="5" width="20" height="7" fill="#1a5b55" />
      <text x="18" y="10.5" textAnchor="middle" fill="#ECFDF5" fontSize="4.5" fontWeight="bold" fontFamily="sans-serif">
        SEEDS
      </text>

      {/* Central Crop Emblem */}
      <circle cx="18" cy="21" r="6" fill="#DCFCE7" />
      <path d="M18 25V18" stroke="#1a5b55" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 21C16.5 20.5 15.5 19 16.5 18C18 19 18 20.5 18 21Z" fill="#34d399" />
      <path d="M18 20C19.5 19.5 20.5 18 19.5 17C18 18 18 19.5 18 20Z" fill="#4ade80" />
      <circle cx="18" cy="16.5" r="1" fill="#FBBF24" />
    </svg>
  );
}

/**
 * FieldLedger
 * Cartoon agricultural ledger book with a sprout bookmark for Policy History.
 */
export function FieldLedger({ className = "h-8 w-8" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Ledger Book Cover */}
      <rect x="8" y="6" width="21" height="25" rx="3" fill="#0D9488" stroke="#1a5b55" strokeWidth="1.8" />
      <rect x="11" y="8" width="16" height="21" rx="1.5" fill="#F8FAFC" />

      {/* Ledger Lines */}
      <line x1="14" y1="13" x2="24" y2="13" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="17" x2="24" y2="17" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14" y1="21" x2="22" y2="21" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" />

      {/* Sprout Bookmark Ribbon hanging out */}
      <path d="M22 6V3C20 2 19 0.5 20 0C21.5 0.5 22 2 22 3Z" fill="#4ade80" stroke="#1a5b55" strokeWidth="0.8" />
      <circle cx="19" cy="24.5" r="1.5" fill="#1a5b55" />
    </svg>
  );
}

/**
 * ProtectedSproutUmbrella
 * A cute cartoon sprout sheltered under a protective shield. Used for Empty States & Enrollment.
 */
export function ProtectedSproutUmbrella({ className = "h-16 w-16" }: CropIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Gentle Protective Dome / Shield */}
      <path
        d="M32 10C18 10 10 22 10 26C10 27.5 11.5 28.5 13 28C19 26 25 27 32 27C39 27 45 26 51 28C52.5 28.5 54 27.5 54 26C54 22 46 10 32 10Z"
        fill="#1a5b55"
        fillOpacity="0.15"
        stroke="#1a5b55"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Umbrella Handle Shaft */}
      <path d="M32 27V42C32 45 30 46 28 46" stroke="#1a5b55" strokeWidth="2" strokeLinecap="round" />

      {/* Ground Mound */}
      <ellipse cx="32" cy="54" rx="16" ry="4" fill="#8B4513" fillOpacity="0.3" />
      <ellipse cx="32" cy="53" rx="12" ry="3" fill="#5D2E0C" fillOpacity="0.25" />

      {/* Healthy Sprout Stem under the umbrella */}
      <path d="M32 52V38" stroke="#1a5b55" strokeWidth="3" strokeLinecap="round" />

      {/* Left Leaf */}
      <path
        d="M32 46C24 46 19 40 21 33C28 33 31 39 32 46Z"
        fill="#34d399"
        stroke="#1a5b55"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Right Leaf */}
      <path
        d="M32 42C40 42 45 36 43 29C36 29 33 35 32 42Z"
        fill="#4ade80"
        stroke="#1a5b55"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Golden Seed Apex */}
      <circle cx="32" cy="35" r="2.5" fill="#FBBF24" stroke="#D97706" strokeWidth="1.2" />

      {/* Gentle Floating Droplet on Outside of Shield */}
      <path
        d="M48 18C48 20 46.5 21.5 45 21.5C43.5 21.5 42 20 45 16C48 20 48 20 48 18Z"
        fill="#38BDF8"
      />
      <path
        d="M17 19C17 21 15.5 22.5 14 22.5C12.5 22.5 11 21 14 17C17 21 17 21 17 19Z"
        fill="#38BDF8"
      />
    </svg>
  );
}

