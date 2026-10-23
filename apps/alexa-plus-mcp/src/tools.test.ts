import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "server.ts"), "utf8");

describe("Alexa+ MCP server contract", () => {
  it("registers required FamilyFlow tools", () => {
    for (const tool of [
      "family_help",
      "list_adventures",
      "suggest_adventure",
      "request_adventure",
      "check_mission_status",
    ]) {
      assert.match(src, new RegExp(`"${tool}"`));
    }
  });

  it("documents pending parent approval on request", () => {
    assert.match(src, /pending/i);
    assert.match(src, /parent must approve/i);
  });
});
