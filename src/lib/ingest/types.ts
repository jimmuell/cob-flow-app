// Ingest types — pass 1 stubs; pass 2 real ingest pipeline.

export interface IncomingClaim {
  memberId: string;
  claimId: string;
  serviceDate: string;
  diagnosisCodes: string[];
  procedureCodes?: string[];
  providerNpi?: string;
  billedAmount: number;
  paidAmount?: number;
  dateOfLoss?: string;
  placeOfService?: string;
  raw?: Record<string, unknown>;
}

export interface CustomerFeed {
  id: string;
  customerId: string;
  feedType: "SFTP" | "X12_837" | "FLAT_FILE" | "API";
  status: "HEALTHY" | "DEGRADED" | "FAILED" | "SUSPENDED";
  lastReceivedAt?: string;
  lastParsedAt?: string;
  recordCountToday?: number;
  errorCountLast7Days?: number;
}

export interface IngestResult {
  fileId: string;
  recordCount: number;
  parsedCount: number;
  errorCount: number;
  errors: Array<{ recordLine: number; type: string; message: string; raw?: string }>;
  attachedToCases: Array<{
    claimId: string;
    caseId: string;
    transition?: "NEW_CASE" | "ATTACH" | "LATE_ARRIVAL";
  }>;
}
