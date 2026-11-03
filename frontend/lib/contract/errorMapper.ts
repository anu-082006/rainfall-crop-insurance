/**
 * errorMapper.ts
 *
 * Maps smart contract custom errors, EVM reverts, and RPC failures
 * into human-readable user messages according to Section 9, Appendix A.2,
 * and Person 1's actual CropInsurance.sol custom errors.
 *
 * Never exposes raw hex strings, stack traces, private keys, or [object Object].
 */

import { Interface } from "ethers";
import { INSURANCE_ABI, type ContractCustomError } from "./abi.ts";

/**
 * Mapping of Solidity custom errors from CropInsurance.sol to plain-language explanations.
 */
const CUSTOM_ERROR_MESSAGES: Record<ContractCustomError, string> = {
  // Person 1 actual CropInsurance.sol custom errors
  ZeroAddress: "Zero address provided where a valid contract address is required.",
  EmptyCatalogue: "Contract was initialized with an empty catalogue.",
  InvalidOptionTerms: "The selected policy option has invalid terms.",
  InvalidOption: "Invalid start time for this coverage option. This policy option does not exist in the catalogue.",
  InvalidLocation:
    "Invalid farm coordinates. Latitude must be between -90 and +90, longitude between -180 and +180.",
  StartNotInFuture:
    "Coverage start time must be strictly in the future. Please select a future date and time.",
  StartNotOnFullHour:
    "Invalid start time for this coverage option. Start time must be aligned to a full UTC hour (e.g. 14:00:00 UTC).",
  PolicyNotFound: "The specified policy was not found on-chain.",
  NotReportReceiver: "Unauthorized caller: only the designated report receiver contract can record rainfall.",
  PeriodMismatch: "Report coverage period does not match the policy start and end times.",
  ObservationNotEnded:
    "The coverage observation window has not ended yet. Oracle reports can only be recorded after coverage completion.",
  ReportAlreadyAccepted: "A final rainfall report has already been accepted for this policy.",
  NotPolicyOwner: "You are not the owner of this policy and cannot claim its payout.",
  NoReport: "Rainfall report has not been submitted or accepted for this policy yet.",
  AlreadyClaimed: "This policy has already been paid and claimed. Duplicate claims are not permitted.",
  NotEligible:
    "This policy is not eligible for payout because observed rainfall was not below the trigger threshold.",
  InsufficientPayoutBalance:
    "The insurance payout pool is currently unfunded with insufficient token balance. Please contact the test administrator.",

  // Legacy aliases for backward compatibility with existing tests and mocks
  StartTimeInPast: "Start time cannot be in the past. Coverage start time must be in the future.",
  InvalidStartAlignment:
    "Invalid start time for this coverage option. Demo option (Option 0) requires a full-hour start; longer options require whole-day starts.",
  ReportNotAccepted: "Rainfall report has not been accepted and verified by the oracle yet.",
  ReportTooEarly: "Rainfall report cannot be submitted before the coverage window ends.",
};

/**
 * 4-byte function selectors for CropInsurance.sol custom errors
 */
const SELECTOR_ERROR_NAMES: Record<string, ContractCustomError> = {
  "0xe8d4723a": "StartNotInFuture",
  "0x9895f5a1": "StartNotOnFullHour",
  "0x24eb6489": "InvalidOption",
  "0xf80f1445": "InvalidLocation",
  "0xb3167bfa": "AlreadyClaimed",
  "0x06e0e4ce": "ObservationNotEnded",
  "0x84825a89": "ReportAlreadyAccepted",
  "0x3514e575": "NotEligible",
  "0xc2f3d7b9": "NoReport",
  "0x1cb538c7": "PeriodMismatch",
  "0x4cc64fad": "InsufficientPayoutBalance",
  "0xd92e233d": "ZeroAddress",
  "0xfde735ab": "EmptyCatalogue",
  "0x21df5fa5": "PolicyNotFound",
  "0x2285156d": "NotReportReceiver",
  "0x118cdaa7": "NotPolicyOwner",
};

export interface MappedError {
  title: string;
  message: string;
  isUserRejection: boolean;
  rawCode?: string | number;
}

/**
 * Strips any potential sensitive info (like raw 32-byte private keys or long hex dumps).
 */
function sanitizeErrorMessage(msg: string): string {
  if (!msg || typeof msg !== "string") return "";
  // Strip any 64+ char hex sequences (potential private keys or raw calldata)
  return msg.replace(/0x[a-fA-F0-9]{64,}/g, "[redacted]");
}

/**
 * Inspects any caught error object (from Ethers.js, MetaMask, or RPC)
 * and produces a user-ready display object.
 */
