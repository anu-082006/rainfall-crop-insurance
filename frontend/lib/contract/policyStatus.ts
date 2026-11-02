/**
 * policyStatus.ts
 *
 * Implements the policy status derivation logic strictly according to
 * Section 8 of the Member 3 RPD v2.0:
 *
 * Order of evaluation:
 * 1. Claimed flag set: "Claimed"
 * 2. Report accepted and rainfall strictly below the trigger: "Eligible"
 * 3. Report accepted and rainfall not below the trigger (equal counts as not below): "Not eligible"
 * 4. Current time before the start time: "Scheduled" (coverage not started)
 * 5. Current time at or after the end time and no report: "Coverage ended, awaiting report"
 * 6. Otherwise: "Active" (coverage running)
 *
 * The frontend derives this dynamically from contract data and the current timestamp;
 * it is NEVER stored in frontend state.
 */

import type { OnChainPolicy } from "../mock/mockPolicies";

export type PolicyStatusCode =
  | "CLAIMED"
  | "ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "SCHEDULED"
  | "AWAITING_REPORT"
  | "ACTIVE";

export type BadgeVariant = "green" | "emerald" | "amber" | "blue" | "gray" | "red";

export interface PolicyStatusResult {
  code: PolicyStatusCode;
  label: string;
  badgeVariant: BadgeVariant;
  description: string;
  canClaim: boolean;
  reasonDisabled?: string;
}

export interface PolicyStatusInput {
  startTime: number;      // Unix seconds
  endTime: number;        // Unix seconds
  reportReceived: boolean;
  rainfallMm: number;     // Integer mm
  thresholdMm: number;    // Integer mm
  claimed: boolean;
  // Optional current time for deterministic testing; defaults to Date.now() / 1000
  currentTime?: number;
}

/**
 * Derive user-facing policy status from contract fields and the timestamp.
 */
export function derivePolicyStatus(policy: PolicyStatusInput): PolicyStatusResult {
  const now = policy.currentTime ?? Math.floor(Date.now() / 1000);

  // 1. Claimed flag set -> Claimed
  if (policy.claimed) {
    return {
      code: "CLAIMED",
      label: "Claimed",
      badgeVariant: "gray",
      description: "Insurance payout has been claimed and transferred to the policy owner.",
      canClaim: false,
      reasonDisabled: "This policy has already been claimed and paid.",
    };
  }

  // 2 & 3. Report accepted
  if (policy.reportReceived) {
    // Condition: rainfall strictly below trigger (< thresholdMm)
    if (policy.rainfallMm < policy.thresholdMm) {
      return {
        code: "ELIGIBLE",
        label: "Eligible",
        badgeVariant: "emerald",
        description: `Oracle reported ${policy.rainfallMm} mm rainfall, which is below the ${policy.thresholdMm} mm trigger. Payout is available.`,
        canClaim: true,
      };
    } else {
      // Equal or greater counts as not below
      return {
        code: "NOT_ELIGIBLE",
        label: "Not eligible",
        badgeVariant: "red",
        description: `Oracle reported ${policy.rainfallMm} mm rainfall, which is not below the ${policy.thresholdMm} mm trigger. No payout due.`,
        canClaim: false,
        reasonDisabled: `Observed rainfall (${policy.rainfallMm} mm) was not below the trigger threshold (${policy.thresholdMm} mm).`,
      };
    }
  }

  // 4. Current time before start time -> Scheduled
  if (now < policy.startTime) {
    return {
      code: "SCHEDULED",
      label: "Scheduled",
      badgeVariant: "blue",
      description: "Coverage period has not started yet. The policy will become active at the start date.",
      canClaim: false,
      reasonDisabled: "Coverage has not started yet.",
    };
  }

  // 5. Current time at or after end time and no report -> Coverage ended, awaiting report
  if (now >= policy.endTime) {
    return {
      code: "AWAITING_REPORT",
      label: "Coverage ended (awaiting report)",
      badgeVariant: "amber",
      description: "Coverage window has completed. Awaiting verified rainfall report from the oracle.",
      canClaim: false,
      reasonDisabled: "Rainfall report has not yet been submitted and verified by the oracle.",
    };
  }

  // 6. Otherwise -> Active
  return {
    code: "ACTIVE",
    label: "Active",
    badgeVariant: "green",
    description: "Coverage is currently running. Oracle will measure rainfall across the full duration.",
    canClaim: false,
    reasonDisabled: "Coverage window is still actively running.",
  };
}

/**
 * Convenience helper accepting a full on-chain policy struct.
 */
export function getStatusForPolicy(
  policy: Pick<OnChainPolicy, "startTime" | "endTime" | "reportReceived" | "rainfallMm" | "thresholdMm" | "claimed">,
  currentTime?: number,
): PolicyStatusResult {
  return derivePolicyStatus({
    startTime: policy.startTime,
    endTime: policy.endTime,
    reportReceived: policy.reportReceived,
    rainfallMm: policy.rainfallMm,
    thresholdMm: policy.thresholdMm,
    claimed: policy.claimed,
    currentTime,
  });
}
