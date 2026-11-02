/**
 * catalogueReader.ts
 *
 * Reads policy catalogue options directly from the smart contract or mock adapter.
 *
 * Requirements:
 * - M3-C01: Read the catalogue from the contract (optionCount plus getOption).
 * - Synchronized with Person 1's CropInsurance.sol:
 *   getOption returns (uint256 thresholdMm, uint64 duration, uint256 payoutAmount).
 * - Converts payoutAmount from Wei using ethers formatUnits with 18 decimals.
 * - Derives risk label dynamically according to RPD catalogue specification:
 *   0 = Demo, 1–4 = Severe, 5–8 = Moderate, 9–12 = Mild.
 * - M3-C04: Mark Option 0 as the Demo option (2 hours).
 * - Transparent fallback to mock adapter when NEXT_PUBLIC_MOCK_MODE=true or
 *   when contract address is not configured.
 */

import { BrowserProvider, Contract, formatUnits, JsonRpcProvider, Provider } from "ethers";
import { INSURANCE_ABI } from "./abi";
import { CatalogueOption } from "../mock/mockCatalogue";
import { mockGetCatalogue } from "../mock/mockAdapter";
import { CONTRACT_ADDRESS, MOCK_MODE, RPC_URL, RTT_DECIMALS } from "../utils/constants";
import { formatDuration } from "../utils/formatters";

/**
 * Derives the risk label based on option ID according to RPD catalogue specification:
 * - Option 0: Demo (2 hours)
 * - Options 1–4: Severe (30, 60, 90, 120 days)
 * - Options 5–8: Moderate (30, 60, 90, 120 days)
 * - Options 9–12: Mild (30, 60, 90, 120 days)
 */
export function deriveRiskLabel(optionId: number): "Demo" | "Severe" | "Moderate" | "Mild" {
  if (optionId === 0) return "Demo";
  if (optionId >= 1 && optionId <= 4) return "Severe";
  if (optionId >= 5 && optionId <= 8) return "Moderate";
  return "Mild";
}

/**
 * Fetch all available catalogue options.
 */
export async function readCatalogue(provider?: Provider): Promise<CatalogueOption[]> {
  // 1. Mock mode or missing contract address
  if (MOCK_MODE || !CONTRACT_ADDRESS) {
    return mockGetCatalogue();
  }

  // 2. Real contract read
  const activeProvider =
    provider ??
    (typeof window !== "undefined" && window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider(RPC_URL));

  const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, activeProvider);
  const countBigInt: bigint = await contract.optionCount();
  const count = Number(countBigInt);

  const options: CatalogueOption[] = [];

  for (let i = 0; i < count; i++) {
    const rawOption = await contract.getOption(i);
    // Person 1 CropInsurance.sol returns PolicyOption struct:
    // tuple(uint256 thresholdMm, uint64 duration, uint256 payoutAmount)
    const triggerMm = Number(rawOption[0]);
    const durationSeconds = Number(rawOption[1]);
    const payoutAmountWei = BigInt(rawOption[2]);
    const payoutRtt = Number(formatUnits(payoutAmountWei, RTT_DECIMALS));
    const riskLabel = deriveRiskLabel(i);

    options.push({
      optionId: i,
      riskLabel,
      durationSeconds,
      durationLabel: formatDuration(durationSeconds),
      triggerMm,
      payoutRtt,
      isDemo: i === 0,
    });
  }

  return options;
}