export function mapContractError(error: unknown): MappedError {
  if (!error) {
    return {
      title: "Unknown Error",
      message: "An unexpected error occurred. Please try again.",
      isUserRejection: false,
    };
  }

  // 0. If already a MappedError, return immediately (prevents [object Object] from double-wrapping)
  if (
    typeof error === "object" &&
    error !== null &&
    "title" in error &&
    "message" in error &&
    typeof (error as Record<string, unknown>).title === "string" &&
    typeof (error as Record<string, unknown>).message === "string"
  ) {
    const existing = error as MappedError;
    if (existing.message && existing.message !== "[object Object]" && existing.message.trim() !== "{}") {
      return existing;
    }
  }

  const errRecord = typeof error === "object" && error !== null ? (error as Record<string, unknown>) : null;

  const infoObj = errRecord && typeof errRecord.info === "object" && errRecord.info !== null
    ? (errRecord.info as Record<string, unknown>)
    : null;
  const innerInfoError = infoObj && typeof infoObj.error === "object" && infoObj.error !== null
    ? (infoObj.error as Record<string, unknown>)
    : null;
  const nestedErr = errRecord && typeof errRecord.error === "object" && errRecord.error !== null
    ? (errRecord.error as Record<string, unknown>)
    : null;
  const causeObj = errRecord && typeof errRecord.cause === "object" && errRecord.cause !== null
    ? (errRecord.cause as Record<string, unknown>)
    : null;
  const revertObj = errRecord && typeof errRecord.revert === "object" && errRecord.revert !== null
    ? (errRecord.revert as Record<string, unknown>)
    : null;

  // 1. User rejection in MetaMask (code 4001, ACTION_REJECTED, or message string)
  const code =
    errRecord?.code ??
    innerInfoError?.code ??
    nestedErr?.code;

  const rawMessage = String(errRecord?.message || "");
  const rawShortMessage = String(errRecord?.shortMessage || "");
  const rawReason = String(errRecord?.reason || "");
  const rawErrorName = String(
    errRecord?.errorName ||
    revertObj?.name ||
    ""
  );

  if (
    code === 4001 ||
    code === "ACTION_REJECTED" ||
    rawMessage.toLowerCase().includes("user rejected") ||
    rawShortMessage.toLowerCase().includes("user rejected") ||
    rawMessage.toLowerCase().includes("rejected in metamask")
  ) {
    return {
      title: "Transaction Cancelled",
      message: "Transaction was rejected in MetaMask.",
      isUserRejection: true,
      rawCode: typeof code === "number" || typeof code === "string" ? code : undefined,
    };
  }

  // 2. Direct custom error name check (Ethers v6 revert.name or errorName)
  if (rawErrorName && rawErrorName in CUSTOM_ERROR_MESSAGES) {
    return {
      title: "Transaction Reverted",
      message: CUSTOM_ERROR_MESSAGES[rawErrorName as ContractCustomError],
      isUserRejection: false,
    };
  }

  // 3. Extract raw error data hex across all nested locations (Ethers v6, MetaMask, RPC)
  const rawData: string | null =
    (typeof errRecord?.data === "string" ? errRecord.data : null) ||
    (typeof nestedErr?.data === "string" ? (nestedErr.data as string) : null) ||
    (typeof innerInfoError?.data === "string" ? (innerInfoError.data as string) : null) ||
    (typeof causeObj?.data === "string" ? (causeObj.data as string) : null);

  if (rawData && typeof rawData === "string" && rawData.startsWith("0x") && rawData.length >= 10) {
    const selector = rawData.slice(0, 10).toLowerCase();
    if (selector in SELECTOR_ERROR_NAMES) {
      const errName = SELECTOR_ERROR_NAMES[selector];
      return {
        title: "Transaction Reverted",
        message: CUSTOM_ERROR_MESSAGES[errName],
        isUserRejection: false,
      };
    }

    try {
      const iface = new Interface(INSURANCE_ABI);
      const parsed = iface.parseError(rawData);
      if (parsed && parsed.name && parsed.name in CUSTOM_ERROR_MESSAGES) {
        return {
          title: "Transaction Reverted",
          message: CUSTOM_ERROR_MESSAGES[parsed.name as ContractCustomError],
          isUserRejection: false,
        };
      }
    } catch {
      // Fall through to text matching
    }
  }

  // 4. Match custom error names in full combined string
  const combinedText = `${rawMessage} ${rawShortMessage} ${rawReason} ${String(error)}`;
  for (const [customErr, expl] of Object.entries(CUSTOM_ERROR_MESSAGES)) {
    if (combinedText.includes(customErr)) {
      return {
        title: "Transaction Reverted",
        message: expl,
        isUserRejection: false,
      };
    }
  }

  // 5. Match 4-byte selectors in combined text
  for (const [sel, errName] of Object.entries(SELECTOR_ERROR_NAMES)) {
    if (combinedText.toLowerCase().includes(sel)) {
      return {
        title: "Transaction Reverted",
        message: CUSTOM_ERROR_MESSAGES[errName],
        isUserRejection: false,
      };
    }
  }

  // 6. Insufficient funds / token balance
  if (
    combinedText.toLowerCase().includes("insufficient funds") ||
    combinedText.toLowerCase().includes("exceeds balance") ||
    combinedText.toLowerCase().includes("insufficient token balance")
  ) {
    return {
      title: "Insufficient Balance",
      message: "Insufficient token balance.",
      isUserRejection: false,
    };
  }

  // 7. Network / RPC connection error
  if (
    combinedText.includes("network error") ||
    combinedText.includes("could not detect network") ||
    combinedText.includes("ECONNREFUSED") ||
    combinedText.includes("Failed to fetch")
  ) {
    return {
      title: "Network Connection Error",
      message:
        "Unable to connect to the blockchain node (Anvil). Ensure your local chain is running at http://127.0.0.1:8545.",
      isUserRejection: false,
    };
  }

  // 8. General EVM execution revert
  if (
    combinedText.toLowerCase().includes("execution reverted") ||
    combinedText.toLowerCase().includes("call_exception") ||
    combinedText.toLowerCase().includes("transaction reverted")
  ) {
    return {
      title: "Transaction Reverted",
      message: "Transaction reverted by the contract.",
      isUserRejection: false,
    };
  }

  // 9. Safe fallback message (guaranteed never [object Object])
  let fallbackMessage = rawShortMessage || (error instanceof Error ? error.message : "");
  if (
    !fallbackMessage ||
    fallbackMessage === "[object Object]" ||
    fallbackMessage.trim() === "{}" ||
    fallbackMessage.trim() === ""
  ) {
    fallbackMessage = "Transaction reverted by the contract.";
  }

  fallbackMessage = sanitizeErrorMessage(fallbackMessage);

  return {
    title: "Transaction Failed",
    message: fallbackMessage.slice(0, 200),
    isUserRejection: false,
  };
}
