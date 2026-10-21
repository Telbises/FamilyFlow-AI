/**
 * Runtime configuration.
 *
 * NEXT_PUBLIC_* variables are inlined into the browser bundle at build time,
 * so they must be referenced with the literal `process.env.NEXT_PUBLIC_…` form.
 */

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:3100"
).replace(/\/+$/, "");

/**
 * ⚠️  LOCAL DEMO ONLY ⚠️
 *
 * The local API (ALLOW_LOCAL_DEV_AUTH=true) accepts `Authorization: Bearer local:<ownerSub>`
 * with no password. This is a development bypass for hackathon demos on a developer machine.
 * It is NOT authentication. Never deploy this to a shared host, and replace it with
 * Cognito (Hosted UI / PKCE) tokens before any real use.
 */
export const LOCAL_PARENT_TOKEN =
  process.env.NEXT_PUBLIC_LOCAL_PARENT_TOKEN || "local:local-parent-001";

/**
 * Reward ladder — mirrors DEFAULT_REWARD_THRESHOLDS in @familyflow/domain.
 * The API is the source of truth for what is actually unlocked; this is only
 * used to draw the progress path.
 */
export const REWARD_LADDER = [
  { points: 10, title: "Family High-Five Night" },
  { points: 30, title: "Pick the Weekend Adventure" },
  { points: 50, title: "Living Room Campout" },
] as const;
