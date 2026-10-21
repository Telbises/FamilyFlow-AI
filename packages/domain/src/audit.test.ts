import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAuditEvent, sanitizeAuditMetadata } from "./audit.js";

describe("audit sanitization", () => {
  it("keeps allowlisted keys only", () => {
    const cleaned = sanitizeAuditMetadata({
      missionId: "m1",
      email: "kid@example.com",
      displayName: "Sam",
      token: "secret",
      decision: "approved",
    });
    assert.deepEqual(cleaned, { missionId: "m1", decision: "approved" });
  });

  it("strips string values that look like emails even on allowlisted keys", () => {
    const cleaned = sanitizeAuditMetadata({
      status: "user@host",
      source: "alexa",
    });
    assert.equal(cleaned.status, undefined);
    assert.equal(cleaned.source, "alexa");
  });

  it("builds events with correlation id", () => {
    const ev = buildAuditEvent({
      householdId: "h1",
      actorId: "a1",
      actorType: "parent",
      eventType: "test.event",
      entityId: "e1",
      metadata: { requestId: "r1", password: "nope" },
    });
    assert.ok(ev.correlationId);
    assert.equal(ev.metadata.requestId, "r1");
    assert.equal(ev.metadata.password, undefined);
  });
});
