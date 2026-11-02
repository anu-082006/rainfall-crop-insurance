/**
 * contractHelpers.ts
 *
 * Primary application interface for all Ethereum smart contract interactions.
 * Synchronized with Person 1's CropInsurance.sol & TestToken.sol.
 *
 * Key updates:
 * - enroll: enroll(optionId, latitudeE6, longitudeE6, startTime) with int32/uint64 conversions.
 * - getPolicy: Parses 11-field Solidity struct:
 *   [owner, optionId, latitudeE6, longitudeE6, startTime, endTime, thresholdMm, payoutAmount, reported, rainfallMm, claimed]
 * - Uses contract.isEligible(policyId) for authoritative eligibility verification.
 * - Parses actual PolicyCreated event from transaction receipt.
 * - Isolates all Ethers.js v6 calls so that mock fallback (MOCK_MODE=true) remains 100% operational.
 */

import {
  BrowserProvider,
  Contract,
  ContractTransactionResponse,
  formatUnits,
  JsonRpcProvider,
  JsonRpcSigner,
  Provider,
} from "ethers";
import { INSURANCE_ABI, RTT_TOKEN_ABI } from "./abi";
import { readCatalogue } from "./catalogueReader";
import { mapContractError, MappedError } from "./errorMapper";
import { CatalogueOption } from "../mock/mockCatalogue";
import {
  mockClaim,
  mockEnroll,
  mockGetPoliciesForOwner,
  mockGetPolicy,
  MockTxResult,
} from "../mock/mockAdapter";
import { OnChainPolicy } from "../mock/mockPolicies";
import { CONTRACT_ADDRESS, MOCK_MODE, RPC_URL, RTT_DECIMALS, TOKEN_ADDRESS } from "../utils/constants";

export interface TxExecutionResult {
  transactionHash: string;
  blockNumber: number;
  policyId?: number;
  error?: MappedError;
}

/**
 * Reads all catalogue options.
 */
export async function getCatalogue(provider?: Provider): Promise<CatalogueOption[]> {
  return readCatalogue(provider);
}

/**
 * Reads all policies owned by a wallet address.
 */
export async function getPoliciesForOwner(
  owner: string,
  provider?: Provider,
): Promise<OnChainPolicy[]> {
  if (MOCK_MODE || !CONTRACT_ADDRESS) {
    return mockGetPoliciesForOwner(owner);
  }

  const activeProvider =
    provider ??
    (typeof window !== "undefined" && window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider(RPC_URL));

  try {
    const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, activeProvider);
    const nextIdBig: bigint = await contract.nextPolicyId();
    const count = Number(nextIdBig);
    const results: OnChainPolicy[] = [];

    // Query each policy and filter by owner
    for (let id = 1; id <= count; id++) {
      try {
        const raw = await contract.getPolicy(id);
        const policyOwner = (raw[0] as string).toLowerCase();
        if (policyOwner === owner.toLowerCase()) {
          // Check authoritative on-chain eligibility
          let eligible = false;
          try {
            eligible = await contract.isEligible(id);
          } catch {
            // Fallback: reported && !claimed && rainfallMm < thresholdMm
            eligible = Boolean(raw[8]) && !Boolean(raw[10]) && Number(raw[9]) < Number(raw[6]);
          }

          results.push({
            policyId: id,
            owner: policyOwner,
            optionId: Number(raw[1]),
            latitudeE6: Number(raw[2]),
            longitudeE6: Number(raw[3]),
            startTime: Number(raw[4]),
            endTime: Number(raw[5]),
            thresholdMm: Number(raw[6]),
            payoutAmount: BigInt(raw[7]),
            reportReceived: Boolean(raw[8]), // mapped from raw[8] (reported)
            rainfallMm: Number(raw[9]),
            eligible,
            claimed: Boolean(raw[10]),
          });
        }
      } catch {
        // Skip non-existent / deleted IDs
      }
    }
    return results;
  } catch (err) {
    throw mapContractError(err);
  }
}

/**
 * Reads a single policy by ID.
 */
