import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Member } from "@familyflow/shared";
import { assertParent, canDecideApprovals, requireChildVisibilityNotice } from "./roles.js";

const parent: Member = {
  id: "p1",
  householdId: "h1",
  displayName: "Alex",
  ageBand: null,
  role: "parent",
  active: true,
  visibilityNoticeAcknowledgedAt: null,
  createdAt: new Date().toISOString(),
};

const child: Member = {
  ...parent,
  id: "c1",
  displayName: "Sam",
  ageBand: "7-12",
  role: "child",
  visibilityNoticeAcknowledgedAt: null,
};

describe("roles", () => {
  it("requires parent for approvals", () => {
    assert.doesNotThrow(() => assertParent(parent));
    assert.throws(() => assertParent(child));
    assert.equal(canDecideApprovals("parent"), true);
    assert.equal(canDecideApprovals("child"), false);
  });

  it("requires child visibility notice", () => {
    assert.throws(() => requireChildVisibilityNotice(child));
    assert.doesNotThrow(() =>
      requireChildVisibilityNotice({
        ...child,
        visibilityNoticeAcknowledgedAt: new Date().toISOString(),
      }),
    );
  });
});
