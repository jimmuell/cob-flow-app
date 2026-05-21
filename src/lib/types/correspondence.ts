export type LetterTypeKey =
  | "DEMAND"
  | "COB_QUESTIONNAIRE"
  | "MEDICAL_RECORDS_REQUEST"
  | "LIEN_NOTICE"
  | "MEMBER_RECOVERY_NOTICE"
  | "FOLLOWUP_DEMAND"
  | "SUBROGATION_HOLD"
  | "LIEN_REDUCTION_OFFER"
  | "SETTLEMENT_ACK";

export interface LetterType {
  label: string;
  /** 1 = required in every recovery file; 2 = common in active recoveries */
  tier: 1 | 2;
  color: string;
}

export type CorrespondenceStatusKey =
  | "DRAFT"
  | "SENT"
  | "ACKNOWLEDGED"
  | "SUPERSEDED"
  | "CLOSED";

export interface CorrespondenceStatus {
  label: string;
  color: string;
}
