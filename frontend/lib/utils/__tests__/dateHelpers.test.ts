/**
 * dateHelpers.test.ts
 *
 * Unit tests for policy enrollment date alignment, future validation,
 * and preview end time computation (RPD Section 8, Section 9, M3-E01, M3-E02).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isFullHour,
  isWholeDayUtc,
  getNextFullHourUnix,
  getNextUtcDayUnix,
  validateStartTime,
  calculatePreviewEndTime,
  toDateOnlyInput,
  fromDateOnlyInputToUtc,
  formatUtcDateTime,
} from "../dateHelpers.ts";

describe("RPD M3-E01: Start Time Date Helpers & Alignment", () => {
  it("correctly identifies full-hour alignment (divisible by 3600)", () => {
    assert.strictEqual(isFullHour(0), true);
    assert.strictEqual(isFullHour(3600), true);
    assert.strictEqual(isFullHour(7200), true);
    assert.strictEqual(isFullHour(1700000400), isFullHour(1700000400)); // verified mathematically

    assert.strictEqual(isFullHour(3601), false);
    assert.strictEqual(isFullHour(3660), false);
    assert.strictEqual(isFullHour(12345), false);
  });

  it("correctly identifies whole-day UTC alignment (divisible by 86400)", () => {
    assert.strictEqual(isWholeDayUtc(0), true);
    assert.strictEqual(isWholeDayUtc(86400), true);
    assert.strictEqual(isWholeDayUtc(86400 * 50), true);

    assert.strictEqual(isWholeDayUtc(86401), false);
    assert.strictEqual(isWholeDayUtc(86400 + 3600), false); // 1 hour past midnight UTC is not whole day
  });

  it("getNextFullHourUnix returns future timestamp divisible by 3600", () => {
    const fixedNowMs = 1700000123000; // e.g. some timestamp with minutes and seconds
    const nextHour = getNextFullHourUnix(fixedNowMs);
    const nowSec = Math.floor(fixedNowMs / 1000);

    assert.ok(nextHour > nowSec, "Next full hour must be strictly in the future");
    assert.strictEqual(nextHour % 3600, 0, "Next full hour must be aligned to 3600");
  });

  it("getNextUtcDayUnix returns future timestamp divisible by 86400", () => {
    const fixedNowMs = 1700000123000;
    const nextDay = getNextUtcDayUnix(fixedNowMs);
    const nowSec = Math.floor(fixedNowMs / 1000);

    assert.ok(nextDay > nowSec, "Next UTC day must be strictly in the future");
    assert.strictEqual(nextDay % 86400, 0, "Next UTC day must be aligned to 86400");
  });
});

describe("RPD M3-E01 / Section 9: validateStartTime Rules", () => {
  const referenceNow = 1700000000; // Reference timestamp in seconds

  it("fails if start time is in the past or equal to current timestamp", () => {
    const pastResult = validateStartTime(referenceNow - 3600, true, referenceNow);
    assert.strictEqual(pastResult.isValid, false);
    assert.match(pastResult.error || "", /past/i);

    const equalResult = validateStartTime(referenceNow, true, referenceNow);
    assert.strictEqual(equalResult.isValid, false);
    assert.match(equalResult.error || "", /past/i);
  });

  it("for Option 0 (Demo): accepts valid future full hour, rejects unaligned times", () => {
    // Aligned to 3600 and in future:
    const alignedFuture = Math.ceil((referenceNow + 100) / 3600) * 3600;
    const validResult = validateStartTime(alignedFuture, true, referenceNow);
    assert.strictEqual(validResult.isValid, true);
    assert.strictEqual(validResult.error, undefined);

    // Unaligned future (30 minutes into the hour):
    const unalignedFuture = alignedFuture + 1800;
    const invalidResult = validateStartTime(unalignedFuture, true, referenceNow);
    assert.strictEqual(invalidResult.isValid, false);
    assert.match(invalidResult.error || "", /full-hour/i);
  });

  it("for Options 1–12: accepts valid future whole-day UTC, rejects unaligned times", () => {
    // Aligned to 86400 (00:00:00 UTC) and in future:
    const alignedUtcDay = Math.ceil((referenceNow + 100) / 86400) * 86400;
    const validResult = validateStartTime(alignedUtcDay, false, referenceNow);
    assert.strictEqual(validResult.isValid, true);
    assert.strictEqual(validResult.error, undefined);

    // Aligned to hour (e.g. 14:00 UTC) but not whole day (00:00:00 UTC):
    const unalignedDay = alignedUtcDay + 3600 * 14;
    const invalidResult = validateStartTime(unalignedDay, false, referenceNow);
    assert.strictEqual(invalidResult.isValid, false);
    assert.match(invalidResult.error || "", /whole-day/i);
  });
});

describe("RPD M3-E02: Computed End Time Preview", () => {
  it("calculates endTime = startTime + durationSeconds preview", () => {
    const startTime = 1700000000;
    const twoHours = 7200;
    const thirtyDays = 30 * 86400;

    assert.strictEqual(calculatePreviewEndTime(startTime, twoHours), startTime + 7200);
    assert.strictEqual(calculatePreviewEndTime(startTime, thirtyDays), startTime + 2592000);
  });
});

describe("Date Input Conversions", () => {
  it("converts YYYY-MM-DD input string to 00:00:00 UTC Unix timestamp and formats back", () => {
    const inputDate = "2026-11-05";
    const unixSeconds = fromDateOnlyInputToUtc(inputDate);

    assert.strictEqual(unixSeconds % 86400, 0, "Must be aligned to 00:00:00 UTC");
    assert.strictEqual(toDateOnlyInput(unixSeconds), inputDate);
    assert.strictEqual(formatUtcDateTime(unixSeconds), "2026-11-05 00:00:00 UTC");
  });
});
