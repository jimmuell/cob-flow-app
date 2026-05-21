export type RecoveryStage =
  | "IDENTIFIED"
  | "INVESTIGATING"
  | "DEMAND_SENT"
  | "NEGOTIATING"
  | "SETTLED"
  | "CLOSED";

export interface Recovery {
  id: string;
  claimId: string;
  target: string;
  demand: number;
  recovered: number;
  stage: RecoveryStage;
  assignedTo: string;
  opened: string;
}
