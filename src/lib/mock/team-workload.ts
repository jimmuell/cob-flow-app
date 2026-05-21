export interface TeamWorkload {
  userId: string;
  openClaims: number;
  inNegotiation: number;
  closedLast30: number;
  avgCycleDays: number;
}

export const TEAM_WORKLOAD: TeamWorkload[] = [
  { userId: "u_jm", openClaims: 3, inNegotiation: 1, closedLast30: 8, avgCycleDays: 38 },
  { userId: "u_kn", openClaims: 2, inNegotiation: 2, closedLast30: 4, avgCycleDays: 52 },
  { userId: "u_ml", openClaims: 2, inNegotiation: 1, closedLast30: 5, avgCycleDays: 41 },
  { userId: "u_dp", openClaims: 2, inNegotiation: 0, closedLast30: 6, avgCycleDays: 44 },
  { userId: "u_aw", openClaims: 1, inNegotiation: 0, closedLast30: 2, avgCycleDays: 67 },
];
