import { z } from "zod";
import { AGE_BANDS, REQUEST_SOURCES } from "./types.js";

export const ageBandSchema = z.enum(AGE_BANDS);

export const adventurePlanSchema = z.object({
  title: z.string().min(3).max(120),
  ageBands: z.array(ageBandSchema).min(1),
  estimatedMinutes: z.number().int().min(5).max(180),
  materials: z.array(z.string().max(120)).max(20),
  steps: z.array(z.string().max(400)).min(2).max(15),
  safetyNotes: z.array(z.string().max(240)).min(1).max(10),
  parentApprovalRequired: z.literal(true),
});

export const createHouseholdSchema = z.object({
  timezone: z.string().min(1).max(64).default("America/Los_Angeles"),
});

export const createMemberSchema = z.object({
  displayName: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[\p{L}\p{N} .'-]+$/u, "Display name has invalid characters"),
  ageBand: ageBandSchema.optional(),
  role: z.enum(["parent", "child"]),
  visibilityNoticeAcknowledged: z.boolean().optional(),
});

export const pairingCodeResponseSchema = z.object({
  sessionId: z.string().uuid(),
  code: z.string().length(6),
  expiresAt: z.string().datetime(),
});

export const pairDeviceSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
  label: z.string().min(1).max(40).default("Family TV"),
});

export const requestMissionSchema = z.object({
  memberId: z.string().uuid(),
  source: z.enum(REQUEST_SOURCES),
  idempotencyKey: z.string().min(8).max(128),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  idempotencyKey: z.string().min(8).max(128),
});

export const completionRequestSchema = z.object({
  memberId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(128),
});

export const completionDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  idempotencyKey: z.string().min(8).max(128),
});

export const generateMissionSchema = z.object({
  promptCategory: z
    .enum(["indoor", "outdoor", "creative", "kitchen", "movement", "calm"])
    .default("indoor"),
  ageBands: z.array(ageBandSchema).min(1).optional(),
});

export const patchSettingsSchema = z.object({
  featureFlags: z
    .object({
      voice: z.boolean().optional(),
      ai: z.boolean().optional(),
      rewards: z.boolean().optional(),
      devicePairing: z.boolean().optional(),
    })
    .optional(),
  parentalVisibilityNoticeEnabled: z.boolean().optional(),
  notifications: z
    .object({
      inAppPolling: z.boolean().optional(),
      emailAlerts: z.boolean().optional(),
    })
    .optional(),
});

/** Blocklist for Bedrock / curated safety. */
export const UNSAFE_CONTENT_PATTERNS = [
  /\b(knife|knives|blade|fire\s*work|explosive|weapon|gun|alcohol|drug|suicide)\b/i,
  /\b(buy|purchase|amazon\.com|order\s+now|credit\s*card)\b/i,
  /\b(share\s+location|gps|meet\s+a\s+stranger|go\s+outside\s+alone\s+at\s+night)\b/i,
  /\b(dare|extreme\s+challenge|hold\s+your\s+breath)\b/i,
];

export function containsUnsafeContent(text: string): boolean {
  return UNSAFE_CONTENT_PATTERNS.some((re) => re.test(text));
}

export function validateAdventurePlan(input: unknown) {
  const parsed = adventurePlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error };
  }
  const blob = JSON.stringify(parsed.data);
  if (containsUnsafeContent(blob)) {
    return { ok: false as const, error: new Error("Safety check failed") };
  }
  return { ok: true as const, data: parsed.data };
}
