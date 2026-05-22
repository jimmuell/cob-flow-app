// Default authority bands per Job Level. Pass 2: load from customer config.
import type { JobLevel, AuthorityBands } from "@/lib/types/role";

export const JOB_LEVEL_DEFAULTS: Record<JobLevel, AuthorityBands> = {
  TRAINEE: { settlement: 5000,  demand: 10000, lienReduction: 0.10, closure: 10000, letterOverride: 0, templatePublication: 0 },
  JUNIOR:  { settlement: 10000, demand: 20000, lienReduction: 0.20, closure: 20000, letterOverride: 0, templatePublication: 0 },
  MID:     { settlement: 25000, demand: 35000, lienReduction: 0.25, closure: 35000, letterOverride: 0, templatePublication: 0 },
  SENIOR:  { settlement: 50000, demand: 75000, lienReduction: 0.35, closure: 75000, letterOverride: 1, templatePublication: 0 },
};

export function defaultBandsForLevel(level: JobLevel): AuthorityBands {
  return JOB_LEVEL_DEFAULTS[level];
}
