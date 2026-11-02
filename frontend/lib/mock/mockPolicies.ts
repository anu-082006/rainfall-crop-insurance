/**
 * mockPolicies.ts
 *
 * Sample policy states from RPD Appendix A.3.
 *
 * Provides concrete mock representations of all 7 contractual test states:
 * 1. Scheduled (Coverage not started yet)
 * 2. Active (Coverage currently running)
 * 3. Coverage ended, awaiting report (Ended with no oracle report submitted)
 * 4. Eligible (Report accepted, actual rainfall < trigger)
 * 5. Not eligible - Equal (Report accepted, rainfall == trigger)
 * 6. Not eligible - Above (Report accepted, rainfall > trigger)
 * 7. Claimed (Eligible payout already transferred)
 *
 * Note on unit conventions:
 * - Coordinates are stored as integers with 1e6 scale factor (e.g. 12.970000 -> 12970000).
 * - Timestamps are Unix seconds.
 * - Rainfall and triggers are whole millimeters.
 * - Payouts are in 18-decimal RTT units (stored as bigint).
 */

import { parseUnits } from "ethers";

export interface OnChainPolicy {
  policyId: number;
  owner: string;
  optionId: number;
  latitudeE6: number;  // Latitude * 1,000,000
  longitudeE6: number; // Longitude * 1,000,000
  startTime: number;   // Unix seconds
  endTime: number;     // Unix seconds (startTime + durationSeconds)
  thresholdMm: number; // Whole mm
  payoutAmount: bigint; // RTT in wei (18 decimals)
  reportReceived: boolean;
  rainfallMm: number;  // Whole mm reported by oracle
  eligible: boolean;   // On-chain or computed eligibility
  claimed: boolean;    // Payout claimed flag
  // Off-chain / mock metadata for UI richness
  mockDescription?: string;
}

/**
 * Creates dynamic mock policies relative to the current clock time
 * so tests reliably exercise future, current, and past states.
 */
export function generateMockPolicies(ownerAddress: string): OnChainPolicy[] {
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 86400;
  const owner = ownerAddress.toLowerCase();

  return [
    // 1. Scheduled (Starts in 3 days, ends in 33 days)
    {
      policyId: 101,
      owner,
      optionId: 1, // Severe 30 days
      latitudeE6: 12971600, // 12.9716° N
      longitudeE6: 77594600, // 77.5946° E
      startTime: now + 3 * oneDay,
      endTime: now + 33 * oneDay,
      thresholdMm: 30,
      payoutAmount: parseUnits("90", 18),
      reportReceived: false,
      rainfallMm: 0,
      eligible: false,
      claimed: false,
      mockDescription: "Scheduled: Coverage starts in 3 days",
    },
    // 2. Active (Started 10 days ago, ends in 20 days)
    {
      policyId: 102,
      owner,
      optionId: 5, // Moderate 30 days
      latitudeE6: 16306700,
      longitudeE6: 80436500,
      startTime: now - 10 * oneDay,
      endTime: now + 20 * oneDay,
      thresholdMm: 60,
      payoutAmount: parseUnits("60", 18),
      reportReceived: false,
      rainfallMm: 0,
      eligible: false,
      claimed: false,
      mockDescription: "Active: Currently in coverage window (day 10 of 30)",
    },
    // 3. Coverage ended, awaiting report (Ended 2 days ago, no oracle report yet)
    {
      policyId: 103,
      owner,
      optionId: 0, // Demo 2 hours
      latitudeE6: 17385000,
      longitudeE6: 78486700,
      startTime: now - 7200 - 3600,
      endTime: now - 3600,
      thresholdMm: 1,
      payoutAmount: parseUnits("10", 18),
      reportReceived: false,
      rainfallMm: 0, // Must NEVER be shown as 0 mm to user when reportReceived is false!
      eligible: false,
      claimed: false,
      mockDescription: "Ended, awaiting report: Window closed 1 hour ago",
    },
    // 4. Eligible (Ended, report received: 42 mm strictly below 60 mm trigger, unclaimed)
    {
      policyId: 104,
      owner,
      optionId: 5, // Moderate 30 days
      latitudeE6: 12971600,
      longitudeE6: 77594600,
      startTime: now - 35 * oneDay,
      endTime: now - 5 * oneDay,
      thresholdMm: 60,
      payoutAmount: parseUnits("60", 18),
      reportReceived: true,
      rainfallMm: 42,
      eligible: true,
      claimed: false,
      mockDescription: "Eligible: Rainfall 42 mm < 60 mm trigger. Claim enabled.",
    },
    // 5. Not eligible - Equal (Ended, report: 60 mm == 60 mm trigger)
    {
      policyId: 105,
      owner,
      optionId: 5,
      latitudeE6: 11016800,
      longitudeE6: 76955800,
      startTime: now - 40 * oneDay,
      endTime: now - 10 * oneDay,
      thresholdMm: 60,
      payoutAmount: parseUnits("60", 18),
      reportReceived: true,
      rainfallMm: 60,
      eligible: false,
      claimed: false,
      mockDescription: "Not eligible: Rainfall 60 mm equals 60 mm trigger (not below)",
    },
    // 6. Not eligible - Above (Ended, report: 85 mm > 60 mm trigger)
    {
      policyId: 106,
      owner,
      optionId: 5,
      latitudeE6: 13082700,
      longitudeE6: 80270700,
      startTime: now - 50 * oneDay,
      endTime: now - 20 * oneDay,
      thresholdMm: 60,
      payoutAmount: parseUnits("60", 18),
      reportReceived: true,
      rainfallMm: 85,
      eligible: false,
      claimed: false,
      mockDescription: "Not eligible: Rainfall 85 mm exceeds 60 mm trigger",
    },
    // 7. Claimed (Ended, eligible, already claimed and paid)
    {
      policyId: 107,
      owner,
      optionId: 2, // Severe 60 days
      latitudeE6: 15317300,
      longitudeE6: 75713900,
      startTime: now - 70 * oneDay,
      endTime: now - 10 * oneDay,
      thresholdMm: 60,
      payoutAmount: parseUnits("180", 18),
      reportReceived: true,
      rainfallMm: 38,
      eligible: true,
      claimed: true,
      mockDescription: "Claimed: Paid 180 RTT to farmer",
    },
  ];
}
