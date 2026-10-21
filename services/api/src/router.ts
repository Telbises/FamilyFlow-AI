import { Errors } from "@familyflow/shared";
import { authenticate, type AuthContext } from "./lib/auth.js";
import type { HttpRequest, HttpResponse } from "./lib/http.js";
import { json, toErrorResponse } from "./lib/http.js";
import { rateLimit } from "./lib/rate-limit.js";
import type { AppConfig } from "./config.js";
import type { FamilyFlowService } from "./services/familyflow-service.js";

function header(req: HttpRequest, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(req.headers)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

function match(path: string, pattern: string): Record<string, string> | null {
  const pp = pattern.split("/").filter(Boolean);
  const ap = path.split("/").filter(Boolean);
  if (pp.length !== ap.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    const p = pp[i]!;
    const a = ap[i]!;
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(a);
    else if (p !== a) return null;
  }
  return params;
}

export async function handleRequest(
  req: HttpRequest,
  service: FamilyFlowService,
  config: AppConfig,
): Promise<HttpResponse> {
  try {
    if (req.method === "OPTIONS") {
      return json(204, {});
    }
    if (req.method === "GET" && req.path === "/health") {
      return json(200, { ok: true, mode: config.mode, product: "FamilyFlow AI" });
    }
    if (req.method === "GET" && req.path === "/openapi.json") {
      const { openApiDocument } = await import("./openapi.js");
      return json(200, openApiDocument);
    }

    // Public device pairing (code is the secret)
    if (req.method === "POST" && req.path === "/devices/pair") {
      const ip = header(req, "x-forwarded-for") ?? "local";
      if (!rateLimit(`pair:${ip}`, 20, 60_000)) throw Errors.rateLimited();
      const result = await service.pairDevice(req.body);
      return json(200, result);
    }

    const authHeader = header(req, "authorization");

    // Device session auth: Bearer device:<sessionId>:<sessionToken>
    if (authHeader?.startsWith("Bearer device:")) {
      const parts = authHeader.slice("Bearer device:".length).split(":");
      const sessionId = parts[0];
      const sessionToken = parts.slice(1).join(":");
      if (!sessionId || !sessionToken) throw Errors.unauthorized("Malformed device token");
      const device = await service.authenticateDeviceSession(sessionId, sessionToken);

      if (req.method === "GET" && req.path === "/devices/me") {
        return json(200, await service.deviceContext(device.householdId, sessionId));
      }
      const deviceMissions = match(req.path, "/devices/:sessionId/missions");
      if (req.method === "GET" && deviceMissions) {
        if (deviceMissions.sessionId !== sessionId) throw Errors.forbidden("Session mismatch");
        const missions = await service.listMissionsForDevice(device.householdId, sessionId);
        return json(200, { missions });
      }
      const missionRequest = match(req.path, "/missions/:id/request");
      if (req.method === "POST" && missionRequest) {
        return json(
          201,
          await service.requestMission(null, missionRequest.id!, req.body, {
            householdId: device.householdId,
            actorType: "device",
          }),
        );
      }
      const completeRequest = match(req.path, "/missions/:id/complete-request");
      if (req.method === "POST" && completeRequest) {
        return json(
          201,
          await service.requestCompletion(null, completeRequest.id!, req.body, {
            householdId: device.householdId,
          }),
        );
      }
      return json(404, {
        error: { code: "NOT_FOUND", message: `No device route ${req.method} ${req.path}` },
      });
    }

    // Legacy query-based device mission poll (householdId + session id) — prefer device bearer
    const deviceMissions = match(req.path, "/devices/:sessionId/missions");
    if (req.method === "GET" && deviceMissions) {
      const householdId = req.query.householdId;
      if (!householdId) throw Errors.validation("householdId query required");
      const missions = await service.listMissionsForDevice(householdId, deviceMissions.sessionId!);
      return json(200, { missions });
    }

    let auth: AuthContext;
    try {
      auth = await authenticate(authHeader, config);
    } catch (e) {
      throw e;
    }

    if (req.method === "POST" && req.path === "/households") {
      return json(201, await service.createHousehold(auth, req.body));
    }
    if (req.method === "GET" && req.path === "/households/current") {
      return json(200, await service.getCurrentHousehold(auth));
    }
    if (req.method === "POST" && req.path === "/members") {
      return json(201, await service.createMember(auth, req.body));
    }
    if (req.method === "POST" && req.path === "/devices/pairing-code") {
      if (!rateLimit(`pairing-code:${auth.sub}`, 10, 60_000)) throw Errors.rateLimited();
      return json(201, await service.createPairingCode(auth));
    }
    if (req.method === "GET" && req.path === "/missions") {
      return json(200, { missions: await service.listMissions(auth) });
    }
    if (req.method === "POST" && req.path === "/missions/generate") {
      return json(201, await service.generateMission(auth, req.body));
    }
    const missionRequest = match(req.path, "/missions/:id/request");
    if (req.method === "POST" && missionRequest) {
      return json(201, await service.requestMission(auth, missionRequest.id!, req.body));
    }
    if (req.method === "GET" && req.path === "/approvals") {
      return json(200, await service.listApprovals(auth));
    }
    const approvalDecision = match(req.path, "/approvals/:id/decision");
    if (req.method === "POST" && approvalDecision) {
      return json(200, await service.decideApproval(auth, approvalDecision.id!, req.body));
    }
    const completeRequest = match(req.path, "/missions/:id/complete-request");
    if (req.method === "POST" && completeRequest) {
      return json(201, await service.requestCompletion(auth, completeRequest.id!, req.body));
    }
    const completionDecision = match(req.path, "/completions/:id/decision");
    if (req.method === "POST" && completionDecision) {
      return json(200, await service.decideCompletion(auth, completionDecision.id!, req.body));
    }
    if (req.method === "GET" && req.path === "/rewards") {
      return json(200, await service.listRewards(auth));
    }
    if (req.method === "GET" && req.path === "/audit-events") {
      return json(200, { events: await service.listAuditEvents(auth) });
    }
    if (req.method === "GET" && req.path === "/settings") {
      return json(200, await service.getSettings(auth));
    }
    if (req.method === "PATCH" && req.path === "/settings") {
      return json(200, { settings: await service.patchSettings(auth, req.body) });
    }
    if (req.method === "POST" && req.path === "/data/export") {
      return json(200, await service.exportData(auth));
    }
    if (req.method === "POST" && req.path === "/data/delete-request") {
      return json(200, await service.deleteRequest(auth));
    }

    // Alexa skill helper: request adventure with linked parent token
    if (req.method === "POST" && req.path === "/alexa/request-adventure") {
      if (!config.featureFlags.voice) throw Errors.featureDisabled("voice");
      return json(201, await service.requestMission(auth, (req.body as { missionId: string }).missionId, {
        ...(req.body as object),
        source: "alexa",
      }, { actorType: "alexa" }));
    }

    return json(404, { error: { code: "NOT_FOUND", message: `No route ${req.method} ${req.path}` } });
  } catch (err) {
    return toErrorResponse(err, req.requestId);
  }
}
