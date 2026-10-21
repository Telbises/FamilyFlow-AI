import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdventurePlan } from "@familyflow/shared";
import { parseBedrockPlan, pickCuratedFallback } from "./ai.js";

const sample: AdventurePlan = {
  title: "Living Room Obstacle Course",
  ageBands: ["7-12"],
  estimatedMinutes: 25,
  materials: ["pillows", "timer"],
  steps: ["Set soft obstacles", "Take turns racing carefully"],
  safetyNotes: ["Clear sharp objects", "Adult nearby"],
  parentApprovalRequired: true,
};

describe("AI schema validation", () => {
  it("accepts valid plans", () => {
    const res = parseBedrockPlan(sample);
    assert.equal(res.ok, true);
  });

  it("rejects unsafe purchase suggestions", () => {
    const res = parseBedrockPlan({
      ...sample,
      steps: ["Buy a new toy on amazon.com"],
    });
    assert.equal(res.ok, false);
  });

  it("falls back to curated library", () => {
    const res = pickCuratedFallback([sample], ["7-12"]);
    assert.equal(res.ok, true);
    if (res.ok) assert.equal(res.origin, "curated");
  });
});