export async function getPolicy(
  policyId: number,
  owner: string,
  provider?: Provider,
): Promise<OnChainPolicy | null> {
  if (MOCK_MODE || !CONTRACT_ADDRESS) {
    return mockGetPolicy(policyId, owner);
  }

  const activeProvider =
    provider ??
    (typeof window !== "undefined" && window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider(RPC_URL));

  try {
    const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, activeProvider);
    const raw = await contract.getPolicy(policyId);

    // Check authoritative on-chain eligibility
    let eligible = false;
    try {
      eligible = await contract.isEligible(policyId);
    } catch {
      eligible = Boolean(raw[8]) && !Boolean(raw[10]) && Number(raw[9]) < Number(raw[6]);
    }

    return {
      policyId,
      owner: (raw[0] as string).toLowerCase(),
      optionId: Number(raw[1]),
      latitudeE6: Number(raw[2]),
      longitudeE6: Number(raw[3]),
      startTime: Number(raw[4]),
      endTime: Number(raw[5]),
      thresholdMm: Number(raw[6]),
      payoutAmount: BigInt(raw[7]),
      reportReceived: Boolean(raw[8]), // mapped from raw[8] (reported)
      rainfallMm: Number(raw[9]),
      eligible,
      claimed: Boolean(raw[10]),
    };
  } catch (err) {
    throw mapContractError(err);
  }
}

/**
 * Submits an enrollment transaction.
 *
 * Synchronized with Person 1's CropInsurance.sol:
 * enroll(uint256 optionId, int32 latitudeE6, int32 longitudeE6, uint64 startTime)
 */
export async function enrollPolicy(
  optionId: number,
  startTime: number,
  latitudeE6: number,
  longitudeE6: number,
  signer?: JsonRpcSigner | null,
  callerAddress?: string,
): Promise<TxExecutionResult> {
  const address = signer
    ? await signer.getAddress()
    : callerAddress || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  if (MOCK_MODE || !CONTRACT_ADDRESS) {
    const { tx, policyId } = await mockEnroll(
      optionId,
      startTime,
      latitudeE6,
      longitudeE6,
      address,
    );
    return {
      transactionHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      policyId,
    };
  }

  if (!signer) {
    throw new Error("MetaMask signer required to submit transaction to the smart contract.");
  }

  try {
    const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, signer);
    // Person 1 signature: enroll(optionId, latitudeE6, longitudeE6, startTime)
    const tx: ContractTransactionResponse = await contract.enroll(
      BigInt(optionId),
      Math.trunc(latitudeE6),
      Math.trunc(longitudeE6),
      BigInt(startTime),
    );

    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction dropped or unconfirmed.");
    }

    // Parse PolicyCreated event to extract assigned policyId
    let policyId: number | undefined;
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        if (parsed && (parsed.name === "PolicyCreated" || parsed.name === "PolicyEnrolled")) {
          policyId = Number(parsed.args[0]);
          break;
        }
      } catch {
        // Not a match for this contract interface
      }
    }

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      policyId,
    };
  } catch (err) {
    throw mapContractError(err);
  }
}

/**
 * Submits a claim transaction for an eligible policy.
 */
export async function claimPolicy(
  policyId: number,
  signer?: JsonRpcSigner | null,
  callerAddress?: string,
): Promise<TxExecutionResult> {
  const address = signer
    ? await signer.getAddress()
    : callerAddress || "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

  if (MOCK_MODE || !CONTRACT_ADDRESS) {
    const tx: MockTxResult = await mockClaim(policyId, address);
    return {
      transactionHash: tx.transactionHash,
      blockNumber: tx.blockNumber,
      policyId,
    };
  }

  if (!signer) {
    throw new Error("MetaMask signer required to submit transaction to the smart contract.");
  }

  try {
    const contract = new Contract(CONTRACT_ADDRESS, INSURANCE_ABI, signer);
    const tx: ContractTransactionResponse = await contract.claim(BigInt(policyId));
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Claim transaction dropped or unconfirmed.");
    }
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      policyId,
    };
  } catch (err) {
    throw mapContractError(err);
  }
}

/**
 * Reads RTT balance for an owner address.
 */
export async function getRttTokenBalance(
  ownerAddress: string,
  provider?: Provider,
  tokenAddress?: string,
): Promise<string> {
  const addr = tokenAddress || TOKEN_ADDRESS;
  if (!addr && MOCK_MODE) {
    return "1000.0";
  }
  if (!addr) {
    return "0.0";
  }
  const activeProvider =
    provider ??
    (typeof window !== "undefined" && window.ethereum
      ? new BrowserProvider(window.ethereum)
      : new JsonRpcProvider(RPC_URL));
  try {
    const tokenContract = new Contract(addr, RTT_TOKEN_ABI, activeProvider);
    const raw: bigint = await tokenContract.balanceOf(ownerAddress);
    return formatUnits(raw, RTT_DECIMALS);
  } catch {
    return "0.0";
  }
}
