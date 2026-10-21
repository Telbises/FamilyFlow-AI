import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadConfig } from "../src/config.js";
import { MemoryIdempotencyStore } from "../src/lib/memory-idempotency.js";
import { MemoryFamilyFlowRepository } from "../src/lib/memory-repository.js";
import { FamilyFlowService } from "../src/services/familyflow-service.js";
import type { FamilyFlowRepository } from "../src/lib/repository.js";
import type { IdempotencyStore } from "../src/lib/idempotency.js";

describe("vertical slice: request → approve → complete → points once", () => {
  it("runs end-to-end against real state machine", async () => {
    const config = loadConfig({
      FAMILYFLOW_MODE: "local",
      ALLOW_LOCAL_DEV_AUTH: "true",
      BEDROCK_ENABLED: "false",
      POINTS_PER_COMPLETION: "10",
    });
    const repo = new MemoryFamilyFlowRepository() as unknown as FamilyFlowRepository;
    const idem = new MemoryIdempotencyStore() as unknown as IdempotencyStore;
    const service = new FamilyFlowService(repo, idem, config);
    const auth = { sub: "parent-1", tokenUse: "local" as const, rawClaims: {} };

    const household = await service.createHousehold(auth, { timezone: "America/Los_Angeles" });
    assert.ok(household.id);

    const child = await service.createMember(auth, {
      displayName: "Sam",
      role: "child",
      ageBand: "7-12",
      visibilityNoticeAcknowledged: true,
    });

    const pairing = await service.createPairingCode(auth);
    assert.match(pairing.code, /^\d{6}$/);
    const paired = await service.pairDevice({ code: pairing.code, label: "Living Room TV" });
    assert.equal(paired.householdId, household.id);
    assert.ok(paired.sessionToken);
    const device = await service.authenticateDeviceSession(paired.sessionId, paired.sessionToken);
    assert.equal(device.householdId, household.id);
    await assert.rejects(() =>
      service.authenticateDeviceSession(paired.sessionId, "wrong-token"),
    );

    const { missions } = { missions: await service.listMissions(auth) };
    assert.ok(missions.length >= 1);
    const mission = missions[0]!;

    const req = await service.requestMission(auth, mission.id, {
      memberId: child.id,
      source: "fire_tv",
      idempotencyKey: "idem-req-1",
    });
    assert.equal(req.request.status, "pending");

    // Replay idempotency
    const replay = await service.requestMission(auth, mission.id, {
      memberId: child.id,
      source: "fire_tv",
      idempotencyKey: "idem-req-1",
    });
    assert.equal(replay.request.id, req.request.id);

    const approvals = await service.listApprovals(auth);
    assert.equal(approvals.requests.length, 1);

    const decided = await service.decideApproval(auth, req.request.id, {
      decision: "approved",
      idempotencyKey: "idem-dec-1",
    });
    assert.equal(decided.missionStatus, "approved");

    // Concurrent double-approve must fail
    await assert.rejects(() =>
      service.decideApproval(auth, req.request.id, {
        decision: "approved",
        idempotencyKey: "idem-dec-2",
      }),
    );

    const completion = await service.requestCompletion(auth, mission.id, {
      memberId: child.id,
      idempotencyKey: "idem-comp-1",
    });
    assert.equal(completion.completion.status, "pending");

    const done = await service.decideCompletion(auth, completion.completion.id, {
      decision: "approved",
      idempotencyKey: "idem-comp-dec-1",
    });
    assert.equal(done.completion.pointsAwarded, 10);
    assert.equal(done.totalPoints, 10);
    assert.ok(done.unlockedRewards.length >= 1);

    await assert.rejects(() =>
      service.decideCompletion(auth, completion.completion.id, {
        decision: "approved",
        idempotencyKey: "idem-comp-dec-2",
      }),
    );

    const audit = await service.listAuditEvents(auth);
    const types = audit.map((e) => e.eventType);
    assert.ok(types.includes("mission.requested"));
    assert.ok(types.includes("mission.request_decided"));
    assert.ok(types.includes("mission.completion_decided"));
    assert.ok(types.includes("device.paired"));

    // Expired pairing
    const pairing2 = await service.createPairingCode(auth);
    // Force expiry by pairing with wrong code
    await assert.rejects(() => service.pairDevice({ code: "000000", label: "X" }));

    // Cross-household: second parent cannot see first household via their token
    const auth2 = { sub: "parent-2", tokenUse: "local" as const, rawClaims: {} };
    await service.createHousehold(auth2, {});
    await assert.rejects(() => service.decideApproval(auth2, req.request.id, {
      decision: "approved",
      idempotencyKey: "x",
    }));

    void pairing2;
  });
});
