/** The four canonical roles in the COB Flow system. */
export type Role = "ANALYST" | "SUPERVISOR" | "MANAGER" | "ADMIN";

/** Analyst seniority levels. SENIOR is a level, not a role. */
export type JobLevel = "TRAINEE" | "JUNIOR" | "MID" | "SENIOR";

/** Authority dollar/percentage bands for analysts and supervisors. */
export interface AuthorityBands {
  settlement: number;
  demand: number;
  lienReduction: number;
  closure: number;
}
