import { CognitoJwtVerifier } from "aws-jwt-verify";
import { Errors } from "@familyflow/shared";
import type { AppConfig } from "../config.js";

export interface AuthContext {
  sub: string;
  tokenUse: "access" | "id" | "local";
  rawClaims: Record<string, unknown>;
}

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getVerifier(config: AppConfig) {
  if (!config.cognitoUserPoolId || !config.cognitoClientId) {
    return null;
  }
  if (!verifier) {
    verifier = CognitoJwtVerifier.create({
      userPoolId: config.cognitoUserPoolId,
      tokenUse: "access",
      clientId: config.cognitoClientId,
    });
  }
  return verifier;
}

export async function authenticate(
  authorizationHeader: string | undefined,
  config: AppConfig,
): Promise<AuthContext> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw Errors.unauthorized("Missing Bearer token");
  }
  const token = authorizationHeader.slice("Bearer ".length).trim();

  if (config.allowLocalDevAuth && token.startsWith("local:")) {
    const sub = token.slice("local:".length) || config.localDevOwnerSub;
    return { sub, tokenUse: "local", rawClaims: { sub, local: true } };
  }

  const v = getVerifier(config);
  if (!v) {
    throw Errors.unauthorized(
      "Cognito is not configured. Set COGNITO_* env vars or use local: Bearer local:<sub> in local mode only.",
    );
  }

  try {
    const payload = await v.verify(token);
    return {
      sub: String(payload.sub),
      tokenUse: "access",
      rawClaims: payload as unknown as Record<string, unknown>,
    };
  } catch {
    throw Errors.unauthorized("Invalid or expired token");
  }
}
