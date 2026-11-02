/**
 * eventIndexer.test.ts
 *
 * Unit tests for event indexing and transaction history (M3-H01, M3-H02).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateBaselineMockEvents,
  getMockEventHistory,
} from "../eventIndexer.ts";

describe("RPD Section 4.5 / M3-H01: Transaction Event Indexing", () => {
  const TEST_WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  it("generates baseline events containing all 3 core event types", () => {
    const events = generateBaselineMockEvents(TEST_WALLET);

    assert.ok(events.length > 0, "Should generate baseline events");

    const eventNames = new Set(events.map((e) => e.eventName));
    assert.ok(
      eventNames.has("PolicyCreated") || eventNames.has("PolicyEnrolled"),
      "Must include PolicyCreated or PolicyEnrolled events"
    );
    assert.ok(
      eventNames.has("RainfallReportAccepted"),
      "Must include RainfallReportAccepted events"
    );
    assert.ok(eventNames.has("ClaimPaid"), "Must include ClaimPaid events");
  });

  it("assigns the queried wallet address to all wallet-specific events", () => {
    const events = generateBaselineMockEvents(TEST_WALLET);

    for (const evt of events) {
      if (evt.owner) {
        assert.strictEqual(
          evt.owner.toLowerCase(),
          TEST_WALLET.toLowerCase(),
          "Owner address must match queried wallet"
        );
      }
    }
  });

  it("ensures all events include blockNumber, policyId, and transactionHash (M3-H01)", () => {
    const events = generateBaselineMockEvents(TEST_WALLET);

    for (const evt of events) {
      assert.ok(typeof evt.blockNumber === "number" && evt.blockNumber > 0, "Valid blockNumber");
      assert.ok(typeof evt.policyId === "number" && evt.policyId > 0, "Valid policyId");
      assert.ok(
        typeof evt.transactionHash === "string" && evt.transactionHash.startsWith("0x"),
        "Valid transactionHash"
      );
      assert.strictEqual(evt.isMock, true, "Mock events must be flagged isMock=true");
    }
  });

  it("returns events in descending chronological order", () => {
    const events = getMockEventHistory(TEST_WALLET);

    for (let i = 0; i < events.length - 1; i++) {
      assert.ok(
        events[i].timestamp >= events[i + 1].timestamp,
        `Event ${i} timestamp must be >= event ${i + 1} timestamp`
      );
    }
  });
});
