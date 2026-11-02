/**
 * mockCatalogue.ts
 *
 * Authoritative 13-option policy catalogue from RPD Appendix A.1.
 *
 * IMPORTANT:
 * - This data is MOCK ONLY, used when NEXT_PUBLIC_MOCK_MODE=true or when
 *   Member 1's deployed contract address is not yet configured.
 * - In real contract mode, terms are read directly from the smart contract
 *   using optionCount() and getOption(i). Terms are never hardcoded in production.
 * - Duration is stored in seconds for EVM calculation (startTime + durationSeconds).
 * - Payouts are represented in RTT token units (18 decimals).
 */

export interface CatalogueOption {
  optionId: number;
  riskLabel: "Demo" | "Severe" | "Moderate" | "Mild";
  durationSeconds: number;
  durationLabel: string;
  triggerMm: number; // Threshold in whole mm
  payoutRtt: number; // Payout in RTT tokens
  isDemo: boolean;
}

export const MOCK_CATALOGUE: CatalogueOption[] = [
  {
    optionId: 0,
    riskLabel: "Demo",
    durationSeconds: 2 * 3600, // 2 hours
    durationLabel: "2 hours",
    triggerMm: 1,
    payoutRtt: 10,
    isDemo: true,
  },
  {
    optionId: 1,
    riskLabel: "Severe",
    durationSeconds: 30 * 86400, // 30 days
    durationLabel: "30 days",
    triggerMm: 30,
    payoutRtt: 90,
    isDemo: false,
  },
  {
    optionId: 2,
    riskLabel: "Severe",
    durationSeconds: 60 * 86400, // 60 days
    durationLabel: "60 days",
    triggerMm: 60,
    payoutRtt: 180,
    isDemo: false,
  },
  {
    optionId: 3,
    riskLabel: "Severe",
    durationSeconds: 90 * 86400, // 90 days
    durationLabel: "90 days",
    triggerMm: 90,
    payoutRtt: 270,
    isDemo: false,
  },
  {
    optionId: 4,
    riskLabel: "Severe",
    durationSeconds: 120 * 86400, // 120 days
    durationLabel: "120 days",
    triggerMm: 120,
    payoutRtt: 360,
    isDemo: false,
  },
  {
    optionId: 5,
    riskLabel: "Moderate",
    durationSeconds: 30 * 86400, // 30 days
    durationLabel: "30 days",
    triggerMm: 60,
    payoutRtt: 60,
    isDemo: false,
  },
  {
    optionId: 6,
    riskLabel: "Moderate",
    durationSeconds: 60 * 86400, // 60 days
    durationLabel: "60 days",
    triggerMm: 120,
    payoutRtt: 120,
    isDemo: false,
  },
  {
    optionId: 7,
    riskLabel: "Moderate",
    durationSeconds: 90 * 86400, // 90 days
    durationLabel: "90 days",
    triggerMm: 180,
    payoutRtt: 180,
    isDemo: false,
  },
  {
    optionId: 8,
    riskLabel: "Moderate",
    durationSeconds: 120 * 86400, // 120 days
    durationLabel: "120 days",
    triggerMm: 240,
    payoutRtt: 240,
    isDemo: false,
  },
  {
    optionId: 9,
    riskLabel: "Mild",
    durationSeconds: 30 * 86400, // 30 days
    durationLabel: "30 days",
    triggerMm: 90,
    payoutRtt: 30,
    isDemo: false,
  },
  {
    optionId: 10,
    riskLabel: "Mild",
    durationSeconds: 60 * 86400, // 60 days
    durationLabel: "60 days",
    triggerMm: 180,
    payoutRtt: 60,
    isDemo: false,
  },
  {
    optionId: 11,
    riskLabel: "Mild",
    durationSeconds: 90 * 86400, // 90 days
    durationLabel: "90 days",
    triggerMm: 270,
    payoutRtt: 90,
    isDemo: false,
  },
  {
    optionId: 12,
    riskLabel: "Mild",
    durationSeconds: 120 * 86400, // 120 days
    durationLabel: "120 days",
    triggerMm: 360,
    payoutRtt: 120,
    isDemo: false,
  },
];
