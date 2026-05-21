// File-level authority grants — pass 1: reads from in-memory fixtures.
// Pass 2: queries Postgres with RLS on tenant_id.
import type { AuthorityBands } from "@/lib/types/role";

export interface FileAuthorityGrant {
  id: string;
  claimId: string;
  analystId: string;
  grantedBy: string;
  grantedAt: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  expiry: "FILE_CLOSE" | string;
  authorityBoost: Partial<AuthorityBands>;
}

export function activeGrantsForClaim(
  grants: FileAuthorityGrant[],
  claimId: string
): FileAuthorityGrant[] {
  return grants.filter((g) => g.claimId === claimId && g.status === "ACTIVE");
}

export function activeGrantForAnalyst(
  grants: FileAuthorityGrant[],
  claimId: string,
  analystId: string
): FileAuthorityGrant | undefined {
  return grants.find(
    (g) => g.claimId === claimId && g.analystId === analystId && g.status === "ACTIVE"
  );
}
