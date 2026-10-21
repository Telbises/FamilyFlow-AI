/**
 * Single-table DynamoDB key design (household-scoped).
 *
 * PK / SK patterns:
 *  HOUSEHOLD#{householdId} / META
 *  HOUSEHOLD#{householdId} / MEMBER#{memberId}
 *  HOUSEHOLD#{householdId} / MISSION#{missionId}
 *  HOUSEHOLD#{householdId} / REQUEST#{requestId}
 *  HOUSEHOLD#{householdId} / COMPLETION#{completionId}
 *  HOUSEHOLD#{householdId} / REWARD#{rewardId}
 *  HOUSEHOLD#{householdId} / AUDIT#{timestamp}#{eventId}
 *  HOUSEHOLD#{householdId} / DEVICE#{sessionId}
 *  HOUSEHOLD#{householdId} / POINTS
 *  HOUSEHOLD#{householdId} / AI#{suggestionId}
 *  USER#{ownerSub} / HOUSEHOLD_LINK
 *
 * GSI1 (pending approvals):
 *  GSI1PK = HOUSEHOLD#{householdId}#PENDING
 *  GSI1SK = REQUEST#{createdAt}#{requestId} | COMPLETION#{createdAt}#{completionId}
 *
 * GSI2 (pairing code lookup while pending):
 *  GSI2PK = PAIRING#{pairingHash}
 *  GSI2SK = SESSION#{sessionId}
 */

export const Keys = {
  householdPk: (householdId: string) => `HOUSEHOLD#${householdId}`,
  householdMetaSk: () => `META`,
  memberSk: (memberId: string) => `MEMBER#${memberId}`,
  missionSk: (missionId: string) => `MISSION#${missionId}`,
  requestSk: (requestId: string) => `REQUEST#${requestId}`,
  completionSk: (completionId: string) => `COMPLETION#${completionId}`,
  rewardSk: (rewardId: string) => `REWARD#${rewardId}`,
  auditSk: (timestamp: string, eventId: string) => `AUDIT#${timestamp}#${eventId}`,
  deviceSk: (sessionId: string) => `DEVICE#${sessionId}`,
  pointsSk: () => `POINTS`,
  aiSk: (suggestionId: string) => `AI#${suggestionId}`,
  userPk: (ownerSub: string) => `USER#${ownerSub}`,
  userHouseholdLinkSk: () => `HOUSEHOLD_LINK`,
  pendingGsi1Pk: (householdId: string) => `HOUSEHOLD#${householdId}#PENDING`,
  pendingRequestSk: (createdAt: string, requestId: string) =>
    `REQUEST#${createdAt}#${requestId}`,
  pendingCompletionSk: (createdAt: string, completionId: string) =>
    `COMPLETION#${createdAt}#${completionId}`,
  pairingGsi2Pk: (pairingHash: string) => `PAIRING#${pairingHash}`,
  pairingGsi2Sk: (sessionId: string) => `SESSION#${sessionId}`,
} as const;

export const ENTITY_TYPES = {
  Household: "Household",
  Member: "Member",
  Mission: "Mission",
  MissionRequest: "MissionRequest",
  Completion: "Completion",
  Reward: "Reward",
  AuditEvent: "AuditEvent",
  DeviceSession: "DeviceSession",
  Points: "Points",
  AiSuggestion: "AiSuggestion",
  UserLink: "UserLink",
} as const;
