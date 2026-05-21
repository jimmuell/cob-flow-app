// Triage scoring — ported from prototype in Phase G.
import type { RecommendedAction } from "@/lib/types/engine";

export interface TriageInput {
  diagnosisCodes: string[];
  placeOfService?: string;
  accidentIndicator?: string;
  billedAmount?: number;
}

export interface TriageResult {
  score: number;
  signals: string[];
  recommendedAction: RecommendedAction;
}

// Phase G: port triageClaim() from prototype verbatim.
export function triageClaim(_input: TriageInput): TriageResult {
  throw new Error("Triage not yet implemented — complete in Phase G");
}
