export type CaseState =
  | "GATHERING"
  | "READY"
  | "ASSIGNED"
  | "IN_RECOVERY"
  | "CLOSED"
  | "REOPENED";

export type PlanType =
  | "HEALTH"
  | "MEDICARE"
  | "MEDICAID"
  | "AUTO_MEDPAY"
  | "TFL";

export type FundingType = "SELF_FUNDED" | "FULLY_INSURED" | "N/A";

export type MemberRelationship = "SELF" | "CHILD" | "DEPENDENT_SPOUSE";

export interface Coverage {
  id: string;
  planType: PlanType;
  payerName: string;
  basis: string;
  funding: FundingType;
  effectiveDate: string;
  hasCoordinationClause?: boolean;
  hasEscapeClause?: boolean;
  hasExcessClause?: boolean;
  subscriberName?: string;
  subscriberDob?: string;
  medicareReason?: "AGED" | "ESRD" | "DISABILITY";
  esrdMonthsElapsed?: number;
  employerSize?: string;
  employerHeadcount?: number;
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  age: number;
  relationship: MemberRelationship;
  parentsSeparated?: boolean;
}

export interface ClaimLiability {
  claimantFaultPct: number;
  defendantFaultPct: number;
  liabilityAccepted: boolean;
  attorneyOfRecord: string | null;
}

export interface ClaimRecovery {
  totalMedicalPaid: number;
  totalSettlement?: number;
  attorneyFee?: number;
  planGrossRecovery?: number;
}

export interface Claim {
  id: string;
  memberId: string;
  tenant: string;
  caseState: CaseState;
  serviceDate: string;
  billedAmount: number;
  paidAmount: number;
  diagnosisCodes: string[];
  placeOfService: string;
  providerSpecialty: string;
  accidentIndicator: "Y" | "N" | "U";
  accidentState?: string;
  accidentDate?: string;
  member: Member;
  coverages: Coverage[];
  liability?: ClaimLiability;
  recovery?: ClaimRecovery;
}
