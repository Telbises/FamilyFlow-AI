import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { randomUUID } from "node:crypto";
import { createApp } from "./app-context.js";
import { loadConfig } from "./config.js";
import { parseJsonBody } from "./lib/http.js";
import { handleRequest } from "./router.js";

const { service, config } = createApp(loadConfig());

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const requestId = event.requestContext.requestId ?? randomUUID();
  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(event.headers ?? {})) {
    headers[k.toLowerCase()] = v;
  }

  // Prefer JWT claims from HTTP API JWT authorizer when present; still verify membership in service.
  const authHeader =
    headers.authorization ??
    (event.requestContext.authorizer && "jwt" in (event.requestContext.authorizer as object)
      ? `Bearer ${(event.headers?.authorization ?? "").replace(/^Bearer\s+/i, "")}`
      : headers.authorization);

  const response = await handleRequest(
    {
      method: (event.requestContext.http?.method ?? "GET").toUpperCase(),
      path: event.rawPath ?? "/",
      headers: { ...headers, authorization: authHeader },
      query: (event.queryStringParameters ?? {}) as Record<string, string | undefined>,
      body: event.body
        ? parseJsonBody(event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body)
        : undefined,
      requestId,
    },
    service,
    config,
  );

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
};
