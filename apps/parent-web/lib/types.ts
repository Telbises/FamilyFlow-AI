/**
 * Wire types for the FamilyFlow API (mirrors @familyflow/shared).
 * Kept local so the Next.js bundle does not depend on the NodeNext-built workspace packages.
 */

export const AGE_BANDS = ["3-6", "7-12", "13-17"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export type MemberRole = "parent" | "child";
export type MissionStatus =
  | "draft"
  | "available"
  | "requested"
  | "approved"
  | "rejected"
  | "in_progress"
  | "completion_requested"
  | "completed";
export type Decision = "approved" | "rejected";
export type RequestSource = "fire_tv" | "alexa" | "parent_web";
export type ActorType = "parent" | "child" | "device" | "alexa" | "system";
export type PromptCategory =
  | "indoor"
  | "outdoor"
  | "creative"
  | "kitchen"
  | "movement"
  | "calm";

export interface FeatureFlags {
  voice: boolean;
  ai: boolean;
  rewards: boolean;
  devicePairing: boolean;
}

export interface HouseholdSettings {
  featureFlags: FeatureFlags;
  retentionDays: { audit: number; requests: number };
  parentalVisibilityNoticeEnabled: boolean;
  notifications: { inAppPolling: boolean; emailAlerts: boolean };
}

export interface Household {
  id: string;
  ownerId: string;
  timezone: string;
  settings: HouseholdSettings;
  createdAt: string;
}

export interface Member {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: AgeBand | null;
  role: MemberRole;
  active: boolean;
  visibilityNoticeAcknowledgedAt: string | null;
  createdAt: string;
}

export interface CurrentHousehold {
  household: Household;
  members: Member[];
  points: number;
}

export interface Mission {
  id: string;
  householdId: string;
  title: string;
  description: string;
  ageBands: AgeBand[];
  estimatedMinutes: number;
  status: MissionStatus;
  origin: "curated" | "bedrock";
  materials?: string[];
  steps?: string[];
  safetyNotes?: string[];
  parentApprovalRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MissionRequest {
  id: string;
  householdId: string;
  memberId: string;
  missionId: string;
  source: RequestSource;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
}

export interface Completion {
  id: string;
  householdId: string;
  missionId: string;
  missionRequestId: string;
  requestedBy: string;
  approvedBy: string | null;
  status: "pending" | "approved" | "rejected";
  pointsAwarded: number;
  createdAt: string;
  decidedAt: string | null;
}

export interface Approvals {
  requests: MissionRequest[];
  completions: Completion[];
}

export interface Reward {
  id: string;
  householdId: string;
  points: number;
  title: string;
  redemptionStatus: "available" | "unlocked" | "redeemed";
  createdAt: string;
}

export interface RewardsResponse {
  points: number;
  rewards: Reward[];
}

export interface AuditEvent {
  id: string;
  householdId: string;
  actorId: string;
  actorType: ActorType;
  eventType: string;
  entityId: string;
  timestamp: string;
  correlationId: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface SettingsResponse {
  settings: HouseholdSettings;
  privacyNotice: string;
  retention: { audit: number; requests: number };
}

export interface SettingsPatch {
  featureFlags?: Partial<FeatureFlags>;
  parentalVisibilityNoticeEnabled?: boolean;
  notifications?: Partial<HouseholdSettings["notifications"]>;
}

export interface PairingCode {
  sessionId: string;
  code: string;
  expiresAt: string;
}

export interface GenerateMissionResult {
  mission: Mission;
  origin: "curated" | "bedrock";
  labeled: string;
}

export interface RequestDecisionResult {
  request: MissionRequest;
  missionStatus: MissionStatus;
}

export interface CompletionDecisionResult {
  completion: Completion;
  totalPoints: number;
  unlockedRewards: Array<{ points: number; title: string }>;
  missionStatus: MissionStatus;
}

export interface ExportResult {
  exportedAt: string;
  householdId: string;
  itemCount: number;
  items: Record<string, unknown>[];
}

export interface DeleteResult {
  deleted: number;
  message: string;
}
