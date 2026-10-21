import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "public", "index.html"),
  "utf8",
);

describe("Fire TV shell navigation contract", () => {
  it("includes three primary views", () => {
    assert.match(html, /Family Mission Board/);
    assert.match(html, /Request this adventure/);
    assert.match(html, /Family celebration/);
  });

  it("documents non-Vega status", () => {
    assert.match(html, /not the Vega Virtual Device/i);
  });

  it("supports D-pad style key handling", () => {
    assert.match(html, /ArrowRight/);
    assert.match(html, /ArrowLeft/);
    assert.match(html, /Enter/);
  });
});
