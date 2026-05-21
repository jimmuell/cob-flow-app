import type { JobLevel, AuthorityBands } from "@/lib/types/role";

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

export type ApprovalPriority = "STANDARD" | "URGENT";

export interface NewUserPayload {
  name: string;
  initials: string;
  role: string;
  teamId: string;
  level: JobLevel;
  email: string;
}

export interface LateArrivalPayload {
  claimId: string;
  serviceDate: string;
  provider: string;
  paidAmount: number;
  diagnosisCodes: string[];
  placeOfService: string;
  closedCaseRecoveryAmount: number;
  closedAt: string;
}

export interface AuthorityChange {
  settlement?: { from: number; to: number };
  demand?: { from: number; to: number };
}

export interface ApprovalQueueItem {
  id: string;
  claimId: string | null;
  type: ApprovalQueueType;
  requester: string;
  requestedAt: string;
  priority: ApprovalPriority;
  summary: string;
  amount: number | null;
  unit: string | null;
  authorityLimit: number | null;
  justification: string;
  /** Present for LEVEL_CHANGE_REQUEST */
  targetUserId?: string;
  fromLevel?: JobLevel;
  toLevel?: JobLevel;
  /** Present for AUTHORITY_OVERRIDE */
  authorityChange?: AuthorityChange;
  effectiveDuration?: string;
  /** Present for FILE_AUTHORITY_GRANT */
  fileAuthority?: Partial<AuthorityBands>;
  expiry?: string;
  /** Present for USER_ACTIVATION */
  newUser?: NewUserPayload;
  /** Present for LATE_ARRIVAL_TO_CLOSED_CASE */
  lateArrival?: LateArrivalPayload;
}
