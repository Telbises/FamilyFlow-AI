import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { Errors } from "@familyflow/shared";

export function generatePairingCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashPairingCode(code: string): string {
  return createHash("sha256").update(`familyflow-pairing:${code}`).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(`familyflow-device:${token}`).digest("hex");
}

export function pairingCodesEqual(aHash: string, bHash: string): boolean {
  const a = Buffer.from(aHash, "hex");
  const b = Buffer.from(bHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function assertPairingValid(params: {
  expiresAt: string;
  revokedAt: string | null;
  now?: Date;
}): void {
  const now = params.now ?? new Date();
  if (params.revokedAt) {
    throw Errors.forbidden("Device session revoked");
  }
  if (new Date(params.expiresAt).getTime() <= now.getTime()) {
    throw Errors.forbidden("Pairing code expired");
  }
}

export function pairingExpiryIso(ttlSeconds: number, now = new Date()): string {
  return new Date(now.getTime() + ttlSeconds * 1000).toISOString();
}
