/**
 * Supervisor performance signals — manager's view of supervisor metrics.
 * Approval response time (avg hours), QC sample disagreement rate,
 * escalation resolution rate.
 */
export interface SupervisorPerformance {
  userId: string;
  avgApprovalHours: number;
  qcDisagreementRate: number;
  escalationResolutionRate: number;
  recentDecisions30d: number;
}

export const SUPERVISOR_PERFORMANCE: SupervisorPerformance[] = [
  { userId: "u_tr", avgApprovalHours: 4.2, qcDisagreementRate: 0.04, escalationResolutionRate: 0.94, recentDecisions30d: 38 },
  { userId: "u_sb", avgApprovalHours: 6.8, qcDisagreementRate: 0.06, escalationResolutionRate: 0.91, recentDecisions30d: 22 },
];
