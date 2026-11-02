/**
 * mockAdapter.ts
 *
 * Mock contract adapter implementing in-memory / browser-persistent simulation
 * of smart contract interactions when NEXT_PUBLIC_MOCK_MODE=true.
 *
 * All functions return clearly flagged MOCK indicators and deterministic results.
 * This ensures that before Member 1's smart contract is deployed, every single
 * frontend screen can be tested against the contract interface.
 */

import { parseUnits } from "ethers";
import { CatalogueOption, MOCK_CATALOGUE } from "./mockCatalogue";
import { generateMockPolicies, OnChainPolicy } from "./mockPolicies";
import { recordMockEvent } from "../contract/eventIndexer";

const MOCK_STORAGE_KEY_PREFIX = "crop_insure_mock_policies_";

export interface MockTxResult {
  transactionHash: string;
  blockNumber: number;
  policyId?: number;
  status: "confirmed" | "failed";
}

/**
 * In-memory or localStorage policy cache for a given wallet address.
 */
function getStoredPolicies(owner: string): OnChainPolicy[] {
  if (typeof window === "undefined") {
    return generateMockPolicies(owner);
  }

  const key = `${MOCK_STORAGE_KEY_PREFIX}${owner.toLowerCase()}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = generateMockPolicies(owner);
      localStorage.setItem(
        key,
        JSON.stringify(initial, (_, v) => (typeof v === "bigint" ? v.toString() : v))
      );
      return initial;
    }
    const parsed = JSON.parse(raw) as (Omit<OnChainPolicy, "payoutAmount"> & { payoutAmount: string })[];
    return parsed.map((p) => ({
      ...p,
      payoutAmount: BigInt(p.payoutAmount),
    }));
  } catch {
    return generateMockPolicies(owner);
  }
}

function saveStoredPolicies(owner: string, policies: OnChainPolicy[]): void {
  if (typeof window === "undefined") return;
  const key = `${MOCK_STORAGE_KEY_PREFIX}${owner.toLowerCase()}`;
  localStorage.setItem(
    key,
    JSON.stringify(policies, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

/**
 * Mock implementation of catalogue retrieval (Appendix A.1).
 */
export async function mockGetCatalogue(): Promise<CatalogueOption[]> {
  // Simulate tiny async latency to test UI loading spinners
  await new Promise((r) => setTimeout(r, 100));
  return [...MOCK_CATALOGUE];
}

/**
 * Mock implementation of fetching all policies for a wallet owner (Appendix A.3).
 */
export async function mockGetPoliciesForOwner(owner: string): Promise<OnChainPolicy[]> {
  await new Promise((r) => setTimeout(r, 150));
  return getStoredPolicies(owner);
}

/**
 * Mock implementation of fetching a single policy by ID.
 */
export async function mockGetPolicy(policyId: number, owner: string): Promise<OnChainPolicy | null> {
  await new Promise((r) => setTimeout(r, 100));
  if (owner) {
    const list = getStoredPolicies(owner);
    const found = list.find((p) => p.policyId === policyId);
    if (found) return found;
  }

  // Fallback search across stored policies in localStorage
  if (typeof window !== "undefined") {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(MOCK_STORAGE_KEY_PREFIX)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const found = parsed.find((p: { policyId: number }) => p.policyId === policyId);
            if (found) {
              return {
                ...found,
                payoutAmount: BigInt(found.payoutAmount),
              };
            }
          }
        } catch {
          // Ignore parse errors on malformed keys
        }
      }
    }
  }

  // Default fallback for demo / test account
  const defaultList = getStoredPolicies("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
  return defaultList.find((p) => p.policyId === policyId) ?? null;
}

/**
 * Mock implementation of enrolling in a policy.
 * Validates inputs against contract constraints and appends to mock storage.
 */
export async function mockEnroll(
  optionId: number,
  startTime: number,
  latitudeE6: number,
  longitudeE6: number,
  owner: string,
): Promise<{ tx: MockTxResult; policyId: number }> {
  await new Promise((r) => setTimeout(r, 400));

  const option = MOCK_CATALOGUE.find((o) => o.optionId === optionId);
  if (!option) {
    throw new Error("InvalidOption: Policy option does not exist in the catalogue.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (startTime <= now) {
    throw new Error("StartTimeInPast: Start time cannot be in the past.");
  }

  // Alignment rules (RPD Section 9, M3-E01, Appendix A.2)
  if (option.isDemo && startTime % 3600 !== 0) {
    throw new Error("InvalidStartAlignment: Demo option requires a full-hour start time.");
  }
  if (!option.isDemo && startTime % 86400 !== 0) {
    throw new Error("InvalidStartAlignment: Standard policies require a whole-day start time (00:00:00 UTC).");
  }

  const policies = getStoredPolicies(owner);
  const nextId = policies.length > 0 ? Math.max(...policies.map((p) => p.policyId)) + 1 : 201;

  // Contract calculates endTime = startTime + durationSeconds
  const endTime = startTime + option.durationSeconds;

  const newPolicy: OnChainPolicy = {
    policyId: nextId,
    owner: owner.toLowerCase(),
    optionId,
    latitudeE6,
    longitudeE6,
    startTime,
    endTime,
    thresholdMm: option.triggerMm,
    payoutAmount: parseUnits(option.payoutRtt.toString(), 18),
    reportReceived: false,
    rainfallMm: 0,
    eligible: false,
    claimed: false,
    mockDescription: `Mock Policy created from Option ${optionId} (${option.riskLabel})`,
  };

  policies.unshift(newPolicy);
  saveStoredPolicies(owner, policies);

  const mockHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

  recordMockEvent({
    id: `dyn-enroll-${nextId}-${Date.now()}`,
    eventName: "PolicyCreated",
    eventType: "ENROLLMENT",
    policyId: nextId,
    owner: owner.toLowerCase(),
    blockNumber: 1234567,
    transactionHash: mockHash,
    timestamp: now,
    summary: `Enrolled in Option #${optionId} (${option.riskLabel} Cover, ${option.durationLabel})`,
    details: {
      optionId,
      thresholdMm: option.triggerMm,
      amountRtt: option.payoutRtt.toString(),
    },
    isMock: true,
  });

  return {
    tx: {
      transactionHash: mockHash,
      blockNumber: 1234567,
      policyId: nextId,
      status: "confirmed",
    },
    policyId: nextId,
  };
}

