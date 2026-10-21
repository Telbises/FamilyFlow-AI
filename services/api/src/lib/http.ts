import { AppError } from "@familyflow/shared";

export interface HttpRequest {
  method: string;
  path: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  body: unknown;
  requestId: string;
}

export interface HttpResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export function json(
  statusCode: number,
  data: unknown,
  extraHeaders: Record<string, string> = {},
): HttpResponse {
  return {
    statusCode,
    headers: {
      "content-type": "application/json",
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

export function toErrorResponse(err: unknown, requestId: string): HttpResponse {
  if (err instanceof AppError) {
    return json(err.statusCode, {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
  }
  console.error(JSON.stringify({ level: "error", requestId, message: "Unhandled error" }));
  return json(500, {
    error: { code: "INTERNAL", message: "Internal server error", requestId },
  });
}

export function parseJsonBody(raw: string | undefined): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    throw new AppError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }
}
