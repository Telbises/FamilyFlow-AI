import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const model = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../skill-package/interactionModels/custom/en-US.json",
    ),
    "utf8",
  ),
);

describe("Alexa interaction model", () => {
  it("includes required intents", () => {
    const names = model.interactionModel.languageModel.intents.map(
      (i: { name: string }) => i.name,
    );
    for (const required of [
      "LaunchFamilyFlow",
      "SuggestAdventure",
      "RequestAdventure",
      "CheckMissionStatus",
      "FamilyHelp",
    ]) {
      assert.ok(names.includes(required), missing(required));
    }
  });
});

function missing(name: string) {
  return `missing intent ${name}`;
}
