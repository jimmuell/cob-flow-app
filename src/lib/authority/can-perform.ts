import type { CurrentUser } from "@/lib/auth/session";
import type { Role } from "@/lib/types/role";

export type AuthorityAction =
  // Claims workflow actions
  | "ACCEPT_SETTLEMENT"
  | "SEND_DEMAND"
  | "REDUCE_LIEN"
  | "CLOSE_RECOVERY"
  | "OVERRIDE_LOCK"
  | "GRANT_FILE_AUTHORITY"
  | "CHANGE_LEVEL"
  | "ACTIVATE_USER"
  | "REOPEN_CASE"
  | "WRITE_OFF"
  // Content Manager authoring actions
  | "CREATE_SEQUENCE"
  | "UPDATE_SEQUENCE"
  | "PUBLISH_SEQUENCE"
  | "ARCHIVE_SEQUENCE"
  | "CREATE_COURSE"
  | "UPDATE_COURSE"
  | "PUBLISH_COURSE"
  | "ARCHIVE_COURSE"
  | "CREATE_MODULE"
  | "UPDATE_MODULE"
  | "PUBLISH_MODULE"
  | "ARCHIVE_MODULE"
  | "CREATE_LESSON"
  | "UPDATE_LESSON"
  | "CREATE_QUIZ"
  | "UPDATE_QUIZ"
  | "PUBLISH_QUIZ"
  | "ARCHIVE_QUIZ"
  | "DELETE_SEQUENCE"
  | "DELETE_COURSE"
  | "DELETE_MODULE"
  | "DELETE_LESSON"
  | "DELETE_QUIZ";

export type ApprovalQueueType =
  | "LIEN_REDUCTION"
  | "DEMAND_APPROVAL"
  | "OVERRIDE_LOCK"
  | "CLOSURE_BELOW_DEMAND"
  | "SETTLEMENT_ACCEPTANCE"
  | "LEVEL_CHANGE_REQUEST"
  | "AUTHORITY_OVERRIDE"
  | "FILE_AUTHORITY_GRANT"
  | "USER_ACTIVATION"
  | "LATE_ARRIVAL_TO_CLOSED_CASE";

export interface AuthorityContext {
  user: CurrentUser;
  action: AuthorityAction;
  caseId?: string;
  dollarAmount?: number;
  percentage?: number;
}

export type CanPerformResult =
  | { decision: "allow" }
  | { decision: "requires_approval"; approverRole: Role; queueType: ApprovalQueueType }
  | { decision: "deny"; reason: string };

// Pass 1: allow everything for signed-in users. Pass 2: consult job-level defaults,
// per-analyst overrides, active file-level grants, and supervisor ceiling.
// Call sites check result.decision — do not change this shape between passes.
export function canPerform(ctx: AuthorityContext): CanPerformResult {
  if (!ctx.user) {
    return { decision: "deny", reason: "Not authenticated" };
  }
  return { decision: "allow" };
}
