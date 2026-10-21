import { API_BASE_URL, LOCAL_PARENT_TOKEN } from "./config";
import type {
  Approvals,
  AuditEvent,
  AgeBand,
  CompletionDecisionResult,
  CurrentHousehold,
  Decision,
  DeleteResult,
  ExportResult,
  GenerateMissionResult,
  Household,
  Member,
  Mission,
  PairingCode,
  PromptCategory,
  RequestDecisionResult,
  RewardsResponse,
  SettingsPatch,
  SettingsResponse,
  HouseholdSettings,
} from "./types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNetwork() {
    return this.status === 0;
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  return new ApiError(-1, "UNKNOWN", e instanceof Error ? e.message : "Something went wrong");
}

/** Idempotency keys must be 8–128 chars; the API replays the first response for repeats. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `ff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
}

async function request<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      cache: "no-store",
      headers: {
        // LOCAL DEMO ONLY — see lib/config.ts
        Authorization: `Bearer ${LOCAL_PARENT_TOKEN}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK",
      `Can't reach the FamilyFlow API at ${API_BASE_URL}. Is it running?`,
    );
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | undefined)
      ?.error;
    throw new ApiError(
      res.status,
      err?.code ?? "HTTP_ERROR",
      err?.message ?? `Request failed (${res.status})`,
      err?.requestId,
    );
  }
  return data as T;
}

/* ------------------------------ Household ------------------------------ */

export const createHousehold = (timezone: string) =>
  request<Household>("/households", { method: "POST", body: { timezone } });

export const getCurrentHousehold = () => request<CurrentHousehold>("/households/current");

export const addChild = (input: {
  displayName: string;
  ageBand: AgeBand;
  visibilityNoticeAcknowledged: boolean;
}) =>
  request<Member>("/members", {
    method: "POST",
    body: { ...input, role: "child" },
  });

export const createPairingCode = () =>
  request<PairingCode>("/devices/pairing-code", { method: "POST" });

/* ------------------------------ Approvals ------------------------------ */

export const listApprovals = () => request<Approvals>("/approvals");

export const decideApproval = (requestId: string, decision: Decision) =>
  request<RequestDecisionResult>(`/approvals/${encodeURIComponent(requestId)}/decision`, {
    method: "POST",
    body: { decision, idempotencyKey: newIdempotencyKey() },
  });

/** Completion approvals award points (parent-approved only). */
export const decideCompletion = (completionId: string, decision: Decision) =>
  request<CompletionDecisionResult>(`/completions/${encodeURIComponent(completionId)}/decision`, {
    method: "POST",
    body: { decision, idempotencyKey: newIdempotencyKey() },
  });

/* ------------------------------ Missions ------------------------------ */

export const listMissions = async () =>
  (await request<{ missions: Mission[] }>("/missions")).missions;

export const generateMission = (promptCategory: PromptCategory, ageBands: AgeBand[]) =>
  request<GenerateMissionResult>("/missions/generate", {
    method: "POST",
    body: { promptCategory, ageBands },
  });

/* ------------------------------ Rewards / audit ------------------------------ */

export const listRewards = () => request<RewardsResponse>("/rewards");

export const listAuditEvents = async () =>
  (await request<{ events: AuditEvent[] }>("/audit-events")).events;

/* ------------------------------ Settings & data ------------------------------ */

export const getSettings = () => request<SettingsResponse>("/settings");

export const patchSettings = async (patch: SettingsPatch) =>
  (await request<{ settings: HouseholdSettings }>("/settings", { method: "PATCH", body: patch }))
    .settings;

export const exportData = () => request<ExportResult>("/data/export", { method: "POST" });

export const deleteData = () => request<DeleteResult>("/data/delete-request", { method: "POST" });
