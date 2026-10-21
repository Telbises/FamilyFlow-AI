import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { loadConfig } from "../config.js";
import { createApp } from "../app-context.js";
import { ensureLocalTable } from "../lib/bootstrap-local-table.js";
import { parseJsonBody } from "../lib/http.js";
import { handleRequest } from "../router.js";

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const config = loadConfig();
  const store = process.env.FAMILYFLOW_STORE ?? (config.dynamoEndpoint ? "dynamodb" : "memory");
  if (store === "dynamodb" && config.dynamoEndpoint) {
    const raw = new DynamoDBClient({
      region: config.region,
      endpoint: config.dynamoEndpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local",
      },
    });
    await ensureLocalTable(raw, config.tableName);
    console.log(JSON.stringify({ msg: "Local DynamoDB table ready", table: config.tableName }));
  } else if (store === "memory") {
    console.log(
      JSON.stringify({
        msg: "Using in-process memory store",
        note: "Real approval state machine; not AWS. Set DYNAMODB_ENDPOINT + FAMILYFLOW_STORE=dynamodb for DynamoDB Local, or deploy CDK for AWS.",
      }),
    );
  }

  const { service, config: cfg } = createApp(config);
  const port = Number(process.env.PORT ?? 3100);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const requestId = randomUUID();
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const origin = req.headers.origin;
    const corsHeaders: Record<string, string> = {
      "access-control-allow-origin":
        origin && cfg.corsOrigins.includes(origin) ? origin : cfg.corsOrigins[0] ?? "*",
      "access-control-allow-headers": "authorization,content-type,x-request-id",
      "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
      "x-request-id": requestId,
    };

    try {
      const raw = await readBody(req);
      const response = await handleRequest(
        {
          method: (req.method ?? "GET").toUpperCase(),
          path: url.pathname,
          headers: Object.fromEntries(
            Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
          ),
          query: Object.fromEntries(url.searchParams.entries()),
          body: raw ? parseJsonBody(raw) : undefined,
          requestId,
        },
        service,
        cfg,
      );
      res.writeHead(response.statusCode, { ...corsHeaders, ...response.headers });
      res.end(response.body);
    } catch (err) {
      console.error(err);
      res.writeHead(500, { ...corsHeaders, "content-type": "application/json" });
      res.end(JSON.stringify({ error: { code: "INTERNAL", requestId } }));
    }
  });

  server.listen(port, () => {
    console.log(
      JSON.stringify({
        msg: "FamilyFlow API listening",
        port,
        mode: cfg.mode,
        localAuth: cfg.allowLocalDevAuth
          ? `Bearer local:${cfg.localDevOwnerSub}`
          : "cognito-only",
      }),
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
