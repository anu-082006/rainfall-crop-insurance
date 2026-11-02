/**
 * eventIndexer.ts
 *
 * Smart contract event retrieval, indexing, and historical transaction formatting (M3-H01, M3-H02).
 * Synchronized with Person 1's CropInsurance.sol events:
 * - PolicyCreated(uint256 indexed policyId, address indexed owner, uint256 indexed optionId)
 * - RainfallReportAccepted(uint256 indexed policyId, uint256 rainfallMm)
 * - ClaimPaid(uint256 indexed policyId, address indexed owner, uint256 amount)
 *
 * Supports:
 * - Querying on-chain event logs with proper indexed topic filtering
 * - Deterministic, clearly-labelled mock event history when in mock mode (MOCK_MODE=true)
 * - Filtering events by connected wallet address
 * - Transaction hash copy and navigation resolution
 */

import { BrowserProvider, Contract, EventLog, formatUnits, JsonRpcProvider, Log, type Provider } from "ethers";
import { INSURANCE_ABI } from "./abi.ts";
import { CONTRACT_ADDRESS, MOCK_MODE, RPC_URL, RTT_DECIMALS } from "../utils/constants.ts";
import { formatRainfall, formatRtt } from "../utils/formatters.ts";

export type EventType = "ENROLLMENT" | "REPORT" | "CLAIM";

export interface ContractEventItem {
  id: string; // Unique key (txHash + logIndex or synthetic id)
  eventName: "PolicyCreated" | "PolicyEnrolled" | "RainfallReportAccepted" | "ClaimPaid";
  eventType: EventType;
  policyId: number;
  owner?: string;
  blockNumber: number;
  transactionHash: string;
  timestamp: number; // Unix seconds
  summary: string;
  details: {
    optionId?: number;
    rainfallMm?: number;
    thresholdMm?: number;
    amountRtt?: string;
    isEligible?: boolean;
  };
  isMock: boolean;
}

const MOCK_EVENTS_STORAGE_PREFIX = "crop_insure_mock_events_";

/**
 * Saves a new mock event to localStorage so user transactions appear immediately in history.
 */
