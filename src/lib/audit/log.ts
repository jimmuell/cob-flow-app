export interface AuditEvent {
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  justification?: string;
  metadata?: Record<string, unknown>;
  category: "WORKFLOW" | "CONFIG" | "INGEST" | "AUTH" | "AUTHORITY" | "LEARNING";
  tenantId: string;
}

// Pass 1: in-memory array. Pass 2: writes to Postgres via Drizzle.
// Never mutate existing entries — append only.
const _store: AuditEvent[] = [];

export const auditLog = {
  async record(event: AuditEvent): Promise<void> {
    _store.push({ ...event, timestamp: event.timestamp ?? new Date().toISOString() });
  },

  getAll(): readonly AuditEvent[] {
    return _store;
  },
};
