"use client";

/**
 * ClaimButton.tsx
 *
 * Implements policy claim action and transaction lifecycle (M3-R03 to M3-R06, M3-R09):
 * - Enabled ONLY if connected wallet owns policy, report accepted, eligible, and unclaimed (M3-R03)
 * - Clear inline reasons explaining all disabled states (M3-R05)
 * - Submits claim transaction via contractHelpers.claimPolicy (M3-R04)
 * - Error mapping for AlreadyClaimed, InsufficientPayoutBalance, NotPolicyOwner, etc. (M3-R06)
 * - Claim confirmation screen (Screen 7 / M3-R09) with tx hash, RTT received, and token balance refresh
 */

import React, { useState, useMemo } from "react";
import { BrowserProvider, formatUnits, type JsonRpcSigner } from "ethers";
import { OnChainPolicy } from "@/lib/mock/mockPolicies";
import { PolicyStatusResult } from "@/lib/contract/policyStatus";
import { claimPolicy } from "@/lib/contract/contractHelpers";
import { mapContractError, MappedError } from "@/lib/contract/errorMapper";
import { formatRtt } from "@/lib/utils/formatters";
import { RTT_DECIMALS } from "@/lib/utils/constants";

interface ClaimButtonProps {
  policy: OnChainPolicy;
  status: PolicyStatusResult;
  walletAddress: string | null;
  isWrongNetwork: boolean;
  onClaimSuccess: (txHash: string, blockNumber: number) => void;
  refreshBalance: () => Promise<void>;
}

type ClaimTxStep = "idle" | "submitting" | "pending" | "confirmed" | "failed";

