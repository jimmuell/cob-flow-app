import type { Role, JobLevel, AuthorityBands } from "@/lib/types/role";

export interface User {
  id: string;
  name: string;
  initials: string;
  /** Canonical four-role model. SENIOR_ANALYST does not exist — use role: "ANALYST" + level: "SENIOR". */
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  teamId: string | null;
  /** Present for ANALYST role users. */
  level?: JobLevel;
  /** Present for ANALYST role users; reflects effective limits after any overrides. */
  authority?: AuthorityBands;
}
