// COB primacy decision engine — ported verbatim from prototype in Phase G.
// Stub satisfies the call-site contract so Phase A typecheck passes.

export interface PrimacyInput {
  claim: Record<string, unknown>;
  member?: Record<string, unknown>;
  coverages?: Record<string, unknown>[];
  accident?: Record<string, unknown>;
}

export interface WisconsinOverlayResult {
  madeWhole: { applies: boolean; preempted: boolean; notes: string };
  comparativeNeg: {
    claimantFaultPct: number;
    defendantFaultPct: number;
    barred: boolean;
    recoverable: number;
  };
  commonFund: {
    proRataAttorneyFeeShare: number;
    netRecoveryAfterFee: number;
  };
  citations: string[];
}

export interface PrimacyResult {
  primaryPayer: { coverageId: string; payerName: string; planType: string };
  rule: string;
  ordering: Array<{ coverageId: string; rank: number; rationale: string }>;
  citations: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  wisconsinOverlay?: WisconsinOverlayResult;
}

// Phase G: port engine logic from prototype lines ~60–490 verbatim.
export function determineCobPrimacy(_input: PrimacyInput): PrimacyResult {
  throw new Error("Engine not yet implemented — complete in Phase G");
}
