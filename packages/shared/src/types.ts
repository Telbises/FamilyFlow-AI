/** Core FamilyFlow domain types — household-scoped coordination only. */

export const AGE_BANDS = ["3-6", "7-12", "13-17"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const MEMBER_ROLES = ["parent", "child"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

export const MISSION_STATUSES = [
  "draft",
  "available",
  "requested",
  "approved",
  "rejected",
  "in_progress",
  "completion_requested",
  "completed",
] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const REQUEST_SOURCES = ["fire_tv", "alexa", "parent_web"] as const;
export type RequestSource = (typeof REQUEST_SOURCES)[number];

export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const COMPLETION_STATUSES = ["pending", "approved", "rejected"] as const;
export type CompletionStatus = (typeof COMPLETION_STATUSES)[number];

export const REWARD_REDEMPTION = ["available", "unlocked", "redeemed"] as const;
export type RewardRedemptionStatus = (typeof REWARD_REDEMPTION)[number];

export const ACTOR_TYPES = ["parent", "child", "device", "alexa", "system"] as const;
export type ActorType = (typeof ACTOR_TYPES)[number];

export const CONTENT_ORIGINS = ["curated", "bedrock"] as const;
export type ContentOrigin = (typeof CONTENT_ORIGINS)[number];

export interface Household {
  id: string;
  ownerId: string;
  timezone: string;
  settings: HouseholdSettings;
  createdAt: string;
}

export interface HouseholdSettings {
  featureFlags: FeatureFlags;
  retentionDays: {
    audit: number;
    requests: number;
  };
  /** Parent-controlled: show child-facing notice about FamilyFlow visibility. */
  parentalVisibilityNoticeEnabled: boolean;
  notifications: {
    inAppPolling: boolean;
    emailAlerts: boolean;
  };
}

export interface FeatureFlags {
  voice: boolean;
  ai: boolean;
  rewards: boolean;
  devicePairing: boolean;
}

export interface Member {
  id: string;
  householdId: string;
  displayName: string;
  ageBand: AgeBand | null;
  role: MemberRole;
  active: boolean;
  /** Age-appropriate notice acknowledged (required for child profiles). */
  visibilityNoticeAcknowledgedAt: string | null;
  createdAt: string;
}

export interface DeviceSession {
  id: string;
  householdId: string;
  /** SHA-256 hash of pairing code; plaintext never stored. */
  pairingHash: string | null;
  /** SHA-256 hash of post-pair session secret; plaintext returned once at pair time. */
  sessionTokenHash: string | null;
  pairedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  label: string;
}

export interface Mission {
  id: string;
  householdId: string;
  title: string;
  description: string;
  ageBands: AgeBand[];
  estimatedMinutes: number;
  status: MissionStatus;
  origin: ContentOrigin;
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
  status: RequestStatus;
  idempotencyKey: string;
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
  status: CompletionStatus;
  pointsAwarded: number;
  createdAt: string;
  decidedAt: string | null;
}

export interface Reward {
  id: string;
  householdId: string;
  points: number;
  title: string;
  /** Non-purchasable family reward unlocked by points. */
  redemptionStatus: RewardRedemptionStatus;
  createdAt: string;
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
  /** Never include child-identifying PII beyond opaque IDs. */
  metadata: Record<string, string | number | boolean | null>;
}

export interface AiSuggestion {
  id: string;
  householdId: string;
  promptCategory: string;
  generatedPlan: AdventurePlan;
  safetyStatus: "pending_review" | "approved" | "rejected" | "blocked";
  approvedBy: string | null;
  origin: ContentOrigin;
  createdAt: string;
}

export interface AdventurePlan {
  title: string;
  ageBands: AgeBand[];
  estimatedMinutes: number;
  materials: string[];
  steps: string[];
  safetyNotes: string[];
  parentApprovalRequired: true;
}

export interface HouseholdPoints {
  householdId: string;
  totalPoints: number;
  updatedAt: string;
}
