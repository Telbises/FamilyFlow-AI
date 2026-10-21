import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computePointsAward, rewardUnlocked, DEFAULT_REWARD_THRESHOLDS } from "./points.js";

describe("points", () => {
  it("awards once", () => {
    const first = computePointsAward({ alreadyAwarded: 0, pointsPerCompletion: 10 });
    assert.equal(first.points, 10);
    assert.throws(() => computePointsAward({ alreadyAwarded: 10 }));
  });

  it("unlocks non-purchasable rewards by threshold", () => {
    const unlocked = rewardUnlocked(30, [...DEFAULT_REWARD_THRESHOLDS]);
    assert.equal(unlocked.length, 2);
    assert.equal(unlocked[1]?.title, "Pick the Weekend Adventure");
  });
});
