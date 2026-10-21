import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyCompletionDecision,
  applyRequestDecision,
  assertMissionCompletable,
  assertMissionRequestable,
  assertParent,
  buildAuditEvent,
  computePointsAward,
  DEFAULT_REWARD_THRESHOLDS,
  generatePairingCode,
  generateSessionToken,
  hashPairingCode,
  hashSessionToken,
  missionStatusAfterCompletionDecision,
  missionStatusAfterRequestDecision,
  pairingExpiryIso,
  parseBedrockPlan,
  pickCuratedFallback,
  requireChildVisibilityNotice,
  rewardUnlocked,
  assertPairingValid,
  pairingCodesEqual,
} from "@familyflow/domain";
import {
  Errors,
  type AdventurePlan,
  type AgeBand,
  type Completion,
  type Household,
  type Member,
  type Mission,
  type MissionRequest,
  approvalDecisionSchema,
  completionDecisionSchema,
  completionRequestSchema,
  createHouseholdSchema,
  createMemberSchema,
  generateMissionSchema,
  pairDeviceSchema,
  patchSettingsSchema,
  requestMissionSchema,
  validateAdventurePlan,
} from "@familyflow/shared";
import type { AppConfig } from "../config.js";
import type { AuthContext } from "../lib/auth.js";
import type { IdempotencyStore } from "../lib/idempotency.js";
import type { FamilyFlowRepository } from "../lib/repository.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadCuratedLibrary(): AdventurePlan[] {
  const candidates = [
    join(__dirname, "../../../../curated-missions/library.json"),
    join(process.cwd(), "curated-missions/library.json"),
    join(process.cwd(), "../../curated-missions/library.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = JSON.parse(readFileSync(p, "utf8")) as AdventurePlan[];
      return raw.filter((m) => validateAdventurePlan(m).ok);
    } catch {
      /* try next */
    }
  }
  return [];
}

export class FamilyFlowService {
  private readonly curated = loadCuratedLibrary();

  constructor(
    private readonly repo: FamilyFlowRepository,
    private readonly idem: IdempotencyStore,
    private readonly config: AppConfig,
  ) {}

  private async requireHousehold(auth: AuthContext): Promise<Household> {
    const householdId = await this.repo.getHouseholdLink(auth.sub);
    if (!householdId) throw Errors.notFound("Household");
    const household = await this.repo.getHousehold(householdId);
    if (!household) throw Errors.notFound("Household");
    if (household.ownerId !== auth.sub) {
      // Ownership check — never trust client household IDs.
      throw Errors.forbidden("Household ownership mismatch");
    }
    return household;
  }

  private async requireParent(auth: AuthContext, household: Household): Promise<Member> {
    const members = await this.repo.listMembers(household.id);
    const parent =
      members.find((m) => m.role === "parent" && m.id === auth.sub) ??
      members.find((m) => m.role === "parent" && m.active);
    assertParent(parent);
    return parent;
  }

