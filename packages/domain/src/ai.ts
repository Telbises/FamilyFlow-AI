import {
  type AdventurePlan,
  type AgeBand,
  containsUnsafeContent,
  validateAdventurePlan,
} from "@familyflow/shared";

export type AiGenerateResult =
  | { ok: true; plan: AdventurePlan; origin: "bedrock" | "curated" }
  | { ok: false; reason: string };

export function filterCuratedByAge(
  library: AdventurePlan[],
  ageBands?: AgeBand[],
): AdventurePlan[] {
  if (!ageBands?.length) return library;
  return library.filter((m) => m.ageBands.some((b) => ageBands.includes(b)));
}

export function pickCuratedFallback(
  library: AdventurePlan[],
  ageBands?: AgeBand[],
): AiGenerateResult {
  const filtered = filterCuratedByAge(library, ageBands);
  const pool = filtered.length ? filtered : library;
  if (!pool.length) {
    return { ok: false, reason: "Curated library empty" };
  }
  const plan = pool[Math.floor(Math.random() * pool.length)]!;
  const checked = validateAdventurePlan(plan);
  if (!checked.ok) {
    return { ok: false, reason: "Curated plan failed schema/safety" };
  }
  return { ok: true, plan: checked.data, origin: "curated" };
}

export function parseBedrockPlan(raw: unknown): AiGenerateResult {
  const checked = validateAdventurePlan(raw);
  if (!checked.ok) {
    return { ok: false, reason: "Bedrock output failed schema/safety validation" };
  }
  return { ok: true, plan: checked.data, origin: "bedrock" };
}

export function buildConstrainedPrompt(category: string, ageBands: AgeBand[]): string {
  return [
    "You generate a family adventure plan as JSON only.",
    "Schema keys: title, ageBands, estimatedMinutes, materials, steps, safetyNotes, parentApprovalRequired.",
    "parentApprovalRequired must be true.",
    "No purchases, no location sharing, no dangerous challenges, no inappropriate content.",
    `Category: ${category}`,
    `Age bands: ${ageBands.join(", ")}`,
  ].join("\n");
}

export function isPromptSafe(category: string): boolean {
  return !containsUnsafeContent(category);
}
