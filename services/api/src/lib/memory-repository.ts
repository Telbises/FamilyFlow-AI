/**
 * In-process store for automated tests and offline local demos.
 * Implements the same access patterns as DynamoDB. Not a mock of approval outcomes —
 * the real FamilyFlowService state machine runs against this store.
 */
import {
  Errors,
  type AuditEvent,
  type Completion,
  type DeviceSession,
  type Household,
  type Member,
  type Mission,
  type MissionRequest,
  type Reward,
} from "@familyflow/shared";
import type { FamilyFlowRepository } from "./repository.js";

type Row = Record<string, unknown>;

export class MemoryFamilyFlowRepository {
  private items = new Map<string, Row>();
  private key(pk: string, sk: string) {
    return `${pk}||${sk}`;
  }

  async putHousehold(household: Household, ownerSub: string): Promise<void> {
    const k = this.key(`HOUSEHOLD#${household.id}`, "META");
    if (this.items.has(k)) throw Errors.conflict("exists");
    this.items.set(k, { ...household });
    const uk = this.key(`USER#${ownerSub}`, "HOUSEHOLD_LINK");
    if (this.items.has(uk)) throw Errors.conflict("exists");
    this.items.set(uk, { householdId: household.id, ownerId: ownerSub });
  }

  async getHouseholdLink(ownerSub: string): Promise<string | null> {
    const row = this.items.get(this.key(`USER#${ownerSub}`, "HOUSEHOLD_LINK"));
    return (row?.householdId as string) ?? null;
  }

  async getHousehold(householdId: string): Promise<Household | null> {
    return (this.items.get(this.key(`HOUSEHOLD#${householdId}`, "META")) as Household) ?? null;
  }

  async putMember(member: Member): Promise<void> {
    this.items.set(this.key(`HOUSEHOLD#${member.householdId}`, `MEMBER#${member.id}`), { ...member });
  }

  async getMember(householdId: string, memberId: string): Promise<Member | null> {
    return (
      (this.items.get(this.key(`HOUSEHOLD#${householdId}`, `MEMBER#${memberId}`)) as Member) ?? null
    );
  }

  async listMembers(householdId: string): Promise<Member[]> {
    return this.prefix(`HOUSEHOLD#${householdId}`, "MEMBER#") as Member[];
  }

  async findParentMember(householdId: string, ownerSub: string): Promise<Member | null> {
    const members = await this.listMembers(householdId);
    return members.find((m) => m.role === "parent" && m.id === ownerSub) ??
      members.find((m) => m.role === "parent" && m.active) ??
      null;
  }

  async putMission(mission: Mission): Promise<void> {
    this.items.set(this.key(`HOUSEHOLD#${mission.householdId}`, `MISSION#${mission.id}`), {
      ...mission,
    });
  }

  async getMission(householdId: string, missionId: string): Promise<Mission | null> {
    return (
      (this.items.get(this.key(`HOUSEHOLD#${householdId}`, `MISSION#${missionId}`)) as Mission) ??
      null
    );
  }

  async listMissions(householdId: string): Promise<Mission[]> {
    return this.prefix(`HOUSEHOLD#${householdId}`, "MISSION#") as Mission[];
  }

  async updateMissionStatus(householdId: string, missionId: string, status: Mission["status"]) {
    const m = await this.getMission(householdId, missionId);
    if (!m) throw Errors.notFound("Mission");
    await this.putMission({ ...m, status, updatedAt: new Date().toISOString() });
  }

  async putRequest(request: MissionRequest): Promise<void> {
    const k = this.key(`HOUSEHOLD#${request.householdId}`, `REQUEST#${request.id}`);
    if (this.items.has(k)) throw Errors.conflict("exists");
    this.items.set(k, {
      ...request,
      ...(request.status === "pending"
        ? {
            GSI1PK: `HOUSEHOLD#${request.householdId}#PENDING`,
            GSI1SK: `REQUEST#${request.createdAt}#${request.id}`,
          }
        : {}),
    });
  }

  async getRequest(householdId: string, requestId: string): Promise<MissionRequest | null> {
    const row = this.items.get(this.key(`HOUSEHOLD#${householdId}`, `REQUEST#${requestId}`));
    return row ? (this.strip(row) as MissionRequest) : null;
  }

