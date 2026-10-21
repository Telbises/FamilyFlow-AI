import type { ActorType, AgeBand, AuditEvent, Member, MissionStatus, RequestSource } from "./types";

export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const AGE_BAND_INFO: Record<AgeBand, { label: string; nickname: string }> = {
  "3-6": { label: "Ages 3–6", nickname: "Little explorers" },
  "7-12": { label: "Ages 7–12", nickname: "Trail finders" },
  "13-17": { label: "Ages 13–17", nickname: "Trailblazers" },
};

export const SOURCE_LABEL: Record<RequestSource, string> = {
  fire_tv: "Fire TV",
  alexa: "Alexa (FamilyFlow skill)",
  parent_web: "Parent dashboard",
};

export const ACTOR_LABEL: Record<ActorType, string> = {
  parent: "Parent",
  child: "Child",
  device: "Fire TV",
  alexa: "Alexa (FamilyFlow skill)",
  system: "System",
};

export const STATUS_LABEL: Record<MissionStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  available: { label: "In the library", tone: "green" },
  requested: { label: "Waiting for you", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Not this time", tone: "neutral" },
  in_progress: { label: "In progress", tone: "green" },
  completion_requested: { label: "Done? Check it", tone: "amber" },
  completed: { label: "Completed", tone: "green" },
};

export type BadgeTone = "neutral" | "green" | "amber" | "red";

const EVENT_LABELS: Record<string, string> = {
  "household.created": "Family space created",
  "member.created": "Profile added",
  "device.pairing_code_created": "TV pairing code created",
  "device.paired": "Fire TV paired",
  "mission.generated": "New adventure added to the library",
  "mission.requested": "Adventure requested",
  "mission.request_decided": "Adventure request decided",
  "mission.completion_requested": "Adventure marked as done",
  "mission.completion_decided": "Completion decided",
  "settings.updated": "Settings changed",
  "data.exported": "Data exported",
};

export function eventLabel(e: AuditEvent): string {
  const base = EVENT_LABELS[e.eventType] ?? e.eventType.replace(/[._]/g, " ");
  const decision = e.metadata.decision;
  if (decision === "approved") return `${base} — approved`;
  if (decision === "rejected") return `${base} — not this time`;
  return base;
}

/** Only surface human-useful metadata; opaque IDs stay out of the UI. */
export function eventDetails(e: AuditEvent): string[] {
  const out: string[] = [];
  const m = e.metadata;
  if (typeof m.source === "string") out.push(`via ${SOURCE_LABEL[m.source as RequestSource] ?? m.source}`);
  if (typeof m.points === "number" && m.points > 0) out.push(`+${m.points} points`);
  if (typeof m.origin === "string") out.push(m.origin === "bedrock" ? "AI-assisted" : "curated library");
  if (typeof m.promptCategory === "string") out.push(String(m.promptCategory));
  return out;
}

export function actorName(e: AuditEvent, members: Member[]): string {
  const member = members.find((m) => m.id === e.actorId);
  if (member) return e.actorType === "parent" ? "You" : member.displayName;
  return ACTOR_LABEL[e.actorType];
}
