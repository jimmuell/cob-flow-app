import type { JobLevel, AuthorityBands } from "@/lib/types/role";

export interface JobLevelDef {
  id: JobLevel;
  label: string;
  color: string;
  description: string;
  authority: AuthorityBands;
}

export const JOB_LEVELS: JobLevelDef[] = [
  {
    id: "TRAINEE", label: "Trainee", color: "bg-slate-100 text-slate-700",
    description: "New hires in onboarding. Tight authority; every demand >$10k or settlement reviewed by supervisor.",
    authority: { settlement: 5000, demand: 10000, lienReduction: 0.10, closure: 10000 },
  },
  {
    id: "JUNIOR", label: "Junior", color: "bg-blue-100 text-blue-800",
    description: "1–2 years experience. Routine recoveries handled solo; complex cases co-staffed.",
    authority: { settlement: 10000, demand: 20000, lienReduction: 0.20, closure: 20000 },
  },
  {
    id: "MID", label: "Mid", color: "bg-violet-100 text-violet-800",
    description: "3–5 years experience. Full case ownership; supervisor approval only on settlements above limit.",
    authority: { settlement: 25000, demand: 35000, lienReduction: 0.25, closure: 35000 },
  },
  {
    id: "SENIOR", label: "Senior", color: "bg-emerald-100 text-emerald-800",
    description: "5+ years; mentors junior staff. Broadest analyst authority; manager approval only for exceptional cases.",
    authority: { settlement: 50000, demand: 75000, lienReduction: 0.35, closure: 75000 },
  },
];
