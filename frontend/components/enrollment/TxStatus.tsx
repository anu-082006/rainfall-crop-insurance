"use client";

/**
 * TxStatus.tsx
 *
 * Visual indicator for blockchain transaction lifecycle (M3-E04, M3-E05):
 * - submitting: awaiting MetaMask user signature
 * - pending: transaction broadcast, awaiting block confirmation, displays txHash
 * - confirmed: success receipt, block number, extracted policyId with direct link to /policies/[id]
 * - failed: user-friendly mapped error notice with retry option
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
    <div className="mt-6 rounded-xl border p-5 transition">
      {/* 1. Submitting: Awaiting signature */}
      {tx.step === "submitting" && (
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Requesting Signature
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              Please confirm the enrollment transaction in your MetaMask wallet popup...
            </p>
          </div>
        </div>
      )}

      {/* 2. Pending: Broadcasted, waiting for block */}
      {tx.step === "pending" && (
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg
              className="h-5 w-5 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Transaction Pending Confirmation
            </h3>
            <p className="mt-1 text-xs text-gray-600">
              Your transaction has been submitted to the blockchain. Awaiting block inclusion...
            </p>
            {tx.txHash && (
              <p className="mt-2 font-mono text-xs text-gray-500">
                Tx Hash: <span className="font-semibold text-gray-700">{shortenTxHash(tx.txHash)}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* 3. Confirmed: Success receipt + Extracted Policy ID (M3-E05) */}
      {tx.step === "confirmed" && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-900">
                Policy Enrolled Successfully!
              </h3>
              <p className="mt-1 text-xs text-emerald-800">
                The smart contract has confirmed your policy enrollment.
              </p>

              <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-emerald-50/60 p-3 text-xs text-emerald-950 sm:grid-cols-2">
                {tx.policyId !== undefined && (
                  <div>
                    <span className="text-emerald-700">Policy ID:</span>{" "}
                    <span className="font-mono font-bold text-base text-emerald-900">
                      #{tx.policyId}
                    </span>
                  </div>
                )}
                {tx.blockNumber !== undefined && (
                  <div>
                    <span className="text-emerald-700">Block Number:</span>{" "}
                    <span className="font-mono font-semibold">{tx.blockNumber}</span>
                  </div>
                )}
                {tx.txHash && (
                  <div className="sm:col-span-2">
                    <span className="text-emerald-700">Transaction:</span>{" "}
                    <span className="font-mono text-[11px] text-gray-700 break-all">
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
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                View Policy #{tx.policyId} Details &rarr;
              </Link>
            )}
            <Link
              href={ROUTES.DASHBOARD}
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Go to Dashboard
            </Link>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 focus:outline-none"
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
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                tx.error.isUserRejection
                  ? "bg-gray-100 text-gray-600"
                  : "bg-red-100 text-red-600"
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
                  tx.error.isUserRejection ? "text-gray-900" : "text-red-900"
                }`}
              >
                {tx.error.title}
              </h3>
              <p
                className={`mt-1 text-xs ${
                  tx.error.isUserRejection ? "text-gray-600" : "text-red-700"
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
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none"
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