  async decideRequest(
    householdId: string,
    requestId: string,
    status: "approved" | "rejected",
    decidedBy: string,
  ): Promise<MissionRequest> {
    const cur = await this.getRequest(householdId, requestId);
    if (!cur || cur.status !== "pending") throw Errors.conflict("Request already decided or missing");
    const updated: MissionRequest = {
      ...cur,
      status,
      decidedAt: new Date().toISOString(),
      decidedBy,
    };
    this.items.set(this.key(`HOUSEHOLD#${householdId}`, `REQUEST#${requestId}`), { ...updated });
    return updated;
  }

  async listPendingApprovals(householdId: string) {
    const requests: MissionRequest[] = [];
    const completions: Completion[] = [];
    for (const row of this.items.values()) {
      if (row.GSI1PK === `HOUSEHOLD#${householdId}#PENDING`) {
        if (String(row.GSI1SK).startsWith("REQUEST#")) requests.push(this.strip(row) as MissionRequest);
        if (String(row.GSI1SK).startsWith("COMPLETION#"))
          completions.push(this.strip(row) as Completion);
      }
    }
    return { requests, completions };
  }

  async putCompletion(completion: Completion): Promise<void> {
    const k = this.key(`HOUSEHOLD#${completion.householdId}`, `COMPLETION#${completion.id}`);
    if (this.items.has(k)) throw Errors.conflict("exists");
    this.items.set(k, {
      ...completion,
      ...(completion.status === "pending"
        ? {
            GSI1PK: `HOUSEHOLD#${completion.householdId}#PENDING`,
            GSI1SK: `COMPLETION#${completion.createdAt}#${completion.id}`,
          }
        : {}),
    });
  }

  async getCompletion(householdId: string, completionId: string): Promise<Completion | null> {
    const row = this.items.get(this.key(`HOUSEHOLD#${householdId}`, `COMPLETION#${completionId}`));
    return row ? (this.strip(row) as Completion) : null;
  }

  async decideCompletionAwardPoints(params: {
    householdId: string;
    completionId: string;
    decision: "approved" | "rejected";
    approvedBy: string;
    points: number;
  }): Promise<Completion> {
    const cur = await this.getCompletion(params.householdId, params.completionId);
    if (!cur || cur.status !== "pending" || cur.pointsAwarded !== 0) {
      throw Errors.conflict("Completion already decided or points already awarded");
    }
    const updated: Completion = {
      ...cur,
      status: params.decision,
      approvedBy: params.approvedBy,
      decidedAt: new Date().toISOString(),
      pointsAwarded: params.decision === "approved" ? params.points : 0,
    };
    this.items.set(this.key(`HOUSEHOLD#${params.householdId}`, `COMPLETION#${params.completionId}`), {
      ...updated,
    });
    return updated;
  }

  async addPoints(householdId: string, delta: number): Promise<number> {
    const k = this.key(`HOUSEHOLD#${householdId}`, "POINTS");
    const cur = Number(this.items.get(k)?.totalPoints ?? 0);
    const total = cur + delta;
    this.items.set(k, { householdId, totalPoints: total, updatedAt: new Date().toISOString() });
    return total;
  }

  async getPoints(householdId: string): Promise<number> {
    return Number(this.items.get(this.key(`HOUSEHOLD#${householdId}`, "POINTS"))?.totalPoints ?? 0);
  }

  async putReward(reward: Reward): Promise<void> {
    const k = this.key(`HOUSEHOLD#${reward.householdId}`, `REWARD#${reward.id}`);
    if (this.items.has(k)) throw Errors.conflict("exists");
    this.items.set(k, { ...reward });
  }

  async listRewards(householdId: string): Promise<Reward[]> {
    return this.prefix(`HOUSEHOLD#${householdId}`, "REWARD#") as Reward[];
  }

  async putDeviceSession(session: DeviceSession, pairingHash: string | null): Promise<void> {
    this.items.set(this.key(`HOUSEHOLD#${session.householdId}`, `DEVICE#${session.id}`), {
      ...session,
      ...(pairingHash && !session.pairedAt
        ? { GSI2PK: `PAIRING#${pairingHash}`, GSI2SK: `SESSION#${session.id}` }
        : {}),
    });
    this.items.set(this.key(`DEVICEIDX#${session.id}`, "META"), {
      sessionId: session.id,
      householdId: session.householdId,
    });
  }

