export interface Team {
  id: string;
  name: string;
  supervisorId: string;
  managerId: string;
  description: string;
}

export const TEAMS: Team[] = [
  {
    id: "team_a", name: "Subrogation Team A", supervisorId: "u_tr", managerId: "u_db",
    description: "Primary WI auto-recovery team. Mixed-level roster.",
  },
  {
    id: "team_b", name: "Subrogation Team B", supervisorId: "u_sb", managerId: "u_db",
    description: "Specializes in ERISA self-funded plan recoveries and complex liens.",
  },
];
