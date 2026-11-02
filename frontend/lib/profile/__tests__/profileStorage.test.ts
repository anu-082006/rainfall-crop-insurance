/**
 * profileStorage.test.ts
 *
 * Unit tests for farmer profile validation and wallet-specific persistence (M3-PR01 to M3-PR04).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  validateProfile,
  getProfileStorageKey,
} from "../profileStorage.ts";

describe("Farmer Profile Validation (M3-PR01 & M3-PR03)", () => {
  it("passes validation with standard valid inputs", () => {
    const res = validateProfile({
      latitude: 12.9716,
      longitude: 77.5946,
      crop: "groundnut",
      sowingDate: "2026-06-15",
    });
    assert.equal(res.valid, true);
    assert.deepEqual(res.errors, {});
  });

  it("accepts valid numeric strings for coordinates", () => {
    const res = validateProfile({
      latitude: "16.3067",
      longitude: "80.4365",
      crop: "rice",
      sowingDate: "2026-07-01",
    });
    assert.equal(res.valid, true);
  });

  it("fails if latitude is out of [-90, +90] range", () => {
    const resTooLow = validateProfile({
      latitude: -90.5,
      longitude: 77.5,
      crop: "groundnut",
      sowingDate: "2026-06-15",
    });
    assert.equal(resTooLow.valid, false);
    assert.ok(resTooLow.errors.latitude?.includes("between -90.0 and +90.0"));

    const resTooHigh = validateProfile({
      latitude: 91.0,
      longitude: 77.5,
      crop: "groundnut",
      sowingDate: "2026-06-15",
    });
    assert.equal(resTooHigh.valid, false);
  });

  it("fails if longitude is out of [-180, +180] range", () => {
    const res = validateProfile({
      latitude: 12.97,
      longitude: 185.0,
      crop: "wheat",
      sowingDate: "2026-06-15",
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors.longitude?.includes("between -180.0 and +180.0"));
  });

  it("fails if crop is not in the supported crop list", () => {
    const res = validateProfile({
      latitude: 12.97,
      longitude: 77.59,
      crop: "avocado",
      sowingDate: "2026-06-15",
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors.crop?.includes("not supported"));
  });

  it("fails if sowing date is empty or invalid format", () => {
    const resEmpty = validateProfile({
      latitude: 12.97,
      longitude: 77.59,
      crop: "maize",
      sowingDate: "",
    });
    assert.equal(resEmpty.valid, false);
    assert.ok(resEmpty.errors.sowingDate?.includes("required"));

    const resInvalid = validateProfile({
      latitude: 12.97,
      longitude: 77.59,
      crop: "maize",
      sowingDate: "not-a-date",
    });
    assert.equal(resInvalid.valid, false);
    assert.ok(resInvalid.errors.sowingDate?.includes("Invalid date"));
  });
});

describe("Wallet-Specific Persistence Keying (M3-PR02)", () => {
  it("generates lowercase wallet-specific storage key", () => {
    const key1 = getProfileStorageKey("0xAbCdEf1234567890abcdef1234567890abCDeF12");
    const key2 = getProfileStorageKey("0xabcdef1234567890abcdef1234567890abcdef12");

    assert.equal(key1, key2);
    assert.ok(key1.startsWith("crop_insure_farmer_profile_0xabcdef"));
  });

  it("isolates storage keys between different wallet addresses", () => {
    const keyA = getProfileStorageKey("0x1111111111111111111111111111111111111111");
    const keyB = getProfileStorageKey("0x2222222222222222222222222222222222222222");

    assert.notEqual(keyA, keyB);
  });
});