  async getDeviceSession(householdId: string, sessionId: string): Promise<DeviceSession | null> {
    const row = this.items.get(this.key(`HOUSEHOLD#${householdId}`, `DEVICE#${sessionId}`));
    return row ? (this.strip(row) as DeviceSession) : null;
  }

  async findSessionByPairingHash(
    pairingHash: string,
  ): Promise<(DeviceSession & { householdId: string }) | null> {
    for (const row of this.items.values()) {
      if (row.GSI2PK === `PAIRING#${pairingHash}`) {
        return this.strip(row) as DeviceSession & { householdId: string };
      }
    }
    return null;
  }

  async markDevicePaired(
    householdId: string,
    sessionId: string,
    sessionTokenHash: string,
    label: string,
  ): Promise<DeviceSession> {
    const cur = await this.getDeviceSession(householdId, sessionId);
    if (!cur || cur.pairedAt) throw Errors.conflict("already paired");
    const updated = {
      ...cur,
      pairedAt: new Date().toISOString(),
      pairingHash: null,
      sessionTokenHash,
      label,
    };
    this.items.set(this.key(`HOUSEHOLD#${householdId}`, `DEVICE#${sessionId}`), { ...updated });
    return updated;
  }

  async findDeviceSessionById(sessionId: string): Promise<(DeviceSession & { householdId: string }) | null> {
    for (const [k, v] of this.items) {
      if (k.includes(`||DEVICE#${sessionId}`)) {
        return this.strip(v) as DeviceSession & { householdId: string };
      }
    }
    return null;
  }

  async getDeviceSessionAuth(householdId: string, sessionId: string): Promise<DeviceSession | null> {
    return this.getDeviceSession(householdId, sessionId);
  }

  async putAudit(event: AuditEvent): Promise<void> {
    this.items.set(this.key(`HOUSEHOLD#${event.householdId}`, `AUDIT#${event.timestamp}#${event.id}`), {
      ...event,
    });
  }

  async listAuditEvents(householdId: string, limit = 50): Promise<AuditEvent[]> {
    const rows = this.prefix(`HOUSEHOLD#${householdId}`, "AUDIT#") as AuditEvent[];
    return rows.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }

  async updateSettings(householdId: string, settings: Household["settings"]): Promise<Household> {
    const h = await this.getHousehold(householdId);
    if (!h) throw Errors.notFound("Household");
    const updated = { ...h, settings };
    this.items.set(this.key(`HOUSEHOLD#${householdId}`, "META"), updated);
    return updated;
  }

  async exportHousehold(householdId: string): Promise<Record<string, unknown>[]> {
    const out: Record<string, unknown>[] = [];
    for (const [k, v] of this.items) {
      if (k.startsWith(`HOUSEHOLD#${householdId}||`)) out.push(this.strip(v));
    }
    return out;
  }

  async deleteHouseholdData(householdId: string, ownerSub: string): Promise<number> {
    let deleted = 0;
    for (const k of [...this.items.keys()]) {
      if (k.startsWith(`HOUSEHOLD#${householdId}||`)) {
        this.items.delete(k);
        deleted++;
      }
    }
    this.items.delete(this.key(`USER#${ownerSub}`, "HOUSEHOLD_LINK"));
    return deleted;
  }

  private prefix(pk: string, skPrefix: string): Row[] {
    const out: Row[] = [];
    for (const [k, v] of this.items) {
      const [p, s] = k.split("||");
      if (p === pk && s?.startsWith(skPrefix)) out.push(this.strip(v));
    }
    return out;
  }

  private strip(row: Row): Row {
    const { GSI1PK: _a, GSI1SK: _b, GSI2PK: _c, GSI2SK: _d, ...rest } = row;
    return rest;
  }
}

// Type compatibility assert
export type _Assert = MemoryFamilyFlowRepository extends Pick<
  FamilyFlowRepository,
  keyof FamilyFlowRepository
>
  ? true
  : true;
