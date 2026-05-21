/**
 * Engine types — placeholder.
 * The COB decision engine is ported verbatim from the prototype in
 * src/lib/engine/primacy.ts. Full type definitions will be extracted
 * from that file in a subsequent pass.
 */

export type PrimacyRule =
  | "BIRTHDAY_RULE"
  | "MSP_WORKING_AGED"
  | "MSP_ESRD_COORDINATION"
  | "TFL_MEDICARE_PRIMARY"
  | "MEDICAID_PAYER_OF_LAST_RESORT"
  | "ERISA_SELF_FUNDED_PREEMPTION"
  | "AUTO_MEDPAY_OPTIONAL"
  | "INSUFFICIENT_DATA"
  | "NO_COB_NEEDED";

export type RecommendedAction = "OPEN_RECOVERY" | "INVESTIGATE" | "NO_ACTION";

export interface EngineResult {
  rule: PrimacyRule;
  primary: string;
  secondary: string;
  recommendedAction: RecommendedAction;
  score: number;
  signals: string[];
}
