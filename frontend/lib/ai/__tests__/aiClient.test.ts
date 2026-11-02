/**
 * aiClient.test.ts
 *
 * Unit tests for AI recommendation client utilities (M3-AI02, M3-AP05).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCandidateOptions,
  AiServiceError,
} from "../aiClient.ts";
import { MOCK_CATALOGUE } from "../../mock/mockCatalogue.ts";

describe("AI Client Candidate Options Mapping (M3-AI02)", () => {
  it("converts contract catalogue options into FastAPI schema candidate inputs", () => {
    const candidates = buildCandidateOptions(MOCK_CATALOGUE);

    assert.strictEqual(candidates.length, MOCK_CATALOGUE.length);
    assert.strictEqual(candidates[0].option_id, 0);
    assert.strictEqual(candidates[0].duration_seconds, 7200);
    assert.strictEqual(candidates[0].trigger_mm, 1);
    assert.strictEqual(candidates[0].payout, 10);

    // Option 5 check (Moderate 30-day)
    const opt5 = candidates.find((c) => c.option_id === 5);
    assert.ok(opt5, "Option 5 should exist in candidates");
    assert.strictEqual(opt5?.duration_seconds, 2592000);
    assert.strictEqual(opt5?.trigger_mm, 60);
    assert.strictEqual(opt5?.payout, 60);
  });

  it("handles AiServiceError structure cleanly for offline states", () => {
    const error = new AiServiceError("Service unavailable", 503, true);
    assert.strictEqual(error.statusCode, 503);
    assert.strictEqual(error.isUnavailable, true);
    assert.strictEqual(error.name, "AiServiceError");
    assert.strictEqual(error.message, "Service unavailable");
  });
});
