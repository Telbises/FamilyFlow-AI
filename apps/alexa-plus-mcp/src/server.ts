/**
 * FamilyFlow MCP server (Streamable HTTP) for Alexa+ / agent clients.
 * Spec target: MCP 2025-11-25+ Streamable HTTP.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const API = process.env.FAMILYFLOW_API_BASE_URL ?? "http://127.0.0.1:3100";
const TOKEN = process.env.FAMILYFLOW_ACCESS_TOKEN ?? "";
const PORT = Number(process.env.MCP_PORT ?? 3300);

async function api(path: string, init?: RequestInit) {
  if (!TOKEN) {
    throw new Error("FAMILYFLOW_ACCESS_TOKEN required (Cognito or local dev token)");
  }
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${TOKEN}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `API ${res.status}`);
  return data;
}

function createFamilyFlowMcp() {
  const server = new McpServer({
    name: "familyflow",
    version: "0.1.0",
  });

  server.tool(
    "family_help",
    "Explain FamilyFlow and privacy boundaries (FamilyFlow activity only).",
    {},
    async () => ({
      content: [
        {
          type: "text",
          text: "FamilyFlow helps families pick adventures. Parents approve requests in the FamilyFlow dashboard. Parents only see FamilyFlow activity — not unrelated Alexa chats or Amazon purchases. Sensitive actions are never auto-approved by voice or AI.",
        },
      ],
    }),
  );

  server.tool("list_adventures", "List available FamilyFlow adventures for the linked household.", {}, async () => {
    const data = await api("/missions");
    const available = (data.missions ?? []).filter((m: { status: string }) => m.status === "available");
    return {
      content: [{ type: "text", text: JSON.stringify(available.slice(0, 10), null, 2) }],
    };
  });

  server.tool(
    "suggest_adventure",
    "Suggest one adventure (does not activate without parent approval).",
    { category: z.string().optional() },
    async ({ category }) => {
      try {
        await api("/missions/generate", {
          method: "POST",
          body: JSON.stringify({ promptCategory: category ?? "indoor" }),
        });
      } catch {
        /* parent may be required; fall through to list */
      }
      const data = await api("/missions");
      const m = (data.missions ?? []).find((x: { status: string }) => x.status === "available");
      if (!m) {
        return { content: [{ type: "text", text: "No available adventure. Ask a parent to open FamilyFlow." }] };
      }
      return {
        content: [
          {
            type: "text",
            text: `Suggestion: ${m.title} (~${m.estimatedMinutes} min, ${m.origin}). Say request_adventure with missionId ${m.id} — a parent must still approve.`,
          },
        ],
      };
    },
  );

  server.tool(
    "request_adventure",
    "Create a pending adventure request for parent approval.",
    {
      missionId: z.string().uuid(),
      memberId: z.string().uuid().describe("Child member id from FamilyFlow"),
    },
    async ({ missionId, memberId }) => {
      const data = await api(`/missions/${missionId}/request`, {
        method: "POST",
        body: JSON.stringify({
          memberId,
          source: "alexa",
          idempotencyKey: `mcp-${missionId}-${randomUUID()}`,
        }),
      });
      return {
        content: [
          {
            type: "text",
            text: `Request ${data.request.id} is pending. A parent must approve it in the FamilyFlow dashboard before it is active.`,
          },
        ],
      };
    },
  );

  server.tool("check_mission_status", "Check active FamilyFlow mission statuses.", {}, async () => {
    const data = await api("/missions");
    const active = (data.missions ?? []).filter((m: { status: string }) =>
      ["requested", "approved", "in_progress", "completion_requested"].includes(m.status),
    );
    return { content: [{ type: "text", text: JSON.stringify(active, null, 2) }] };
  });

  return server;
}

async function main() {
  const httpServer = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, product: "FamilyFlow MCP", api: API }));
      return;
    }

    // Per-request MCP transport (stateless-friendly for demos)
    const server = createFamilyFlowMcp();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res);
  });

  httpServer.listen(PORT, () => {
    console.log(
      JSON.stringify({
        msg: "FamilyFlow Alexa+ MCP listening",
        url: `http://127.0.0.1:${PORT}/mcp`,
        health: `http://127.0.0.1:${PORT}/health`,
        note: "Parent approval still required for activation/rewards",
      }),
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
