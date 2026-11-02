/**
 * errorMapper.ts
 *
 * Maps smart contract custom errors, EVM reverts, and RPC failures
 * into human-readable user messages according to Section 9, Appendix A.2,
 * and Person 1's actual CropInsurance.sol custom errors.
 *
 * Never exposes raw hex strings, stack traces, or silent failures.
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
  InvalidOption: "This policy option does not exist in the catalogue.",
  InvalidLocation:
    "Invalid farm coordinates. Latitude must be between -90 and +90, longitude between -180 and +180.",
  StartNotInFuture: "Start time must be strictly in the future. Please select a future date and time.",
  StartNotOnFullHour:
    "Start time must be aligned to a full UTC hour (India standard time: :30).",
  PolicyNotFound: "The specified policy was not found on-chain.",
  NotReportReceiver: "Unauthorized caller: only the designated report receiver contract can record rainfall.",
  PeriodMismatch: "Report coverage period does not match the policy start and end times.",
  ObservationNotEnded:
    "The coverage observation window has not ended yet. Oracle reports can only be recorded after coverage completion.",
  ReportAlreadyAccepted: "A final rainfall report has already been accepted for this policy.",
  NotPolicyOwner: "You are not the owner of this policy and cannot claim its payout.",
  NoReport: "Rainfall report has not been submitted or accepted for this policy yet.",
  AlreadyClaimed: "This policy has already been paid. Duplicate claims are not permitted.",
  NotEligible:
    "This policy is not eligible for payout because observed rainfall was not below the trigger threshold.",
  InsufficientPayoutBalance:
    "The insurance payout pool is currently unfunded and cannot cover this payout. Please contact the test administrator.",

  // Legacy aliases for backward compatibility with existing tests and mocks
  StartTimeInPast: "Start time cannot be in the past. Please select a future date.",
  InvalidStartAlignment:
    "Invalid start time alignment. Demo option (Option 0) requires a full-hour start; longer options require whole-day starts.",
  ReportNotAccepted: "Rainfall report has not been accepted and verified by the oracle yet.",
  ReportTooEarly: "Rainfall report cannot be submitted before the coverage window ends.",
};

export interface MappedError {
  title: string;
  message: string;
  isUserRejection: boolean;
  rawCode?: string | number;
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

  // 1. User rejection in MetaMask (code 4001 or ACTION_REJECTED)
  if (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "name" in error)
  ) {
    const code = (error as { code?: unknown }).code;
    const message = (error as { message?: string }).message || "";

    if (code === 4001 || code === "ACTION_REJECTED" || message.includes("user rejected action")) {
      return {
        title: "Transaction Cancelled",
        message: "You rejected the transaction in MetaMask.",
        isUserRejection: true,
        rawCode: typeof code === "number" || typeof code === "string" ? code : undefined,
      };
    }
  }

  // 2. Try parsing error data via Ethers Interface (for 4-byte selector matches)
  if (typeof error === "object" && error !== null) {
    const errObj = error as Record<string, unknown>;
    const errorData =
      (typeof errObj.data === "string" ? errObj.data : null) ||
      (typeof (errObj.error as Record<string, unknown>)?.data === "string"
        ? ((errObj.error as Record<string, unknown>).data as string)
        : null);

    if (errorData && errorData.startsWith("0x") && errorData.length >= 10) {
      try {
        const iface = new Interface(INSURANCE_ABI);
        const parsed = iface.parseError(errorData);
        if (parsed && parsed.name && parsed.name in CUSTOM_ERROR_MESSAGES) {
          return {
            title: "Transaction Reverted",
            message: CUSTOM_ERROR_MESSAGES[parsed.name as ContractCustomError],
            isUserRejection: false,
          };
        }
      } catch {
        // Fall through to string matching
      }
    }
  }

  const errString = String(error);

  // 3. Check for custom error names in error message or error.data / error.reason
  for (const customError of Object.keys(CUSTOM_ERROR_MESSAGES) as ContractCustomError[]) {
    if (
      errString.includes(customError) ||
      (typeof error === "object" &&
        error !== null &&
        "reason" in error &&
        String((error as { reason?: unknown }).reason).includes(customError))
    ) {
      return {
        title: "Transaction Reverted",
        message: CUSTOM_ERROR_MESSAGES[customError],
        isUserRejection: false,
      };
    }
  }

  // 4. Common RPC / Network issues
  if (
    errString.includes("network error") ||
    errString.includes("could not detect network") ||
    errString.includes("ECONNREFUSED") ||
    errString.includes("Failed to fetch")
  ) {
    return {
      title: "Network Connection Error",
      message:
        "Unable to connect to the blockchain node (Anvil). Ensure your local chain is running at http://127.0.0.1:8545.",
      isUserRejection: false,
    };
  }

  if (errString.includes("insufficient funds") || errString.includes("exceeds balance")) {
    return {
      title: "Insufficient Gas Funds",
      message:
        "Your wallet has insufficient ETH to pay for transaction gas fees on this network.",
      isUserRejection: false,
    };
  }

  // 5. Fallback message extraction
  const fallbackMessage =
    typeof error === "object" && error !== null && "shortMessage" in error
      ? String((error as { shortMessage: unknown }).shortMessage)
      : error instanceof Error
      ? error.message
      : errString;

  return {
    title: "Transaction Failed",
    message: fallbackMessage.slice(0, 200),
    isUserRejection: false,
  };
}