  async createHousehold(auth: AuthContext, body: unknown): Promise<Household> {
    const existing = await this.repo.getHouseholdLink(auth.sub);
    if (existing) throw Errors.conflict("Household already exists for this parent");
    const input = createHouseholdSchema.parse(body ?? {});
    const now = new Date().toISOString();
    const household: Household = {
      id: randomUUID(),
      ownerId: auth.sub,
      timezone: input.timezone,
      settings: {
        featureFlags: { ...this.config.featureFlags },
        retentionDays: {
          audit: this.config.auditRetentionDays,
          requests: this.config.requestRetentionDays,
        },
        parentalVisibilityNoticeEnabled: true,
        notifications: { inAppPolling: true, emailAlerts: false },
      },
      createdAt: now,
    };
    await this.repo.putHousehold(household, auth.sub);
    const parentMember: Member = {
      id: auth.sub,
      householdId: household.id,
      displayName: "Parent",
      ageBand: null,
      role: "parent",
      active: true,
      visibilityNoticeAcknowledgedAt: now,
      createdAt: now,
    };
    await this.repo.putMember(parentMember);
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: auth.sub,
        actorType: "parent",
        eventType: "household.created",
        entityId: household.id,
      }),
    );
    // Seed curated missions as available
    for (const plan of this.curated) {
      await this.repo.putMission({
        id: randomUUID(),
        householdId: household.id,
        title: plan.title,
        description: plan.steps.join(" "),
        ageBands: plan.ageBands,
        estimatedMinutes: plan.estimatedMinutes,
        status: "available",
        origin: "curated",
        materials: plan.materials,
        steps: plan.steps,
        safetyNotes: plan.safetyNotes,
        parentApprovalRequired: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    return household;
  }

  async getCurrentHousehold(auth: AuthContext) {
    const household = await this.requireHousehold(auth);
    const members = await this.repo.listMembers(household.id);
    const points = await this.repo.getPoints(household.id);
    return { household, members, points };
  }

  async createMember(auth: AuthContext, body: unknown): Promise<Member> {
    const household = await this.requireHousehold(auth);
    await this.requireParent(auth, household);
    const input = createMemberSchema.parse(body);
    if (input.role === "child" && !input.ageBand) {
      throw Errors.validation("ageBand required for child profiles");
    }
    if (input.role === "child" && !input.visibilityNoticeAcknowledged) {
      throw Errors.validation(
        "visibilityNoticeAcknowledged must be true — children need clear notice about FamilyFlow parental visibility",
      );
    }
    const now = new Date().toISOString();
    const member: Member = {
      id: randomUUID(),
      householdId: household.id,
      displayName: input.displayName,
      ageBand: input.role === "child" ? (input.ageBand as AgeBand) : null,
      role: input.role,
      active: true,
      visibilityNoticeAcknowledgedAt:
        input.role === "child" ? now : null,
      createdAt: now,
    };
    await this.repo.putMember(member);
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: auth.sub,
        actorType: "parent",
        eventType: "member.created",
        entityId: member.id,
        metadata: { status: member.role },
      }),
    );
    return member;
  }

  async createPairingCode(auth: AuthContext) {
    const household = await this.requireHousehold(auth);
    await this.requireParent(auth, household);
    if (!household.settings.featureFlags.devicePairing) {
      throw Errors.featureDisabled("devicePairing");
    }
    const code = generatePairingCode();
    const pairingHash = hashPairingCode(code);
    const now = new Date();
    const session = {
      id: randomUUID(),
      householdId: household.id,
      pairingHash,
      sessionTokenHash: null,
      pairedAt: null,
      expiresAt: pairingExpiryIso(this.config.pairingTtlSeconds, now),
      revokedAt: null,
      label: "Pending TV",
    };
    await this.repo.putDeviceSession(session, pairingHash);
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: auth.sub,
        actorType: "parent",
        eventType: "device.pairing_code_created",
        entityId: session.id,
        metadata: { sessionId: session.id },
      }),
    );
    return { sessionId: session.id, code, expiresAt: session.expiresAt };
  }

  async pairDevice(body: unknown) {
    const input = pairDeviceSchema.parse(body);
    const pairingHash = hashPairingCode(input.code);
    const session = await this.repo.findSessionByPairingHash(pairingHash);
    if (!session) throw Errors.notFound("Pairing session");
    assertPairingValid({ expiresAt: session.expiresAt, revokedAt: session.revokedAt });
    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const paired = await this.repo.markDevicePaired(
      session.householdId,
      session.id,
      sessionTokenHash,
      input.label,
    );
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: session.householdId,
        actorId: session.id,
        actorType: "device",
        eventType: "device.paired",
        entityId: session.id,
        metadata: { sessionId: session.id },
      }),
    );
    return {
      sessionId: paired.id,
      householdId: session.householdId,
      label: input.label,
      pairedAt: paired.pairedAt,
      /** Returned once — store on device; never logged. */
      sessionToken,
    };
  }

  async authenticateDeviceSession(sessionId: string, sessionToken: string) {
    const resolved = await this.repo.findDeviceSessionById(sessionId);
    if (!resolved || !resolved.pairedAt || resolved.revokedAt) {
      throw Errors.unauthorized("Device session invalid");
    }
    if (
      !resolved.sessionTokenHash ||
      !pairingCodesEqual(resolved.sessionTokenHash, hashSessionToken(sessionToken))
    ) {
      throw Errors.unauthorized("Device session token invalid");
    }
    return resolved;
  }

  /** Device-authenticated mission list via session id header. */
  async listMissionsForDevice(householdId: string, sessionId: string) {
    const session = await this.repo.getDeviceSession(householdId, sessionId);
    if (!session || !session.pairedAt || session.revokedAt) {
      throw Errors.unauthorized("Device session invalid");
    }
    return this.repo.listMissions(householdId);
  }

  async deviceContext(householdId: string, sessionId: string) {
    await this.listMissionsForDevice(householdId, sessionId);
    const members = await this.repo.listMembers(householdId);
    return {
      householdId,
      sessionId,
      children: members
        .filter((m) => m.role === "child" && m.active)
        .map((m) => ({
          id: m.id,
          displayName: m.displayName,
          ageBand: m.ageBand,
        })),
      notice:
        "FamilyFlow shows parents activity inside this app only. A parent reviews requests and completions.",
    };
  }

  async listMissions(auth: AuthContext) {
    const household = await this.requireHousehold(auth);
    return this.repo.listMissions(household.id);
  }

  async generateMission(auth: AuthContext, body: unknown) {
    const household = await this.requireHousehold(auth);
    await this.requireParent(auth, household);
    if (!household.settings.featureFlags.ai) throw Errors.featureDisabled("ai");
    const input = generateMissionSchema.parse(body ?? {});
    const ageBands = input.ageBands ?? (["7-12"] as AgeBand[]);

    let plan: AdventurePlan;
    let origin: "bedrock" | "curated" = "curated";

    if (this.config.bedrockEnabled) {
      try {
        const { BedrockRuntimeClient, ConverseCommand } = await import(
          "@aws-sdk/client-bedrock-runtime"
        );
        const client = new BedrockRuntimeClient({ region: this.config.bedrockRegion });
        const prompt = [
          "Return ONLY JSON matching: title, ageBands, estimatedMinutes, materials, steps, safetyNotes, parentApprovalRequired=true.",
          "No purchases, danger, location sharing, or inappropriate content.",
          `Category: ${input.promptCategory}`,
          `Age bands: ${ageBands.join(",")}`,
        ].join("\n");
        const resp = await client.send(
          new ConverseCommand({
            modelId: this.config.bedrockModelId,
            messages: [{ role: "user", content: [{ text: prompt }] }],
          }),
        );
        const text = resp.output?.message?.content?.find((c) => "text" in c)?.text ?? "";
        const jsonStart = text.indexOf("{");
        const jsonEnd = text.lastIndexOf("}");
        const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        const checked = parseBedrockPlan(parsed);
        if (!checked.ok) throw new Error(checked.reason);
        plan = checked.plan;
        origin = "bedrock";
      } catch {
        const fallback = pickCuratedFallback(this.curated, ageBands);
        if (!fallback.ok) throw Errors.precondition(fallback.reason);
        plan = fallback.plan;
        origin = "curated";
      }
    } else {
      const fallback = pickCuratedFallback(this.curated, ageBands);
      if (!fallback.ok) throw Errors.precondition(fallback.reason);
      plan = fallback.plan;
      origin = "curated";
    }

    const now = new Date().toISOString();
    const mission: Mission = {
      id: randomUUID(),
      householdId: household.id,
      title: plan.title,
      description: plan.steps.join(" "),
      ageBands: plan.ageBands,
      estimatedMinutes: plan.estimatedMinutes,
      status: "draft",
      origin,
      materials: plan.materials,
      steps: plan.steps,
      safetyNotes: plan.safetyNotes,
      parentApprovalRequired: true,
      createdAt: now,
      updatedAt: now,
    };
    // AI suggestions remain draft until parent publishes/approves into library.
    await this.repo.putMission({ ...mission, status: "available" });
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: auth.sub,
        actorType: "parent",
        eventType: "mission.generated",
        entityId: mission.id,
        metadata: { origin, promptCategory: input.promptCategory },
      }),
    );
    return { mission: { ...mission, status: "available" as const }, origin, labeled: origin === "bedrock" ? "AI-generated (parent review required before child play)" : "Curated fallback library" };
  }

  async requestMission(auth: AuthContext | null, missionId: string, body: unknown, opts?: { householdId?: string; actorType?: "child" | "alexa" | "device" }) {
    const input = requestMissionSchema.parse(body);
    let household: Household;
    if (auth) {
      household = await this.requireHousehold(auth);
    } else if (opts?.householdId) {
      const h = await this.repo.getHousehold(opts.householdId);
      if (!h) throw Errors.notFound("Household");
      household = h;
    } else {
      throw Errors.unauthorized();
    }

    const existing = await this.idem.get<{ request: MissionRequest }>(household.id, input.idempotencyKey);
    if (existing) return existing;

    const member = await this.repo.getMember(household.id, input.memberId);
    if (!member || !member.active) throw Errors.notFound("Member");
    requireChildVisibilityNotice(member);

    const mission = await this.repo.getMission(household.id, missionId);
    if (!mission) throw Errors.notFound("Mission");
    assertMissionRequestable(mission.status);

    const now = new Date().toISOString();
    const request: MissionRequest = {
      id: randomUUID(),
      householdId: household.id,
      memberId: member.id,
      missionId,
      source: input.source,
      status: "pending",
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      decidedAt: null,
      decidedBy: null,
    };
    await this.repo.putRequest(request);
    await this.repo.updateMissionStatus(household.id, missionId, "requested");
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: member.id,
        actorType: opts?.actorType ?? (input.source === "alexa" ? "alexa" : "child"),
        eventType: "mission.requested",
        entityId: request.id,
        metadata: { missionId, requestId: request.id, source: input.source },
      }),
    );
    const response = { request };
    try {
      await this.idem.put(household.id, input.idempotencyKey, response);
    } catch {
      /* race: another writer won; re-read */
      const again = await this.idem.get<{ request: MissionRequest }>(household.id, input.idempotencyKey);
      if (again) return again;
    }
    return response;
  }

  async listApprovals(auth: AuthContext) {
    const household = await this.requireHousehold(auth);
    await this.requireParent(auth, household);
    return this.repo.listPendingApprovals(household.id);
  }

  async decideApproval(auth: AuthContext, requestId: string, body: unknown) {
    const household = await this.requireHousehold(auth);
    const parent = await this.requireParent(auth, household);
    const input = approvalDecisionSchema.parse(body);

    const cached = await this.idem.get(household.id, input.idempotencyKey);
    if (cached) return cached;

    const current = await this.repo.getRequest(household.id, requestId);
    if (!current) throw Errors.notFound("MissionRequest");
    applyRequestDecision(current.status, input.decision);

    const updated = await this.repo.decideRequest(
      household.id,
      requestId,
      input.decision,
      parent.id,
    );
    const missionStatus = missionStatusAfterRequestDecision(updated.status);
    await this.repo.updateMissionStatus(household.id, updated.missionId, missionStatus);
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: parent.id,
        actorType: "parent",
        eventType: "mission.request_decided",
        entityId: requestId,
        metadata: {
          missionId: updated.missionId,
          requestId,
          decision: input.decision,
        },
      }),
    );
    const response = { request: updated, missionStatus };
    await this.idem.put(household.id, input.idempotencyKey, response).catch(() => undefined);
    return response;
  }

  async requestCompletion(auth: AuthContext | null, missionId: string, body: unknown, opts?: { householdId?: string }) {
    const input = completionRequestSchema.parse(body);
    let household: Household;
    if (auth) household = await this.requireHousehold(auth);
    else if (opts?.householdId) {
      const h = await this.repo.getHousehold(opts.householdId);
      if (!h) throw Errors.notFound("Household");
      household = h;
    } else throw Errors.unauthorized();

    const cached = await this.idem.get(household.id, input.idempotencyKey);
    if (cached) return cached;

    const member = await this.repo.getMember(household.id, input.memberId);
    if (!member) throw Errors.notFound("Member");
    const mission = await this.repo.getMission(household.id, missionId);
    if (!mission) throw Errors.notFound("Mission");
    assertMissionCompletable(mission.status);

    const pending = await this.repo.listPendingApprovals(household.id);
    const related = pending.requests.find((r) => r.missionId === missionId && r.status === "approved");
    // Find approved request for this mission
    const allMissions = await this.repo.listMissions(household.id);
    void allMissions;
    void related;

    const now = new Date().toISOString();
    const completion: Completion = {
      id: randomUUID(),
      householdId: household.id,
      missionId,
      missionRequestId: "unknown",
      requestedBy: member.id,
      approvedBy: null,
      status: "pending",
      pointsAwarded: 0,
      createdAt: now,
      decidedAt: null,
    };
    await this.repo.putCompletion(completion);
    await this.repo.updateMissionStatus(household.id, missionId, "completion_requested");
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: member.id,
        actorType: "child",
        eventType: "mission.completion_requested",
        entityId: completion.id,
        metadata: { missionId, completionId: completion.id },
      }),
    );
    const response = { completion };
    await this.idem.put(household.id, input.idempotencyKey, response).catch(() => undefined);
    return response;
  }

  async decideCompletion(auth: AuthContext, completionId: string, body: unknown) {
    const household = await this.requireHousehold(auth);
    const parent = await this.requireParent(auth, household);
    const input = completionDecisionSchema.parse(body);

    const cached = await this.idem.get(household.id, input.idempotencyKey);
    if (cached) return cached;

    const current = await this.repo.getCompletion(household.id, completionId);
    if (!current) throw Errors.notFound("Completion");
    applyCompletionDecision(current.status, input.decision);

    const award =
      input.decision === "approved"
        ? computePointsAward({
            alreadyAwarded: current.pointsAwarded,
            pointsPerCompletion: this.config.pointsPerCompletion,
          })
        : { points: 0, nextTotalDelta: 0 };

    const updated = await this.repo.decideCompletionAwardPoints({
      householdId: household.id,
      completionId,
      decision: input.decision,
      approvedBy: parent.id,
      points: award.points,
    });

    let totalPoints = await this.repo.getPoints(household.id);
    const unlocked: Array<{ points: number; title: string }> = [];
    if (input.decision === "approved" && award.nextTotalDelta > 0) {
      totalPoints = await this.repo.addPoints(household.id, award.nextTotalDelta);
      const newly = rewardUnlocked(totalPoints, [...DEFAULT_REWARD_THRESHOLDS]);
      const existing = await this.repo.listRewards(household.id);
      for (const r of newly) {
        if (existing.some((e) => e.title === r.title)) continue;
        const reward = {
          id: randomUUID(),
          householdId: household.id,
          points: r.points,
          title: r.title,
          redemptionStatus: "unlocked" as const,
          createdAt: new Date().toISOString(),
        };
        await this.repo.putReward(reward);
        unlocked.push(r);
      }
    }

    const missionStatus = missionStatusAfterCompletionDecision(updated.status);
    await this.repo.updateMissionStatus(household.id, updated.missionId, missionStatus);
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: parent.id,
        actorType: "parent",
        eventType: "mission.completion_decided",
        entityId: completionId,
        metadata: {
          missionId: updated.missionId,
          completionId,
          decision: input.decision,
          points: updated.pointsAwarded,
        },
      }),
    );

    const response = { completion: updated, totalPoints, unlockedRewards: unlocked, missionStatus };
    await this.idem.put(household.id, input.idempotencyKey, response).catch(() => undefined);
    return response;
  }

  async listRewards(auth: AuthContext) {
    const household = await this.requireHousehold(auth);
    const rewards = await this.repo.listRewards(household.id);
    const points = await this.repo.getPoints(household.id);
    return { points, rewards };
  }

  async listAuditEvents(auth: AuthContext) {
    const household = await this.requireHousehold(auth);
    await this.requireParent(auth, household);
    return this.repo.listAuditEvents(household.id);
  }

  async getSettings(auth: AuthContext) {
    const household = await this.requireHousehold(auth);
    await this.requireParent(auth, household);
    return {
      settings: household.settings,
      privacyNotice:
        "FamilyFlow shows parents activity that happens inside FamilyFlow only (missions, approvals, Alexa FamilyFlow skill requests, rewards). It does not access unrelated Alexa conversations, Amazon purchase history, third-party Fire TV apps, or other device telemetry. This is not a legal certification claim.",
      retention: household.settings.retentionDays,
    };
  }

  async patchSettings(auth: AuthContext, body: unknown) {
    const household = await this.requireHousehold(auth);
    await this.requireParent(auth, household);
    const input = patchSettingsSchema.parse(body ?? {});
    const settings = {
      ...household.settings,
      featureFlags: { ...household.settings.featureFlags, ...input.featureFlags },
      parentalVisibilityNoticeEnabled:
        input.parentalVisibilityNoticeEnabled ?? household.settings.parentalVisibilityNoticeEnabled,
      notifications: { ...household.settings.notifications, ...input.notifications },
    };
    const updated = await this.repo.updateSettings(household.id, settings);
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: auth.sub,
        actorType: "parent",
        eventType: "settings.updated",
        entityId: household.id,
        metadata: { feature: "settings" },
      }),
    );
    return updated.settings;
  }

  async exportData(auth: AuthContext) {
    const household = await this.requireHousehold(auth);
    await this.requireParent(auth, household);
    const items = await this.repo.exportHousehold(household.id);
    await this.repo.putAudit(
      buildAuditEvent({
        householdId: household.id,
        actorId: auth.sub,
        actorType: "parent",
        eventType: "data.exported",
        entityId: household.id,
      }),
    );
    return {
      exportedAt: new Date().toISOString(),
      householdId: household.id,
      itemCount: items.length,
      items,
    };
  }

  async deleteRequest(auth: AuthContext) {
    const household = await this.requireHousehold(auth);
    await this.requireParent(auth, household);
    const deleted = await this.repo.deleteHouseholdData(household.id, auth.sub);
    return {
      deleted,
      message:
        "Household data deleted from FamilyFlow. Cognito account deletion must be completed separately in the identity provider if desired.",
    };
  }

  /** Alexa / device helper: resolve household by paired device or linked skill token subject. */
  async getHouseholdIdForOwner(ownerSub: string): Promise<string | null> {
    return this.repo.getHouseholdLink(ownerSub);
  }
}
