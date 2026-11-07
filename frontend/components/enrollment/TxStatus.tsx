"use client";

/**
 * TxStatus.tsx
 *
 * Visual indicator for blockchain transaction lifecycle (M3-E04, M3-E05):
 * - submitting: awaiting MetaMask user signature
 * - pending: transaction broadcast, awaiting block confirmation, displays txHash
 * - confirmed: success receipt, block number, extracted policyId with direct link to /policies/[id]
 * - failed: user-friendly mapped error notice with retry option
 *
 * Upgraded to InsurTech dark theme with glowing state indicators and Geist typography.
 */

import React from "react";
import Link from "next/link";
import { shortenTxHash } from "@/lib/utils/formatters";
import { MappedError } from "@/lib/contract/errorMapper";
import { ROUTES } from "@/lib/utils/constants";

export type TxStep = "idle" | "submitting" | "pending" | "confirmed" | "failed";

export interface TxDetails {
  step: TxStep;
  txHash?: string;
  blockNumber?: number;
  policyId?: number;
  error?: MappedError;
}

interface TxStatusProps {
  tx: TxDetails;
  onReset?: () => void;
}

export default function TxStatus({ tx, onReset }: TxStatusProps) {
  if (tx.step === "idle") return null;

  return (
    <div className="mt-6 floating-panel p-6 shadow-xl transition-all">
      {/* 1. Submitting: Awaiting signature */}
      {tx.step === "submitting" && (
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 shadow-sm">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-20"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Requesting Signature
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Please confirm the enrollment transaction in your MetaMask wallet popup...
            </p>
          </div>
        </div>
      )}

      {/* 2. Pending: Broadcasted, waiting for block */}
      {tx.step === "pending" && (
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-20"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Transaction Pending Confirmation
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Your transaction has been submitted to the blockchain. Awaiting block inclusion...
            </p>
            {tx.txHash && (
              <p className="mt-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                Tx Hash:{" "}
                <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-lg">
                  {shortenTxHash(tx.txHash)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. Confirmed: Success receipt + Extracted Policy ID (M3-E05) */}
      {tx.step === "confirmed" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center text-[#1a5b55] dark:text-[#4ea399] flex-shrink-0 mt-0.5">
              <svg
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Policy Enrolled Successfully!
              </h3>
              <p className="mt-1 text-xs text-[#1a5b55] dark:text-[#4ea399] font-semibold">
                The smart contract has confirmed your policy enrollment.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl bg-slate-50 dark:bg-[#0D1218] p-4 text-xs text-slate-700 dark:text-slate-300 sm:grid-cols-2 shadow-inner">
                {tx.policyId !== undefined && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Policy ID:</span>{" "}
                    <span className="font-mono font-black text-base text-[#1a5b55] dark:text-[#4ea399] ml-1">
                      #{tx.policyId}
                    </span>
                  </div>
                )}
                {tx.blockNumber !== undefined && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Block Number:</span>{" "}
                    <span className="font-mono font-semibold text-slate-900 dark:text-white ml-1">#{tx.blockNumber}</span>
                  </div>
                )}
                {tx.txHash && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 dark:text-slate-400">Transaction:</span>{" "}
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all ml-1">
                      {tx.txHash}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Direct Post-Enrollment Action Links (M3-E05) */}
          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            {tx.policyId !== undefined && (
              <Link
                href={ROUTES.POLICY(tx.policyId)}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#1a5b55] hover:bg-[#22726b] px-5 py-3 text-xs font-bold text-white shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                View Policy #{tx.policyId} Details &rarr;
              </Link>
            )}
            <Link
              href={ROUTES.DASHBOARD}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 px-5 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Enroll Another
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Failed: Mapped Error Display */}
      {tx.step === "failed" && tx.error && (
        <div className="space-y-3">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${
                tx.error.isUserRejection
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
              }`}
            >
              {tx.error.isUserRejection ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3
                className={`text-sm font-bold ${
                  tx.error.isUserRejection ? "text-slate-700 dark:text-slate-200" : "text-rose-700 dark:text-rose-300"
                }`}
              >
                {tx.error.title}
              </h3>
              <p
                className={`mt-1 text-xs ${
                  tx.error.isUserRejection ? "text-slate-500 dark:text-slate-400" : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {tx.error.message}
              </p>
            </div>
          </div>

          {onReset && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onReset}
                className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Dismiss &amp; Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
