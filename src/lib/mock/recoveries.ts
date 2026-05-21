import type { Recovery } from "@/lib/types/recovery";

export const SAMPLE_RECOVERIES: Recovery[] = [
  { id: "r001", claimId: "c001", target: "American Family Med-Pay", demand: 41210.18, recovered: 0,        stage: "DEMAND_SENT",   assignedTo: "A. Whitfield", opened: "2026-04-22" },
  { id: "r002", claimId: "c002", target: "Quartz Health Plan",      demand: 8210.00,  recovered: 8210.00,  stage: "SETTLED",       assignedTo: "M. Lindgren",  opened: "2026-04-05" },
  { id: "r003", claimId: "c004", target: "American Family Med-Pay", demand: 38520.00, recovered: 25680.00, stage: "NEGOTIATING",   assignedTo: "K. Nguyen",    opened: "2026-04-02" },
  { id: "r004", claimId: "c003", target: "WPS Health Insurance",    demand: 3120.00,  recovered: 0,        stage: "INVESTIGATING", assignedTo: "K. Nguyen",    opened: "2026-05-10" },
];