/**
 * Mock implementation of claiming an eligible policy.
 */
export async function mockClaim(
  policyId: number,
  caller: string,
): Promise<MockTxResult> {
  await new Promise((r) => setTimeout(r, 400));

  const policies = getStoredPolicies(caller);
  const policy = policies.find((p) => p.policyId === policyId);

  if (!policy) {
    throw new Error("PolicyNotFound: Policy does not exist.");
  }
  if (policy.owner.toLowerCase() !== caller.toLowerCase()) {
    throw new Error("NotPolicyOwner: You are not the owner of this policy.");
  }
  if (policy.claimed) {
    throw new Error("AlreadyClaimed: This policy has already been paid.");
  }
  if (!policy.reportReceived) {
    throw new Error("ReportNotAccepted: Rainfall report has not been accepted yet.");
  }
  if (!policy.eligible) {
    throw new Error("NotEligible: Policy is not eligible for payout.");
  }

  // Mark policy claimed in mock store
  policy.claimed = true;
  saveStoredPolicies(caller, policies);

  const mockHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const now = Math.floor(Date.now() / 1000);

  recordMockEvent({
    id: `dyn-claim-${policyId}-${Date.now()}`,
    eventName: "ClaimPaid",
    eventType: "CLAIM",
    policyId,
    owner: caller.toLowerCase(),
    blockNumber: 1234580,
    transactionHash: mockHash,
    timestamp: now,
    summary: `Claim payout of 60 RTT settled and transferred for Policy #${policyId}`,
    details: {
      amountRtt: "60",
      isEligible: true,
    },
    isMock: true,
  });

  return {
    transactionHash: mockHash,
    blockNumber: 1234580,
    policyId,
    status: "confirmed",
  };
}
