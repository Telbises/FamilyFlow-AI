import { Errors } from "@familyflow/shared";

export const DEFAULT_POINTS_PER_COMPLETION = 10;

/**
 * Award points exactly once for a completion.
 * Callers must use a DynamoDB conditional write on pointsAwarded === 0.
 */
export function computePointsAward(params: {
  alreadyAwarded: number;
  pointsPerCompletion?: number;
}): { points: number; nextTotalDelta: number } {
  if (params.alreadyAwarded > 0) {
    throw Errors.conflict("Points already awarded for this completion");
  }
  const points = params.pointsPerCompletion ?? DEFAULT_POINTS_PER_COMPLETION;
  return { points, nextTotalDelta: points };
}

export function rewardUnlocked(
  totalPoints: number,
  thresholds: Array<{ points: number; title: string }>,
): Array<{ points: number; title: string }> {
  return thresholds.filter((t) => totalPoints >= t.points);
}

export const DEFAULT_REWARD_THRESHOLDS = [
  { points: 10, title: "Family High-Five Night" },
  { points: 30, title: "Pick the Weekend Adventure" },
  { points: 50, title: "Living Room Campout" },
] as const;
