export type QcSampleStatus = "PENDING_REVIEW" | "REVIEWED_PASS" | "REVIEWED_CONCERN";

export interface QcSample {
  id: string;
  recoveryId: string;
  claimId: string;
  analyst: string;
  closedAt: string;
  outcome: "SETTLED" | "WRITTEN_OFF" | "UNCOLLECTIBLE";
  settlement: number;
  sampleReason: string;
  status: QcSampleStatus;
  findings?: string;
}

export const QC_SAMPLES: QcSample[] = [
  {
    id: "qc_001", recoveryId: "r002", claimId: "c002", analyst: "M. Lindgren",
    closedAt: "2026-05-08", outcome: "SETTLED", settlement: 8210,
    sampleReason: "Random monthly sample (5% policy)", status: "PENDING_REVIEW",
  },
  {
    id: "qc_002", recoveryId: "r_hist_003", claimId: "c008", analyst: "D. Pemberton",
    closedAt: "2026-04-29", outcome: "SETTLED", settlement: 15400,
    sampleReason: "Random monthly sample (5% policy)", status: "REVIEWED_PASS",
    findings: "Engine rationale clean; correspondence matched template; audit log complete.",
  },
  {
    id: "qc_003", recoveryId: "r_hist_007", claimId: "c005", analyst: "A. Whitfield",
    closedAt: "2026-04-21", outcome: "SETTLED", settlement: 4250,
    sampleReason: "Targeted (junior analyst training cycle)", status: "REVIEWED_CONCERN",
    findings: "Lien reduction offer exceeded authority by 3%; should have escalated. Coaching note logged.",
  },
];
