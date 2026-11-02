/**
 * formatters.ts
 * Display formatting utilities used across the app.
 */

import { RTT_SYMBOL } from "./constants.ts";

/**
 * Shorten a wallet address for display: 0x1234…abcd
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/**
 * Format an RTT balance string to a fixed number of decimal places.
 * Accepts a raw decimal string from formatUnits().
 */
export function formatRtt(raw: string | null, decimals = 4): string {
  if (raw === null) return "—";
  const num = parseFloat(raw);
  if (isNaN(num)) return "—";
  return `${num.toFixed(decimals)} ${RTT_SYMBOL}`;
}

/**
 * Format a Unix timestamp (seconds) to a locale date-time string.
 */
export function formatUnixTimestamp(unix: number | bigint): string {
  const ms = typeof unix === "bigint" ? Number(unix) * 1000 : unix * 1000;
  return new Date(ms).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Format a duration in seconds to a human-readable string.
 * Examples: "2 hours", "30 days", "90 days"
 */
export function formatDuration(seconds: number | bigint): string {
  const s = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${Math.round(s / 3600)} hour${s === 3600 ? "" : "s"}`;
  return `${Math.round(s / 86400)} day${s === 86400 ? "" : "s"}`;
}

/**
 * Format rainfall in whole millimetres.
 */
export function formatRainfall(mm: number | bigint): string {
  const n = typeof mm === "bigint" ? Number(mm) : mm;
  return `${n} mm`;
}

/**
 * Format a probability (0–1) as a percentage string.
 * Example: 0.64 → "64%"
 */
export function formatProbability(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/**
 * Truncate a transaction hash for display.
 * Example: 0xabcd1234…ef56
 */
export function shortenTxHash(hash: string, chars = 6): string {
  if (!hash || hash.length < 14) return hash;
  return `${hash.slice(0, chars + 2)}…${hash.slice(-chars)}`;
}
