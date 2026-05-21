/**
 * Coaching notes — role-private notes by supervisors on their analysts,
 * and by managers on their supervisors. NOT part of the formal audit trail.
 *
 * Visibility:
 *   - "SUP_AND_MGR": supervisor's notes on an analyst — visible to that supervisor and the manager above
 *   - "MGR_ONLY": manager's notes on a supervisor — visible to manager only
 */
export type CoachingNoteVisibility = "SUP_AND_MGR" | "MGR_ONLY";

export interface CoachingNote {
  id: string;
  authorId: string;
  targetId: string;
  visibility: CoachingNoteVisibility;
  timestamp: string;
  note: string;
}

export const COACHING_NOTES: CoachingNote[] = [
  // Supervisor T. Ramos notes on her analysts
  {
    id: "cn_001", authorId: "u_tr", targetId: "u_aw", visibility: "SUP_AND_MGR",
    timestamp: "2026-05-12T14:30:00Z",
    note: "Aaron is closer to Mid readiness than the QC concern from April suggested. Watch utilization through end of month; if it stays > 70% propose promotion.",
  },
  {
    id: "cn_002", authorId: "u_tr", targetId: "u_kn", visibility: "SUP_AND_MGR",
    timestamp: "2026-05-08T11:00:00Z",
    note: "Karen handles ERISA self-funded cases well; consider rotating more of those her way. Senior eligibility late Q3 if performance holds.",
  },
  {
    id: "cn_003", authorId: "u_tr", targetId: "u_jm", visibility: "SUP_AND_MGR",
    timestamp: "2026-04-22T09:15:00Z",
    note: "J. is the Senior tier benchmark. Use her settlement allocations as training material for Aaron and Karen.",
  },
  // Supervisor S. Bergstrom notes on her analysts
  {
    id: "cn_004", authorId: "u_sb", targetId: "u_dp", visibility: "SUP_AND_MGR",
    timestamp: "2026-05-15T10:00:00Z",
    note: "D. Pemberton requested temp authority bump for the ERISA self-funded book — granted via approval queue. Re-evaluate at 60-day mark; if she handles cleanly, propose permanent move.",
  },
  {
    id: "cn_005", authorId: "u_sb", targetId: "u_ml", visibility: "SUP_AND_MGR",
    timestamp: "2026-05-10T13:45:00Z",
    note: "Marcus is solid Mid; not stretching toward Senior signals yet. Consistent throughput.",
  },
  // Manager D. Berger notes on his supervisors
  {
    id: "cn_006", authorId: "u_db", targetId: "u_tr", visibility: "MGR_ONLY",
    timestamp: "2026-05-14T16:20:00Z",
    note: "T. Ramos's approval cadence on routine items is good. Want to see her use file-authority grants more for mid-complexity matters — she's escalating things she could resolve at her level.",
  },
  {
    id: "cn_007", authorId: "u_db", targetId: "u_sb", visibility: "MGR_ONLY",
    timestamp: "2026-05-09T11:30:00Z",
    note: "S. Bergstrom handled the D. Pemberton override request well — clear justification, appropriate scope. Confidence in her judgment growing.",
  },
];
