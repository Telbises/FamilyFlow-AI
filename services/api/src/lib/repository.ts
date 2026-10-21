import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import {
  ENTITY_TYPES,
  Errors,
  Keys,
  type AuditEvent,
  type Completion,
  type DeviceSession,
  type Household,
  type Member,
  type Mission,
  type MissionRequest,
  type Reward,
} from "@familyflow/shared";

export class FamilyFlowRepository {
  constructor(
    private readonly doc: DynamoDBDocumentClient,
    private readonly tableName: string,
  ) {}

  async putHousehold(household: Household, ownerSub: string): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: Keys.householdPk(household.id),
          SK: Keys.householdMetaSk(),
          entityType: ENTITY_TYPES.Household,
          ...household,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: Keys.userPk(ownerSub),
          SK: Keys.userHouseholdLinkSk(),
          entityType: ENTITY_TYPES.UserLink,
          householdId: household.id,
          ownerId: ownerSub,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }

  async getHouseholdLink(ownerSub: string): Promise<string | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: Keys.userPk(ownerSub), SK: Keys.userHouseholdLinkSk() },
      }),
    );
    return (res.Item?.householdId as string | undefined) ?? null;
  }

  async getHousehold(householdId: string): Promise<Household | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.householdMetaSk() },
      }),
    );
    if (!res.Item) return null;
    return this.stripKeys(res.Item) as Household;
  }

  async putMember(member: Member): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: Keys.householdPk(member.householdId),
          SK: Keys.memberSk(member.id),
          entityType: ENTITY_TYPES.Member,
          ...member,
        },
      }),
    );
  }

  async getMember(householdId: string, memberId: string): Promise<Member | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.memberSk(memberId) },
      }),
    );
    if (!res.Item) return null;
    return this.stripKeys(res.Item) as Member;
  }

  async listMembers(householdId: string): Promise<Member[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": Keys.householdPk(householdId),
          ":sk": "MEMBER#",
        },
      }),
    );
    return (res.Items ?? []).map((i) => this.stripKeys(i) as Member);
  }

  async findParentMember(householdId: string, ownerSub: string): Promise<Member | null> {
    const members = await this.listMembers(householdId);
    return members.find((m) => m.role === "parent" && m.id === ownerSub) ??
      members.find((m) => m.role === "parent" && m.active) ??
      null;
  }

  async putMission(mission: Mission): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: Keys.householdPk(mission.householdId),
          SK: Keys.missionSk(mission.id),
          entityType: ENTITY_TYPES.Mission,
          ...mission,
        },
      }),
    );
  }

  async getMission(householdId: string, missionId: string): Promise<Mission | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.missionSk(missionId) },
      }),
    );
    if (!res.Item) return null;
    return this.stripKeys(res.Item) as Mission;
  }

  async listMissions(householdId: string): Promise<Mission[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": Keys.householdPk(householdId),
          ":sk": "MISSION#",
        },
      }),
    );
    return (res.Items ?? []).map((i) => this.stripKeys(i) as Mission);
  }

  async updateMissionStatus(householdId: string, missionId: string, status: Mission["status"]): Promise<void> {
    await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.missionSk(missionId) },
        UpdateExpression: "SET #s = :s, updatedAt = :u",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":s": status, ":u": new Date().toISOString() },
        ConditionExpression: "attribute_exists(PK)",
      }),
    );
  }

  async putRequest(request: MissionRequest): Promise<void> {
    const pending =
      request.status === "pending"
        ? {
            GSI1PK: Keys.pendingGsi1Pk(request.householdId),
            GSI1SK: Keys.pendingRequestSk(request.createdAt, request.id),
          }
        : {};
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: Keys.householdPk(request.householdId),
          SK: Keys.requestSk(request.id),
          entityType: ENTITY_TYPES.MissionRequest,
          ...request,
          ...pending,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }

  async getRequest(householdId: string, requestId: string): Promise<MissionRequest | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.requestSk(requestId) },
      }),
    );
    if (!res.Item) return null;
    return this.stripKeys(res.Item) as MissionRequest;
  }

  async decideRequest(
    householdId: string,
    requestId: string,
    status: "approved" | "rejected",
    decidedBy: string,
  ): Promise<MissionRequest> {
    const now = new Date().toISOString();
    try {
      const res = await this.doc.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { PK: Keys.householdPk(householdId), SK: Keys.requestSk(requestId) },
          UpdateExpression:
            "SET #s = :s, decidedAt = :d, decidedBy = :by REMOVE GSI1PK, GSI1SK",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: {
            ":s": status,
            ":d": now,
            ":by": decidedBy,
            ":pending": "pending",
          },
          ConditionExpression: "attribute_exists(PK) AND #s = :pending",
          ReturnValues: "ALL_NEW",
        }),
      );
      return this.stripKeys(res.Attributes!) as MissionRequest;
    } catch (e: unknown) {
      if ((e as { name?: string }).name === "ConditionalCheckFailedException") {
        throw Errors.conflict("Request already decided or missing");
      }
      throw e;
    }
  }

  async listPendingApprovals(householdId: string): Promise<{
    requests: MissionRequest[];
    completions: Completion[];
  }> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": Keys.pendingGsi1Pk(householdId) },
      }),
    );
    const requests: MissionRequest[] = [];
    const completions: Completion[] = [];
    for (const item of res.Items ?? []) {
      if (item.entityType === ENTITY_TYPES.MissionRequest) {
        requests.push(this.stripKeys(item) as MissionRequest);
      } else if (item.entityType === ENTITY_TYPES.Completion) {
        completions.push(this.stripKeys(item) as Completion);
      }
    }
    return { requests, completions };
  }

  async putCompletion(completion: Completion): Promise<void> {
    const pending =
      completion.status === "pending"
        ? {
            GSI1PK: Keys.pendingGsi1Pk(completion.householdId),
            GSI1SK: Keys.pendingCompletionSk(completion.createdAt, completion.id),
          }
        : {};
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: Keys.householdPk(completion.householdId),
          SK: Keys.completionSk(completion.id),
          entityType: ENTITY_TYPES.Completion,
          ...completion,
          ...pending,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }

  async getCompletion(householdId: string, completionId: string): Promise<Completion | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.completionSk(completionId) },
      }),
    );
    if (!res.Item) return null;
    return this.stripKeys(res.Item) as Completion;
  }

  async decideCompletionAwardPoints(params: {
    householdId: string;
    completionId: string;
    decision: "approved" | "rejected";
    approvedBy: string;
    points: number;
  }): Promise<Completion> {
    const now = new Date().toISOString();
    try {
      const res = await this.doc.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: {
            PK: Keys.householdPk(params.householdId),
            SK: Keys.completionSk(params.completionId),
          },
          UpdateExpression:
            "SET #s = :s, decidedAt = :d, approvedBy = :by, pointsAwarded = :pts REMOVE GSI1PK, GSI1SK",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: {
            ":s": params.decision,
            ":d": now,
            ":by": params.approvedBy,
            ":pts": params.decision === "approved" ? params.points : 0,
            ":pending": "pending",
            ":zero": 0,
          },
          ConditionExpression:
            "attribute_exists(PK) AND #s = :pending AND pointsAwarded = :zero",
          ReturnValues: "ALL_NEW",
        }),
      );
      return this.stripKeys(res.Attributes!) as Completion;
    } catch (e: unknown) {
      if ((e as { name?: string }).name === "ConditionalCheckFailedException") {
        throw Errors.conflict("Completion already decided or points already awarded");
      }
      throw e;
    }
  }

  async addPoints(householdId: string, delta: number): Promise<number> {
    const res = await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.pointsSk() },
        UpdateExpression:
          "SET totalPoints = if_not_exists(totalPoints, :z) + :d, updatedAt = :u, entityType = :e, householdId = :h",
        ExpressionAttributeValues: {
          ":z": 0,
          ":d": delta,
          ":u": new Date().toISOString(),
          ":e": ENTITY_TYPES.Points,
          ":h": householdId,
        },
        ReturnValues: "ALL_NEW",
      }),
    );
    return Number(res.Attributes?.totalPoints ?? 0);
  }

  async getPoints(householdId: string): Promise<number> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.pointsSk() },
      }),
    );
    return Number(res.Item?.totalPoints ?? 0);
  }

  async putReward(reward: Reward): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: Keys.householdPk(reward.householdId),
          SK: Keys.rewardSk(reward.id),
          entityType: ENTITY_TYPES.Reward,
          ...reward,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }

  async listRewards(householdId: string): Promise<Reward[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": Keys.householdPk(householdId),
          ":sk": "REWARD#",
        },
      }),
    );
    return (res.Items ?? []).map((i) => this.stripKeys(i) as Reward);
  }

  async putDeviceSession(session: DeviceSession, pairingHash: string | null): Promise<void> {
    const gsi =
      pairingHash && !session.pairedAt
        ? {
            GSI2PK: Keys.pairingGsi2Pk(pairingHash),
            GSI2SK: Keys.pairingGsi2Sk(session.id),
          }
        : {};
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: Keys.householdPk(session.householdId),
          SK: Keys.deviceSk(session.id),
          entityType: ENTITY_TYPES.DeviceSession,
          ...session,
          ...gsi,
        },
      }),
    );
    await this.putDeviceIndex(session.id, session.householdId);
  }

  async getDeviceSession(householdId: string, sessionId: string): Promise<DeviceSession | null> {
    const res = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.deviceSk(sessionId) },
      }),
    );
    if (!res.Item) return null;
    return this.stripKeys(res.Item) as DeviceSession;
  }

  async findSessionByPairingHash(pairingHash: string): Promise<(DeviceSession & { householdId: string }) | null> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk",
        ExpressionAttributeValues: { ":pk": Keys.pairingGsi2Pk(pairingHash) },
        Limit: 1,
      }),
    );
    const item = res.Items?.[0];
    if (!item) return null;
    return this.stripKeys(item) as DeviceSession & { householdId: string };
  }

  async markDevicePaired(
    householdId: string,
    sessionId: string,
    sessionTokenHash: string,
    label: string,
  ): Promise<DeviceSession> {
    const now = new Date().toISOString();
    const res = await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.deviceSk(sessionId) },
        UpdateExpression:
          "SET pairedAt = :p, pairingHash = :n, sessionTokenHash = :th, label = :l REMOVE GSI2PK, GSI2SK",
        ExpressionAttributeValues: { ":p": now, ":n": null, ":th": sessionTokenHash, ":l": label },
        ConditionExpression: "attribute_exists(PK) AND attribute_not_exists(pairedAt)",
        ReturnValues: "ALL_NEW",
      }),
    );
    return this.stripKeys(res.Attributes!) as DeviceSession;
  }

  async findDeviceSessionById(sessionId: string): Promise<(DeviceSession & { householdId: string }) | null> {
    const idx = await this.doc.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { PK: `DEVICEIDX#${sessionId}`, SK: "META" },
      }),
    );
    const householdId = idx.Item?.householdId as string | undefined;
    if (!householdId) return null;
    const session = await this.getDeviceSession(householdId, sessionId);
    if (!session) return null;
    return { ...session, householdId };
  }

  async putDeviceIndex(sessionId: string, householdId: string): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `DEVICEIDX#${sessionId}`,
          SK: "META",
          entityType: "DeviceIndex",
          sessionId,
          householdId,
        },
      }),
    );
  }

  async putAudit(event: AuditEvent): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: Keys.householdPk(event.householdId),
          SK: Keys.auditSk(event.timestamp, event.id),
          entityType: ENTITY_TYPES.AuditEvent,
          ...event,
        },
      }),
    );
  }

  async listAuditEvents(householdId: string, limit = 50): Promise<AuditEvent[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": Keys.householdPk(householdId),
          ":sk": "AUDIT#",
        },
        ScanIndexForward: false,
        Limit: limit,
      }),
    );
    return (res.Items ?? []).map((i) => this.stripKeys(i) as AuditEvent);
  }

  async updateSettings(householdId: string, settings: Household["settings"]): Promise<Household> {
    const res = await this.doc.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { PK: Keys.householdPk(householdId), SK: Keys.householdMetaSk() },
        UpdateExpression: "SET settings = :s",
        ExpressionAttributeValues: { ":s": settings },
        ConditionExpression: "attribute_exists(PK)",
        ReturnValues: "ALL_NEW",
      }),
    );
    return this.stripKeys(res.Attributes!) as Household;
  }

  async exportHousehold(householdId: string): Promise<Record<string, unknown>[]> {
    const res = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": Keys.householdPk(householdId) },
      }),
    );
    return (res.Items ?? []).map((i) => this.stripKeys(i));
  }

  async deleteHouseholdData(householdId: string, ownerSub: string): Promise<number> {
    let deleted = 0;
    const raw = await this.doc.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": Keys.householdPk(householdId) },
        ProjectionExpression: "PK, SK",
      }),
    );
    for (const item of raw.Items ?? []) {
      await this.doc.send(
        new DeleteCommand({
          TableName: this.tableName,
          Key: { PK: item.PK, SK: item.SK },
        }),
      );
      deleted += 1;
    }
    await this.doc.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { PK: Keys.userPk(ownerSub), SK: Keys.userHouseholdLinkSk() },
      }),
    );
    return deleted;
  }

  private stripKeys(item: Record<string, unknown>): Record<string, unknown> {
    const {
      PK: _pk,
      SK: _sk,
      GSI1PK: _g1,
      GSI1SK: _g1s,
      GSI2PK: _g2,
      GSI2SK: _g2s,
      entityType: _e,
      ...rest
    } = item;
    return rest;
  }
}
