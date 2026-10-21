import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPairingValid,
  generatePairingCode,
  hashPairingCode,
  pairingCodesEqual,
  pairingExpiryIso,
} from "./pairing.js";

describe("pairing", () => {
  it("generates 6-digit codes", () => {
    for (let i = 0; i < 20; i++) {
      assert.match(generatePairingCode(), /^\d{6}$/);
    }
  });

  it("hashes deterministically and compares safely", () => {
    const h1 = hashPairingCode("123456");
    const h2 = hashPairingCode("123456");
    const h3 = hashPairingCode("654321");
    assert.equal(h1, h2);
    assert.ok(pairingCodesEqual(h1, h2));
    assert.equal(pairingCodesEqual(h1, h3), false);
  });

  it("expires codes", () => {
    const expiresAt = pairingExpiryIso(1, new Date("2026-01-01T00:00:00.000Z"));
    assert.throws(() =>
      assertPairingValid({
        expiresAt,
        revokedAt: null,
        now: new Date("2026-01-01T00:00:02.000Z"),
      }),
    );
  });

  it("rejects revoked sessions", () => {
    assert.throws(() =>
      assertPairingValid({
        expiresAt: pairingExpiryIso(600),
        revokedAt: new Date().toISOString(),
      }),
    );
  });
});
