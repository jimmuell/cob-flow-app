export type SystemEventCategory = "INGEST" | "CONFIG" | "WORKFLOW" | "AUTH" | "SECURITY";

export interface SystemEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  category: SystemEventCategory;
}

export const SYSTEM_EVENTS: SystemEvent[] = [
  {
    id: "ev_001", timestamp: "2026-05-19T07:04:00Z", actor: "system", action: "CLAIM_FEED_SYNC",
    target: "t_carrier", detail: "Daily SFTP sync · 412 records ingested · 0 errors", category: "INGEST",
  },
  {
    id: "ev_002", timestamp: "2026-05-19T03:14:00Z", actor: "system", action: "INGEST_LATE_ARRIVAL",
    target: "c006", detail: "Late-arriving claim c006b (Aurora Sheboygan Rehab · $4,720) attached to closed case · supervisor decision queued", category: "INGEST",
  },
  {
    id: "ev_003", timestamp: "2026-05-18T09:11:00Z", actor: "system", action: "INGEST_PARSE_ERROR",
    target: "feed_002", detail: "X12 837 parse warning · 14 records with missing date-of-loss · ingested with flag", category: "INGEST",
  },
  {
    id: "ev_004", timestamp: "2026-05-17T09:14:00Z", actor: "D. Berger", action: "AUTHORITY_LIMIT_CHANGE",
    target: "u_aw", detail: "Increased A. Whitfield demand authority $15k → $20k", category: "CONFIG",
  },
  {
    id: "ev_005", timestamp: "2026-05-17T08:02:00Z", actor: "system", action: "CLAIM_FEED_SYNC",
    target: "t_vendor", detail: "Weekly X12 batch sync · 712 records ingested · 14 warnings", category: "INGEST",
  },
  {
    id: "ev_006", timestamp: "2026-05-16T15:33:00Z", actor: "T. Ramos", action: "OVERRIDE_LETTER_LOCK",
    target: "c004", detail: "Approved override edit on LIEN_REDUCTION_OFFER per analyst request", category: "WORKFLOW",
  },
  {
    id: "ev_007", timestamp: "2026-05-16T11:05:00Z", actor: "D. Berger", action: "TEMPLATE_PUBLISHED",
    target: "tpl_demand_auto", detail: "Demand template v1.3 published (Ins 3.40(18) citation added)", category: "CONFIG",
  },
  {
    id: "ev_008", timestamp: "2026-05-15T11:42:00Z", actor: "system", action: "CLAIM_FEED_SYNC",
    target: "t_indie", detail: "Secure-email ingest · 28 records ingested · 0 errors", category: "INGEST",
  },
  {
    id: "ev_009", timestamp: "2026-05-15T10:21:00Z", actor: "D. Berger", action: "USER_CREATED",
    target: "u_aw", detail: "Created A. Whitfield (Analyst, Junior level)", category: "CONFIG",
  },
];
