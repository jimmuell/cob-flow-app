export interface CustomerKpi {
  recoveryMTD: number;
  recoveryYTD: number;
  avgDaysToRecovery: number;
  recoveryToPaidRatio: number;
  overrideRate: number;
  leakageEstimate: number;
  openRecoveries: number;
  recoveriesThisYear: number;
}

/** Keyed by tenant id. */
export const CUSTOMER_KPIS: Record<string, CustomerKpi> = {
  t_carrier: { recoveryMTD: 33890, recoveryYTD: 128450, avgDaysToRecovery: 47, recoveryToPaidRatio: 0.123,
    overrideRate: 0.042, leakageEstimate: 14200, openRecoveries: 7, recoveriesThisYear: 38 },
  t_vendor:  { recoveryMTD: 51200, recoveryYTD: 184300, avgDaysToRecovery: 41, recoveryToPaidRatio: 0.139,
    overrideRate: 0.038, leakageEstimate: 18750, openRecoveries: 12, recoveriesThisYear: 54 },
  t_indie:   { recoveryMTD: 12450, recoveryYTD: 38200,  avgDaysToRecovery: 53, recoveryToPaidRatio: 0.108,
    overrideRate: 0.051, leakageEstimate: 5800,  openRecoveries: 3,  recoveriesThisYear: 11 },
};
