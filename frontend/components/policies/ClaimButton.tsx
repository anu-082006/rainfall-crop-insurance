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
 *
 * Upgraded to InsurTech dark theme with glowing receipt aura and Geist typography.
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
        <div className="rounded-2xl bg-[#1a5b55]/15 p-6 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center text-[#1a5b55] dark:text-[#4ea399] flex-shrink-0 mt-0.5">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#1a5b55] dark:text-[#4ea399]">
                Claim Confirmation (Screen 7)
              </span>
              <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Payout Transferred Successfully!
              </h4>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                The smart contract has verified your claim and transferred{" "}
                <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono">{payoutFormatted}</span> to your wallet.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2 rounded-2xl bg-white dark:bg-[#070A0F] p-4 text-xs text-slate-700 dark:text-slate-300 sm:grid-cols-2 shadow-inner">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Payout Received:</span>{" "}
                  <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 ml-1">{payoutFormatted}</span>
                </div>
                {blockNumber !== null && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Block Number:</span>{" "}
                    <span className="font-mono font-semibold text-slate-900 dark:text-white ml-1">#{blockNumber}</span>
                  </div>
                )}
                {txHash && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400">Transaction Hash:</span>{" "}
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all ml-1">{txHash}</span>
                  </div>
                )}
              </div>

              <p className="mt-3 text-[11px] text-[#1a5b55] dark:text-[#4ea399]">
                * Policy status is now updated to <strong>Claimed</strong>. Only one claim is permitted per policy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Submitting / Pending Spinner ───────────────────────── */}
      {(step === "submitting" || step === "pending") && (
        <div className="flex items-center gap-3 rounded-2xl bg-cyan-500/15 p-4 shadow-md">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent flex-shrink-0" />
          <div className="text-xs">
            <p className="font-extrabold text-slate-900 dark:text-white">
              {step === "submitting"
                ? "Requesting Signature in MetaMask..."
                : "Claim Transaction Pending on Blockchain..."}
            </p>
            <p className="text-cyan-700 dark:text-cyan-300 mt-0.5">
              {step === "submitting"
                ? "Please confirm the transaction in your wallet popup."
                : "Awaiting block confirmation..."}
            </p>
          </div>
        </div>
      )}

      {/* ── Transaction Failure / Mapped Error (M3-R06) ────────────────────── */}
      {step === "failed" && error && (
        <div className="rounded-2xl bg-rose-500/15 p-4 shadow-md">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h5 className="text-xs font-bold text-rose-700 dark:text-rose-300">{error.title}</h5>
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error.message}</p>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setStep("idle")}
              className="rounded-xl bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 transition-colors cursor-pointer"
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
            className={`w-full rounded-2xl py-4 text-sm font-black uppercase tracking-wider transition-all focus:outline-none ${
              canClaim && step !== "submitting" && step !== "pending"
                ? "bg-[#1a5b55] hover:bg-[#22726b] text-white shadow-md hover:shadow-lg cursor-pointer active:scale-[0.99]"
                : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 shadow-none cursor-not-allowed"
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
            <p className="mt-2.5 text-center text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Claim Disabled:</span> {disabledReason}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
