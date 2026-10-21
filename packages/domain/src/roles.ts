import type { Member, MemberRole } from "@familyflow/shared";
import { Errors } from "@familyflow/shared";

export function assertParent(member: Member | undefined | null): asserts member is Member {
  if (!member || member.role !== "parent" || !member.active) {
    throw Errors.forbidden("Parent role required");
  }
}

export function assertHouseholdMember(
  member: Member | undefined | null,
  householdId: string,
): asserts member is Member {
  if (!member || !member.active || member.householdId !== householdId) {
    throw Errors.forbidden("Not a member of this household");
  }
}

export function canRequestMission(role: MemberRole): boolean {
  return role === "child" || role === "parent";
}

export function canDecideApprovals(role: MemberRole): boolean {
  return role === "parent";
}

export function requireChildVisibilityNotice(member: Member): void {
  if (member.role === "child" && !member.visibilityNoticeAcknowledgedAt) {
    throw Errors.precondition(
      "Child must acknowledge age-appropriate parental visibility notice before using FamilyFlow",
    );
  }
}
