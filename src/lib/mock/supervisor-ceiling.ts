import type { AuthorityBands } from "@/lib/types/role";

/**
 * Supervisor ceiling — max authority the supervisor can grant unilaterally,
 * either via per-analyst override OR per-file authority elevation.
 * Above this, the grant routes to Manager approval.
 * Configurable per customer at onboarding in production.
 */
export const SUPERVISOR_CEILING: AuthorityBands = {
  settlement: 100000,
  demand: 150000,
  lienReduction: 0.50,
  closure: 150000,
};