export function recordMockEvent(event: ContractEventItem): void {
  if (typeof window === "undefined" || !event.owner) return;
  const key = `${MOCK_EVENTS_STORAGE_PREFIX}${event.owner.toLowerCase()}`;
  try {
    const raw = localStorage.getItem(key);
    const existing: ContractEventItem[] = raw ? JSON.parse(raw) : [];
    // Prepend new event
    existing.unshift(event);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (err) {
    console.warn("Could not save mock event to localStorage:", err);
  }
}

/**
 * Generates baseline mock events corresponding to the initial sample policies in Appendix A.3.
 */
export function generateBaselineMockEvents(ownerAddress: string): ContractEventItem[] {
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 86400;
  const owner = ownerAddress.toLowerCase();

  return [
    // Policy #107: ClaimPaid
    {
      id: "mock-evt-107-claim",
      eventName: "ClaimPaid",
      eventType: "CLAIM",
      policyId: 107,
      owner,
      blockNumber: 1234580,
      transactionHash: "0x7a3f89e2c140bc51a2489d0e74f8c92a15f013d5b78e24c6198f45a70192e4bd",
      timestamp: now - 9 * oneDay,
      summary: "Claim payout of 180 RTT settled and transferred to wallet",
      details: {
        amountRtt: "180",
        isEligible: true,
      },
      isMock: true,
    },
    // Policy #107: RainfallReportAccepted
    {
      id: "mock-evt-107-report",
      eventName: "RainfallReportAccepted",
      eventType: "REPORT",
      policyId: 107,
      owner,
      blockNumber: 1234575,
      transactionHash: "0x4b81c3e90a12f5678cd901e2345fa67890bcde1234567890abcdef1234567890",
      timestamp: now - 10 * oneDay,
      summary: "Weather oracle reported 38 mm rainfall (below 60 mm trigger)",
      details: {
        rainfallMm: 38,
        thresholdMm: 60,
        isEligible: true,
      },
      isMock: true,
    },
    // Policy #106: RainfallReportAccepted
    {
      id: "mock-evt-106-report",
      eventName: "RainfallReportAccepted",
      eventType: "REPORT",
      policyId: 106,
      owner,
      blockNumber: 1234550,
      transactionHash: "0x91c0e2a3b4c5d6e7f8091a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
      timestamp: now - 20 * oneDay,
      summary: "Weather oracle reported 85 mm rainfall (exceeds 60 mm trigger)",
      details: {
        rainfallMm: 85,
        thresholdMm: 60,
        isEligible: false,
      },
      isMock: true,
    },
    // Policy #105: RainfallReportAccepted
    {
      id: "mock-evt-105-report",
      eventName: "RainfallReportAccepted",
      eventType: "REPORT",
      policyId: 105,
      owner,
      blockNumber: 1234520,
      transactionHash: "0x33a2f1c8b9d0e74f8c92a15f013d5b78e24c6198f45a70192e4bd7a3f89e2c14",
      timestamp: now - 10 * oneDay,
      summary: "Weather oracle reported 60 mm rainfall (equals 60 mm trigger)",
      details: {
        rainfallMm: 60,
        thresholdMm: 60,
        isEligible: false,
      },
      isMock: true,
    },
    // Policy #104: RainfallReportAccepted
    {
      id: "mock-evt-104-report",
      eventName: "RainfallReportAccepted",
      eventType: "REPORT",
      policyId: 104,
      owner,
      blockNumber: 1234490,
      transactionHash: "0x55d7e8f9a0b1c2d33a2f1c8b9d0e74f8c92a15f013d5b78e24c6198f45a70192",
      timestamp: now - 5 * oneDay,
      summary: "Weather oracle reported 42 mm rainfall (below 60 mm trigger - eligible for claim)",
      details: {
        rainfallMm: 42,
        thresholdMm: 60,
        isEligible: true,
      },
      isMock: true,
    },
    // Enrollments (PolicyCreated)
    {
      id: "mock-evt-101-enroll",
      eventName: "PolicyCreated",
      eventType: "ENROLLMENT",
      policyId: 101,
      owner,
      blockNumber: 1234400,
      transactionHash: "0x11e2f3a4b5c6d7e8f9a0b1c2d33a2f1c8b9d0e74f8c92a15f013d5b78e24c619",
      timestamp: now - 2 * oneDay,
      summary: "Enrolled in Option #1 (Severe Cover, 30 days)",
      details: {
        optionId: 1,
        thresholdMm: 30,
        amountRtt: "90",
      },
      isMock: true,
    },
    {
      id: "mock-evt-102-enroll",
      eventName: "PolicyCreated",
      eventType: "ENROLLMENT",
      policyId: 102,
      owner,
      blockNumber: 1234350,
      transactionHash: "0x22f013d5b78e24c6198f45a70192e4bd7a3f89e2c140bc51a2489d0e74f8c92a",
      timestamp: now - 10 * oneDay,
      summary: "Enrolled in Option #5 (Moderate Cover, 30 days)",
      details: {
        optionId: 5,
        thresholdMm: 60,
        amountRtt: "60",
      },
      isMock: true,
    },
    {
      id: "mock-evt-103-enroll",
      eventName: "PolicyCreated",
      eventType: "ENROLLMENT",
      policyId: 103,
      owner,
      blockNumber: 1234300,
      transactionHash: "0x66c92a15f013d5b78e24c6198f45a70192e4bd7a3f89e2c140bc51a2489d0e74",
      timestamp: now - 3600 * 3,
      summary: "Enrolled in Option #0 (Demo Cover, 2 hours)",
      details: {
        optionId: 0,
        thresholdMm: 1,
        amountRtt: "10",
      },
      isMock: true,
    },
  ];
}

/**
 * Loads mock event history for a wallet, combining saved dynamic mock events with baseline events.
 */
export function getMockEventHistory(ownerAddress: string): ContractEventItem[] {
  const baseline = generateBaselineMockEvents(ownerAddress).sort(
    (a, b) => b.timestamp - a.timestamp
  );

  if (typeof window === "undefined") {
    return baseline;
  }

  const key = `${MOCK_EVENTS_STORAGE_PREFIX}${ownerAddress.toLowerCase()}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return baseline;
    const dynamicEvents: ContractEventItem[] = JSON.parse(raw);

    // Merge and deduplicate by id
    const seen = new Set<string>();
    const merged: ContractEventItem[] = [];

    for (const evt of [...dynamicEvents, ...baseline]) {
      if (!seen.has(evt.id)) {
        seen.add(evt.id);
        merged.push(evt);
      }
    }

    // Sort by timestamp descending
    return merged.sort((a, b) => b.timestamp - a.timestamp);
  } catch {
    return baseline;
  }
}

/**
 * Primary function to retrieve all transaction & contract event history for a wallet.
 *
 * If MOCK_MODE=true or no CONTRACT_ADDRESS is configured, reads mock event log.
 * Otherwise, queries the live contract using Ethers.js queryFilter.
 */
export async function getEventHistory(
  ownerAddress?: string,
  provider?: Provider
): Promise<ContractEventItem[]> {
  if (!ownerAddress) return [];

  const normalizedOwner = ownerAddress.toLowerCase();

  // Branch 1: Mock Mode (Appendix A.3 / MOCK_MODE)
  if (MOCK_MODE || !CONTRACT_ADDRESS) {
    // Add tiny simulated async latency
    await new Promise((r) => setTimeout(r, 120));
    return getMockEventHistory(normalizedOwner);
  }

  // Branch 2: Live Contract Event Query
  const activeProvider =
    provider ??
    (typeof window !== "undefined" && window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider(RPC_URL));

  try {
    const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, activeProvider);

    // 1. Query PolicyCreated events for this owner (actual Solidity event)
    let enrollLogs: (EventLog | Log)[] = [];
    try {
      const enrollFilter = contract.filters.PolicyCreated(null, ownerAddress);
      enrollLogs = await contract.queryFilter(enrollFilter, 0, "latest");
    } catch {
      // Fallback for mock/test interfaces
      try {
        const legacyFilter = contract.filters.PolicyEnrolled(null, ownerAddress);
        enrollLogs = await contract.queryFilter(legacyFilter, 0, "latest");
      } catch {
        enrollLogs = [];
      }
    }

    // 2. Query ClaimPaid events for this owner
    const claimFilter = contract.filters.ClaimPaid(null, ownerAddress);
    const claimLogs = await contract.queryFilter(claimFilter, 0, "latest");

    // 3. Query RainfallReportAccepted events
    const reportFilter = contract.filters.RainfallReportAccepted();
    const reportLogs = await contract.queryFilter(reportFilter, 0, "latest");

    const events: ContractEventItem[] = [];

    // Process enrollments / policy creations
    for (const log of enrollLogs) {
      const parsed = contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed) {
        const policyId = Number(parsed.args[0]);
        // PolicyCreated(uint256 indexed policyId, address indexed owner, uint256 indexed optionId)
        const optId = Number(parsed.args[2]);
        const block = await activeProvider.getBlock(log.blockNumber);
        const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

        events.push({
          id: `${log.transactionHash}-${log.index}`,
          eventName: "PolicyCreated",
          eventType: "ENROLLMENT",
          policyId,
          owner: normalizedOwner,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp,
          summary: `Enrolled in Policy #${policyId} (Option #${optId})`,
          details: { optionId: optId },
          isMock: false,
        });
      }
    }

    // Process claims
    for (const log of claimLogs) {
      const parsed = contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed) {
        const policyId = Number(parsed.args[0]);
        const amountWei = BigInt(parsed.args[2]);
        const amountRtt = formatUnits(amountWei, RTT_DECIMALS);
        const block = await activeProvider.getBlock(log.blockNumber);
        const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

        events.push({
          id: `${log.transactionHash}-${log.index}`,
          eventName: "ClaimPaid",
          eventType: "CLAIM",
          policyId,
          owner: normalizedOwner,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          timestamp,
          summary: `Payout of ${formatRtt(amountRtt, 0)} settled on-chain for Policy #${policyId}`,
          details: { amountRtt },
          isMock: false,
        });
      }
    }

    // Process reports (filter for policies belonging to this owner)
    const ownerPolicyIds = new Set(events.map((e) => e.policyId));
    for (const log of reportLogs) {
      const parsed = contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed) {
        const policyId = Number(parsed.args[0]);
        if (ownerPolicyIds.has(policyId)) {
          const rainfallMm = Number(parsed.args[1]);
          const block = await activeProvider.getBlock(log.blockNumber);
          const timestamp = block?.timestamp || Math.floor(Date.now() / 1000);

          events.push({
            id: `${log.transactionHash}-${log.index}`,
            eventName: "RainfallReportAccepted",
            eventType: "REPORT",
            policyId,
            owner: normalizedOwner,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            timestamp,
            summary: `Weather oracle report accepted: ${formatRainfall(rainfallMm)} for Policy #${policyId}`,
            details: { rainfallMm },
            isMock: false,
          });
        }
      }
    }

    // Sort by timestamp descending
    return events.sort((a, b) => b.timestamp - a.timestamp);
  } catch (err) {
    console.error("Failed to query contract event logs:", err);
    throw new Error("Failed to load on-chain event history from Ethereum node.");
  }
}
