/**
 * dateHelpers.ts
 *
 * Date and time validation and alignment helpers for AgriShield policy enrollment.
 *
 * Implements requirements M3-E01, M3-E02, and M3-E08:
 * - Option 0 (Demo 2h): Start time must be in the future and aligned to a full hour (minute=0, second=0).
 * - Options 1–12 (>= 30 days): Start time must be in the future and aligned to a whole day (00:00:00 UTC).
 * - Contract calculates endTime = startTime + durationSeconds; this helper computes the preview.
 */

/**
 * Checks if a Unix timestamp in seconds is aligned to a full hour (3600 seconds).
 */
export function isFullHour(unixSeconds: number): boolean {
  return Number.isInteger(unixSeconds) && unixSeconds % 3600 === 0;
}

/**
 * Checks if a Unix timestamp in seconds is aligned to a whole day in UTC (86400 seconds).
 */
export function isWholeDayUtc(unixSeconds: number): boolean {
  return Number.isInteger(unixSeconds) && unixSeconds % 86400 === 0;
}

/**
 * Returns the next full hour in UTC as Unix seconds strictly after the reference time.
 * If reference time is 14:15, returns 15:00:00.
 * If reference time is exactly 14:00:00, returns 15:00:00 (strictly in the future).
 */
export function getNextFullHourUnix(referenceMs: number = Date.now()): number {
  const currentSeconds = Math.floor(referenceMs / 1000);
  const remainder = currentSeconds % 3600;
  return currentSeconds - remainder + 3600;
}

/**
 * Returns tomorrow at 00:00:00 UTC as Unix seconds strictly after the reference time.
 */
export function getNextUtcDayUnix(referenceMs: number = Date.now()): number {
  const currentSeconds = Math.floor(referenceMs / 1000);
  const remainder = currentSeconds % 86400;
  return currentSeconds - remainder + 86400;
}

export interface StartTimeValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a proposed policy start time (Unix seconds) against RPD Section 8, Section 9 and M3-E01 rules.
 *
 * @param startUnixSeconds Unix timestamp in seconds
 * @param isDemo Whether Option 0 (2-hour Demo) is selected
 * @param referenceUnixSeconds Current timestamp in seconds (defaults to Date.now() / 1000)
 */
export function validateStartTime(
  startUnixSeconds: number,
  isDemo: boolean,
  referenceUnixSeconds: number = Math.floor(Date.now() / 1000),
): StartTimeValidationResult {
  if (!startUnixSeconds || isNaN(startUnixSeconds) || startUnixSeconds <= 0) {
    return {
      isValid: false,
      error: "Please select a valid start date and time.",
    };
  }

  // Future check: strictly in the future (M3-E01 / StartTimeInPast)
  if (startUnixSeconds <= referenceUnixSeconds) {
    return {
      isValid: false,
      error: "Start time cannot be in the past or current second. Please select a future date and time.",
    };
  }

  // Demo alignment check: full hour (minute=0, second=0)
  if (isDemo) {
    if (!isFullHour(startUnixSeconds)) {
      return {
        isValid: false,
        error:
          "Demo option (Option 0) requires a full-hour start time (e.g. 14:00:00 UTC with minutes and seconds set to :00).",
      };
    }
  } else {
    // Standard option alignment check: whole day (00:00:00 UTC)
    if (!isWholeDayUtc(startUnixSeconds)) {
      return {
        isValid: false,
        error:
          "Standard seasonal policies require a whole-day start time aligned to 00:00:00 UTC.",
      };
    }
  }

  return { isValid: true };
}

/**
 * Previews the computed policy end time (M3-E02).
 * Note: The smart contract computes the official on-chain end time as (startTime + durationSeconds).
 */
export function calculatePreviewEndTime(
  startUnixSeconds: number,
  durationSeconds: number,
): number {
  return startUnixSeconds + durationSeconds;
}

/**
 * Formats a Unix timestamp to a local datetime string for HTML `<input type="datetime-local" />`.
 * Format: `YYYY-MM-DDTHH:mm`
 */
export function toDatetimeLocalInput(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converts a `<input type="datetime-local" />` value (`YYYY-MM-DDTHH:mm`) to Unix timestamp in seconds.
 */
export function fromDatetimeLocalInput(inputValue: string): number {
  if (!inputValue) return 0;
  const date = new Date(inputValue);
  return Math.floor(date.getTime() / 1000);
}

/**
 * Formats a Unix timestamp to a UTC date string for HTML `<input type="date" />`.
 * Format: `YYYY-MM-DD`
 */
export function toDateOnlyInput(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  return `${year}-${month}-${day}`;
}

/**
 * Converts a `<input type="date" />` value (`YYYY-MM-DD`) to 00:00:00 UTC Unix timestamp in seconds.
 */
export function fromDateOnlyInputToUtc(inputValue: string): number {
  if (!inputValue) return 0;
  const parts = inputValue.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  const [year, month, day] = parts;
  const ms = Date.UTC(year, month - 1, day, 0, 0, 0);
  return Math.floor(ms / 1000);
}

/**
 * Formats a Unix timestamp explicitly as UTC for display.
 * Example: `2026-11-02 00:00:00 UTC`
 */
export function formatUtcDateTime(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}
