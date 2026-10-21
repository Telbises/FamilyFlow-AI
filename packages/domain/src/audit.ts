import { randomUUID } from "node:crypto";
import type { ActorType, AuditEvent } from "@familyflow/shared";

const ALLOWED_METADATA_KEYS = new Set([
  "missionId",
  "requestId",
  "completionId",
  "source",
  "decision",
  "points",
  "feature",
  "origin",
  "status",
  "sessionId",
  "rewardId",
  "promptCategory",
  "safetyStatus",
]);

/** Strip any accidental PII-like keys from audit metadata. */
export function sanitizeAuditMetadata(
  metadata: Record<string, string | number | boolean | null>,
): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(k)) continue;
    if (typeof v === "string" && v.includes("@")) continue;
    out[k] = v;
  }
  return out;
}

export function buildAuditEvent(input: {
  householdId: string;
  actorId: string;
  actorType: ActorType;
  eventType: string;
  entityId: string;
  correlationId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  now?: Date;
}): AuditEvent {
  return {
    id: randomUUID(),
    householdId: input.householdId,
    actorId: input.actorId,
    actorType: input.actorType,
    eventType: input.eventType,
    entityId: input.entityId,
    timestamp: (input.now ?? new Date()).toISOString(),
    correlationId: input.correlationId ?? randomUUID(),
    metadata: sanitizeAuditMetadata(input.metadata ?? {}),
  };
}