export default function ClaimButton({
  policy,
  status,
  walletAddress,
  isWrongNetwork,
  onClaimSuccess,
  refreshBalance,
}: ClaimButtonProps) {
  const [step, setStep] = useState<ClaimTxStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [blockNumber, setBlockNumber] = useState<number | null>(null);
  const [error, setError] = useState<MappedError | null>(null);

  const payoutFormatted = formatRtt(
    formatUnits(policy.payoutAmount, RTT_DECIMALS),
    0
  );

  // Check ownership
  const isOwner = useMemo(() => {
    if (!walletAddress || !policy.owner) return false;
    return walletAddress.toLowerCase() === policy.owner.toLowerCase();
  }, [walletAddress, policy.owner]);

  // Determine claim eligibility & disabled reason (M3-R03, M3-R05)
  const { canClaim, disabledReason } = useMemo(() => {
    if (!walletAddress) {
      return {
        canClaim: false,
        disabledReason: "Connect your MetaMask wallet to claim payout.",
      };
    }
    if (isWrongNetwork) {
      return {
        canClaim: false,
        disabledReason: "Switch to the supported network (Chain ID 31337) to submit a claim.",
      };
    }
    if (!isOwner) {
      return {
        canClaim: false,
        disabledReason: "Connected wallet is not the owner of this policy.",
      };
    }
    if (policy.claimed || status.code === "CLAIMED") {
      return {
        canClaim: false,
        disabledReason: "Payout has already been claimed for this policy.",
      };
    }
    if (!policy.reportReceived) {
      return {
        canClaim: false,
        disabledReason:
          status.code === "SCHEDULED"
            ? "Coverage has not started yet."
            : status.code === "ACTIVE"
            ? "Coverage window is still actively running."
            : "Awaiting verified rainfall report from oracle before claim can be processed.",
      };
    }
    if (!status.canClaim) {
      return {
        canClaim: false,
        disabledReason: status.reasonDisabled || "Policy is not eligible for payout.",
      };
    }

    return { canClaim: true, disabledReason: undefined };
  }, [walletAddress, isWrongNetwork, isOwner, policy.claimed, policy.reportReceived, status]);

  const handleClaim = async () => {
    if (!canClaim || step === "submitting" || step === "pending") return;

    try {
      setStep("submitting");
      setError(null);

      let signer: JsonRpcSigner | null = null;
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          signer = await provider.getSigner();
        } catch {
          // Fall back for mock mode
        }
      }

      const result = await claimPolicy(
        policy.policyId,
        signer,
        walletAddress || undefined
      );

      setTxHash(result.transactionHash);
      setBlockNumber(result.blockNumber);
      setStep("confirmed");

      // Refresh RTT token balance in wallet context (M3-R04)
      await refreshBalance();

      // Trigger parent callback to update policy state
      onClaimSuccess(result.transactionHash, result.blockNumber);
    } catch (err: unknown) {
      console.error("Claim transaction failed:", err);
      const mapped = mapContractError(err);
      setError(mapped);
      setStep("failed");
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Screen 7: Claim Confirmation Receipt (M3-R09) ────────────────────── */}
      {step === "confirmed" && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Claim Confirmation (Screen 7)
              </span>
              <h4 className="text-lg font-bold text-emerald-950">
                Payout Transferred Successfully!
              </h4>
              <p className="mt-1 text-xs text-emerald-800">
                The smart contract has verified your claim and transferred{" "}
                <span className="font-bold text-emerald-950">{payoutFormatted}</span> to your wallet.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2 rounded-lg bg-white/80 p-3.5 text-xs text-emerald-950 sm:grid-cols-2">
                <div>
                  <span className="text-emerald-700">Payout Received:</span>{" "}
                  <span className="font-mono font-bold text-emerald-900">{payoutFormatted}</span>
                </div>
                {blockNumber !== null && (
                  <div>
                    <span className="text-emerald-700">Block Number:</span>{" "}
                    <span className="font-mono font-semibold">{blockNumber}</span>
                  </div>
                )}
                {txHash && (
                  <div className="sm:col-span-2">
                    <span className="text-emerald-700">Transaction Hash:</span>{" "}
                    <span className="font-mono text-[11px] text-gray-700 break-all">{txHash}</span>
                  </div>
                )}
              </div>

              <p className="mt-3 text-[11px] text-emerald-800">
                * Policy status is now updated to <strong>Claimed</strong>. Only one claim is permitted per policy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Submitting / Pending Spinner ───────────────────────── */}
      {(step === "submitting" || step === "pending") && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent flex-shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-blue-900">
              {step === "submitting"
                ? "Requesting Signature in MetaMask..."
                : "Claim Transaction Pending on Blockchain..."}
            </p>
            <p className="text-blue-700 mt-0.5">
              {step === "submitting"
                ? "Please confirm the transaction in your wallet popup."
                : "Awaiting block confirmation..."}
            </p>
          </div>
        </div>
      )}

      {/* ── Transaction Failure / Mapped Error (M3-R06) ────────────────────── */}
      {step === "failed" && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h5 className="text-xs font-bold text-red-900">{error.title}</h5>
              <p className="mt-1 text-xs text-red-700">{error.message}</p>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Main Claim Action Button ────────────────────────────────────────── */}
      {step !== "confirmed" && (
        <div>
          <button
            type="button"
            onClick={handleClaim}
            disabled={!canClaim || step === "submitting" || step === "pending"}
            className={`w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition focus:outline-none focus:ring-2 ${
              canClaim && step !== "submitting" && step !== "pending"
                ? "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400 cursor-pointer"
                : "bg-gray-300 text-gray-500 shadow-none cursor-not-allowed"
            }`}
          >
            {step === "submitting"
              ? "Confirming in Wallet..."
              : step === "pending"
              ? "Claiming Payout..."
              : `Claim Payout (${payoutFormatted})`}
          </button>

          {/* Reason disabled message (M3-R05) */}
          {!canClaim && disabledReason && (
            <p className="mt-2 text-center text-xs text-gray-500">
              <span className="font-semibold text-gray-700">Claim Disabled:</span> {disabledReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
