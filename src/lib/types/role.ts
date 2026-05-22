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
  /** Binary capability (0 = not granted, 1 = granted): override template letter selections. */
  letterOverride: number;
  /** Binary capability (0 = not granted, 1 = granted): publish new letter templates. */
  templatePublication: number;
}
