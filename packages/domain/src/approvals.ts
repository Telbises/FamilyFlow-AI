import type { CompletionStatus, MissionStatus, RequestStatus } from "@familyflow/shared";
import { Errors } from "@familyflow/shared";

/** Mission request approval state machine. */
export function applyRequestDecision(
  current: RequestStatus,
  decision: "approved" | "rejected",
): RequestStatus {
  if (current !== "pending") {
    throw Errors.conflict("Request already decided");
  }
  return decision;
}

export function missionStatusAfterRequestDecision(
  decision: RequestStatus,
): Extract<MissionStatus, "approved" | "rejected"> {
  if (decision === "approved") return "approved";
  if (decision === "rejected") return "rejected";
  throw Errors.precondition("Decision must be approved or rejected");
}

export function assertMissionRequestable(status: MissionStatus): void {
  if (status !== "available" && status !== "rejected") {
    throw Errors.conflict(`Mission cannot be requested in status ${status}`);
  }
}

export function assertMissionCompletable(status: MissionStatus): void {
  if (status !== "approved" && status !== "in_progress") {
    throw Errors.conflict(`Mission cannot request completion in status ${status}`);
  }
}

export function applyCompletionDecision(
  current: CompletionStatus,
  decision: "approved" | "rejected",
): CompletionStatus {
  if (current !== "pending") {
    throw Errors.conflict("Completion already decided");
  }
  return decision;
}

export function missionStatusAfterCompletionDecision(
  decision: CompletionStatus,
): Extract<MissionStatus, "completed" | "approved"> {
  if (decision === "approved") return "completed";
  // Rejected completion returns mission to approved so family can try again.
  if (decision === "rejected") return "approved";
  throw Errors.precondition("Decision must be approved or rejected");
}
