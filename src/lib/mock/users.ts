import type { User } from "@/lib/types/user";

// NOTE: The prototype had u_jm as role: "SENIOR_ANALYST".
// Per the canonical four-role model, that is migrated to role: "ANALYST", level: "SENIOR".
// SENIOR_ANALYST is NOT a valid Role — seniority is carried on the `level` field.
export const USERS: User[] = [
  {
    id: "u_jm", name: "J. Mueller", initials: "JM", role: "ANALYST", status: "ACTIVE",
    teamId: "team_a", level: "SENIOR",
    authority: { settlement: 50000, demand: 75000, lienReduction: 0.35, closure: 75000, letterOverride: 1, templatePublication: 0 },
  },
  {
    id: "u_kn", name: "K. Nguyen", initials: "KN", role: "ANALYST", status: "ACTIVE",
    teamId: "team_a", level: "MID",
    authority: { settlement: 25000, demand: 35000, lienReduction: 0.25, closure: 35000, letterOverride: 0, templatePublication: 0 },
  },
  {
    id: "u_aw", name: "A. Whitfield", initials: "AW", role: "ANALYST", status: "ACTIVE",
    teamId: "team_a", level: "JUNIOR",
    authority: { settlement: 10000, demand: 20000, lienReduction: 0.20, closure: 20000, letterOverride: 0, templatePublication: 0 },
  },
  {
    id: "u_ml", name: "M. Lindgren", initials: "ML", role: "ANALYST", status: "ACTIVE",
    teamId: "team_b", level: "MID",
    authority: { settlement: 25000, demand: 35000, lienReduction: 0.25, closure: 35000, letterOverride: 0, templatePublication: 0 },
  },
  {
    id: "u_dp", name: "D. Pemberton", initials: "DP", role: "ANALYST", status: "ACTIVE",
    teamId: "team_b", level: "MID",
    authority: { settlement: 25000, demand: 35000, lienReduction: 0.25, closure: 35000, letterOverride: 0, templatePublication: 0 },
  },
  {
    id: "u_tr", name: "T. Ramos", initials: "TR", role: "SUPERVISOR", status: "ACTIVE",
    teamId: "team_a",
  },
  {
    id: "u_sb", name: "S. Bergstrom", initials: "SB", role: "SUPERVISOR", status: "ACTIVE",
    teamId: "team_b",
  },
  {
    id: "u_db", name: "D. Berger", initials: "DB", role: "MANAGER", status: "ACTIVE",
    teamId: null,
  },
  {
    id: "u_ad", name: "A. Donnelly", initials: "AD", role: "ADMIN", status: "ACTIVE",
    teamId: null,
  },
];
