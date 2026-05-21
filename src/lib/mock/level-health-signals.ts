/**
 * Level-health watchlist signals — per-analyst proactive metrics that prompt
 * level-change consideration. Supervisor reviews; tripping thresholds flag the
 * analyst for promotion or demotion proposal.
 */
export type LevelHealthFlag = "OK" | "REVIEW" | "CONCERN";

export interface LevelHealthSignal {
  userId: string;
  overrideRate: number;
  qcConcernRate: number;
  reopenRate: number;
  utilization: number;
  flag: LevelHealthFlag;
  note: string;
}

export const LEVEL_HEALTH_SIGNALS: LevelHealthSignal[] = [
  {
    userId: "u_jm", overrideRate: 0.02, qcConcernRate: 0.00, reopenRate: 0.01,
    utilization: 0.42, flag: "OK", note: "Senior level appropriate; consistent performance.",
  },
  {
    userId: "u_kn", overrideRate: 0.04, qcConcernRate: 0.00, reopenRate: 0.03,
    utilization: 0.58, flag: "OK", note: "Mid level appropriate; tracking for Senior eligibility late 2026.",
  },
  {
    userId: "u_aw", overrideRate: 0.08, qcConcernRate: 0.33, reopenRate: 0.05,
    utilization: 0.75, flag: "REVIEW", note: "High utilization suggests ready for Mid; QC concern rate suggests not yet. Review case-by-case.",
  },
  {
    userId: "u_ml", overrideRate: 0.03, qcConcernRate: 0.00, reopenRate: 0.02,
    utilization: 0.48, flag: "OK", note: "Mid level appropriate.",
  },
  {
    userId: "u_dp", overrideRate: 0.05, qcConcernRate: 0.00, reopenRate: 0.04,
    utilization: 0.51, flag: "OK", note: "Mid level appropriate; light caseload this cycle.",
  },
];
