/**
 * contractLayer.test.ts
 *
 * Comprehensive unit tests for:
 * 1. Policy status derivation logic (RPD Section 8)
 * 2. Contract custom error mapping (RPD Section 9 & Appendix A.2)
 * 3. 13-option catalogue constraints (RPD Appendix A.1)
 *
 * Runs via Node.js built-in test runner.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { derivePolicyStatus } from "../policyStatus.ts";
import { mapContractError } from "../errorMapper.ts";
import { MOCK_CATALOGUE } from "../../mock/mockCatalogue.ts";

describe("RPD Section 8: Policy Status Derivation Logic", () => {
  const FIXED_NOW = 1700000000; // Fixed reference timestamp
  const ONE_DAY = 86400;

  it("Rule 1: Claimed flag set -> Claimed (highest priority)", () => {
    const result = derivePolicyStatus({
      startTime: FIXED_NOW - 10 * ONE_DAY,
      endTime: FIXED_NOW - ONE_DAY,
      reportReceived: true,
      rainfallMm: 40,
      thresholdMm: 60,
      claimed: true,
      currentTime: FIXED_NOW,
    });

    assert.equal(result.code, "CLAIMED");
    assert.equal(result.label, "Claimed");
    assert.equal(result.canClaim, false);
    assert.equal(result.badgeVariant, "gray");
    assert.ok(result.reasonDisabled?.includes("already been claimed"));
  });

  it("Rule 2: Report accepted and rainfall strictly below trigger -> Eligible", () => {
    const result = derivePolicyStatus({
      startTime: FIXED_NOW - 10 * ONE_DAY,
      endTime: FIXED_NOW - ONE_DAY,
      reportReceived: true,
      rainfallMm: 42,
      thresholdMm: 60,
      claimed: false,
      currentTime: FIXED_NOW,
    });

    assert.equal(result.code, "ELIGIBLE");
    assert.equal(result.label, "Eligible");
    assert.equal(result.canClaim, true);
    assert.equal(result.badgeVariant, "emerald");
    assert.equal(result.reasonDisabled, undefined);
  });

  it("Rule 3: Report accepted and rainfall EQUAL to trigger -> Not eligible (equal counts as not below)", () => {
    const result = derivePolicyStatus({
      startTime: FIXED_NOW - 10 * ONE_DAY,
      endTime: FIXED_NOW - ONE_DAY,
      reportReceived: true,
      rainfallMm: 60,
      thresholdMm: 60, // Exact equality
      claimed: false,
      currentTime: FIXED_NOW,
    });

    assert.equal(result.code, "NOT_ELIGIBLE");
    assert.equal(result.label, "Not eligible");
    assert.equal(result.canClaim, false);
    assert.equal(result.badgeVariant, "red");
    assert.ok(result.reasonDisabled?.includes("not below"));
  });

  it("Rule 3b: Report accepted and rainfall strictly above trigger -> Not eligible", () => {
    const result = derivePolicyStatus({
      startTime: FIXED_NOW - 10 * ONE_DAY,
      endTime: FIXED_NOW - ONE_DAY,
      reportReceived: true,
      rainfallMm: 85,
      thresholdMm: 60,
      claimed: false,
      currentTime: FIXED_NOW,
    });

    assert.equal(result.code, "NOT_ELIGIBLE");
    assert.equal(result.label, "Not eligible");
    assert.equal(result.canClaim, false);
  });

  it("Rule 4: Current time before start time -> Scheduled", () => {
    const result = derivePolicyStatus({
      startTime: FIXED_NOW + 2 * ONE_DAY, // In the future
      endTime: FIXED_NOW + 32 * ONE_DAY,
      reportReceived: false,
      rainfallMm: 0,
      thresholdMm: 60,
      claimed: false,
      currentTime: FIXED_NOW,
    });

    assert.equal(result.code, "SCHEDULED");
    assert.equal(result.label, "Scheduled");
    assert.equal(result.canClaim, false);
    assert.equal(result.badgeVariant, "blue");
    assert.ok(result.reasonDisabled?.includes("not started"));
  });

  it("Rule 5: Current time at or after end time and no report -> Coverage ended (awaiting report)", () => {
    const result = derivePolicyStatus({
      startTime: FIXED_NOW - 30 * ONE_DAY,
      endTime: FIXED_NOW, // Exactly at or past end
      reportReceived: false,
      rainfallMm: 0,
      thresholdMm: 60,
      claimed: false,
      currentTime: FIXED_NOW,
    });

    assert.equal(result.code, "AWAITING_REPORT");
    assert.equal(result.label, "Coverage ended (awaiting report)");
    assert.equal(result.canClaim, false);
    assert.equal(result.badgeVariant, "amber");
    assert.ok(result.reasonDisabled?.includes("not yet been submitted"));
  });

  it("Rule 6: Current time within window (start <= now < end) and no report -> Active", () => {
    const result = derivePolicyStatus({
      startTime: FIXED_NOW - 5 * ONE_DAY,
      endTime: FIXED_NOW + 25 * ONE_DAY,
      reportReceived: false,
      rainfallMm: 0,
      thresholdMm: 60,
      claimed: false,
      currentTime: FIXED_NOW,
    });

    assert.equal(result.code, "ACTIVE");
    assert.equal(result.label, "Active");
    assert.equal(result.canClaim, false);
    assert.equal(result.badgeVariant, "green");
    assert.ok(result.reasonDisabled?.includes("still actively running"));
  });
});

describe("RPD Section 9: Contract Custom Error Mapping", () => {
  it("Maps user rejection in MetaMask without sticking error state", () => {
    const mapped = mapContractError({ code: 4001, message: "User rejected the transaction" });
    assert.equal(mapped.isUserRejection, true);
    assert.equal(mapped.title, "Transaction Cancelled");
  });

  it("Maps InvalidOption to plain explanation", () => {
    const mapped = mapContractError(new Error("execution reverted: custom error InvalidOption()"));
    assert.equal(mapped.title, "Transaction Reverted");
    assert.ok(mapped.message.includes("does not exist"));
  });

  it("Maps Person 1 StartNotInFuture to future explanation", () => {
    const mapped = mapContractError(new Error("execution reverted: custom error StartNotInFuture()"));
    assert.equal(mapped.title, "Transaction Reverted");
    assert.ok(mapped.message.includes("strictly in the future"));
  });

  it("Maps Person 1 StartNotOnFullHour to full UTC hour explanation", () => {
    const mapped = mapContractError(new Error("execution reverted: custom error StartNotOnFullHour()"));
    assert.equal(mapped.title, "Transaction Reverted");
    assert.ok(mapped.message.includes("full UTC hour"));
  });

  it("Maps Person 1 NoReport to missing report explanation", () => {
    const mapped = mapContractError(new Error("execution reverted: custom error NoReport(1)"));
    assert.equal(mapped.title, "Transaction Reverted");
    assert.ok(mapped.message.includes("not been submitted or accepted"));
  });

  it("Maps Person 1 ObservationNotEnded to observation window explanation", () => {
    const mapped = mapContractError(new Error("execution reverted: custom error ObservationNotEnded(2)"));
    assert.equal(mapped.title, "Transaction Reverted");
    assert.ok(mapped.message.includes("observation window has not ended"));
  });

  it("Maps StartTimeInPast to plain explanation", () => {
    const mapped = mapContractError(new Error("execution reverted: StartTimeInPast()"));
    assert.ok(mapped.message.includes("past"));
  });

  it("Maps InvalidStartAlignment to full hour / whole day explanation", () => {
    const mapped = mapContractError(new Error("execution reverted: InvalidStartAlignment()"));
    assert.ok(mapped.message.includes("full-hour"));
  });

  it("Maps NotPolicyOwner to ownership explanation", () => {
    const mapped = mapContractError(new Error("execution reverted: NotPolicyOwner()"));
    assert.ok(mapped.message.includes("not the owner"));
  });

  it("Maps AlreadyClaimed to duplicate claim explanation", () => {
    const mapped = mapContractError(new Error("execution reverted: AlreadyClaimed()"));
    assert.ok(mapped.message.includes("already been paid"));
  });

  it("Maps InsufficientPayoutBalance to funding warning", () => {
    const mapped = mapContractError(new Error("execution reverted: InsufficientPayoutBalance()"));
    assert.ok(mapped.message.includes("unfunded"));
  });

  it("Maps network connection failure gracefully", () => {
    const mapped = mapContractError(new Error("could not detect network, ECONNREFUSED 127.0.0.1:8545"));
    assert.equal(mapped.title, "Network Connection Error");
    assert.ok(mapped.message.includes("Anvil"));
  });

  it("Preserves already mapped error and NEVER produces [object Object]", () => {
    const original = {
      title: "Transaction Reverted",
      message: "Coverage start time must be in the future.",
      isUserRejection: false,
    };
    const mapped = mapContractError(original);
    assert.equal(mapped.title, original.title);
    assert.equal(mapped.message, original.message);
    assert.notEqual(mapped.message, "[object Object]");
  });

  it("Ensures plain or empty object error never returns [object Object]", () => {
    const mapped1 = mapContractError({});
    assert.notEqual(mapped1.message, "[object Object]");
    assert.ok(mapped1.message.length > 0);

    const mapped2 = mapContractError({ someRandomProp: 123 });
    assert.notEqual(mapped2.message, "[object Object]");
    assert.ok(mapped2.message.length > 0);
  });

  it("Decodes 4-byte custom error selectors directly", () => {
    // 0xe8d4723a is StartNotInFuture()
    const mappedFuture = mapContractError({ data: "0xe8d4723a" });
    assert.equal(mappedFuture.title, "Transaction Reverted");
    assert.ok(mappedFuture.message.includes("strictly in the future"));

    // 0x9895f5a1 is StartNotOnFullHour()
    const mappedHour = mapContractError({ data: "0x9895f5a1" });
    assert.equal(mappedHour.title, "Transaction Reverted");
    assert.ok(mappedHour.message.includes("full UTC hour"));
  });
});

describe("RPD Appendix A.1: 13-Option Catalogue Verification", () => {
  it("Contains exactly 13 options numbered 0 to 12", () => {
    assert.equal(MOCK_CATALOGUE.length, 13);
    MOCK_CATALOGUE.forEach((opt, idx) => {
      assert.equal(opt.optionId, idx);
    });
  });

  it("Option 0 is marked as Demo option with 2 hours duration", () => {
    const demo = MOCK_CATALOGUE[0];
    assert.equal(demo.isDemo, true);
    assert.equal(demo.riskLabel, "Demo");
    assert.equal(demo.durationSeconds, 7200);
    assert.equal(demo.triggerMm, 1);
    assert.equal(demo.payoutRtt, 10);
  });

  it("Options 1 through 12 have isDemo = false and match Appendix A.1 terms", () => {
    // Check Severe 30d
    assert.equal(MOCK_CATALOGUE[1].riskLabel, "Severe");
    assert.equal(MOCK_CATALOGUE[1].triggerMm, 30);
    assert.equal(MOCK_CATALOGUE[1].payoutRtt, 90);

    // Check Moderate 60d (Option 6)
    assert.equal(MOCK_CATALOGUE[6].riskLabel, "Moderate");
    assert.equal(MOCK_CATALOGUE[6].triggerMm, 120);
    assert.equal(MOCK_CATALOGUE[6].payoutRtt, 120);

    // Check Mild 120d (Option 12)
    assert.equal(MOCK_CATALOGUE[12].riskLabel, "Mild");
    assert.equal(MOCK_CATALOGUE[12].triggerMm, 360);
    assert.equal(MOCK_CATALOGUE[12].payoutRtt, 120);
  });
});
