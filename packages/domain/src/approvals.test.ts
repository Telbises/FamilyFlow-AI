import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCompletionDecision,
  applyRequestDecision,
  assertMissionCompletable,
  assertMissionRequestable,
  missionStatusAfterCompletionDecision,
  missionStatusAfterRequestDecision,
} from "./approvals.js";

describe("request approval state machine", () => {
  it("approves pending requests", () => {
    assert.equal(applyRequestDecision("pending", "approved"), "approved");
    assert.equal(missionStatusAfterRequestDecision("approved"), "approved");
  });

  it("rejects pending requests", () => {
    assert.equal(applyRequestDecision("pending", "rejected"), "rejected");
    assert.equal(missionStatusAfterRequestDecision("rejected"), "rejected");
  });

  it("blocks double decision", () => {
    assert.throws(() => applyRequestDecision("approved", "rejected"));
  });

  it("allows request from available/rejected only", () => {
    assert.doesNotThrow(() => assertMissionRequestable("available"));
    assert.doesNotThrow(() => assertMissionRequestable("rejected"));
    assert.throws(() => assertMissionRequestable("approved"));
  });
});

describe("completion approval state machine", () => {
  it("awards path to completed", () => {
    assert.equal(applyCompletionDecision("pending", "approved"), "approved");
    assert.equal(missionStatusAfterCompletionDecision("approved"), "completed");
  });

  it("returns mission to approved on rejection", () => {
    assert.equal(missionStatusAfterCompletionDecision("rejected"), "approved");
  });

  it("blocks completion request unless approved/in_progress", () => {
    assert.doesNotThrow(() => assertMissionCompletable("approved"));
    assert.throws(() => assertMissionCompletable("available"));
  });
});
