export type FileAuthorityGrantStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export interface FileAuthorityGrantBoost {
  settlement?: number;
  demand?: number;
  lienReduction?: number;
}

/**
 * File-level authority grants — supervisor elevates an analyst's authority for
 * a specific claim file (not a permanent level/limit change). Scope is per-claim
 * and per-action. Auto-expires when the claim is closed; revocable manually.
 * Audit log carries the full lifecycle.
 */
export interface FileAuthorityGrant {
  id: string;
  claimId: string;
  analystId: string;
  grantedBy: string;
  grantedAt: string;
  status: FileAuthorityGrantStatus;
  expiry: "FILE_CLOSE" | string;
  authorityBoost: FileAuthorityGrantBoost;
  justification: string;
}

export const FILE_AUTHORITY_GRANTS: FileAuthorityGrant[] = [
  {
    id: "fag_001", claimId: "c004", analystId: "u_kn", grantedBy: "u_tr",
    grantedAt: "2026-05-15T09:00:00Z", status: "ACTIVE",
    expiry: "FILE_CLOSE",
    authorityBoost: { settlement: 50000, demand: 50000, lienReduction: 0.35 },
    justification: "Brennan settlement on track to close at $30k+; routine negotiation but exceeds K. Nguyen's $25k settlement ceiling. Analyst owns the file, has relationship with Brennan Law. Boost avoids re-approval friction.",
  },
];
