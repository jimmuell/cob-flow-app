import type { Role, JobLevel, AuthorityBands } from "@/lib/types/role";
import { cookies } from "next/headers";

export interface CurrentUser {
  id: string;
  name: string;
  initials: string;
  email: string;
  roles: Role[];
  level?: JobLevel;
  teamId?: string | null;
  authority?: AuthorityBands;
  tenantId: string;
}

// Pass 1: cookie-backed mock session. Pass 2: swap to Supabase Auth without
// changing call sites.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const userId = jar.get("cob_user_id")?.value;
  if (!userId) return null;

  const { USERS } = await import("@/lib/mock/users");
  const user = USERS.find((u) => u.id === userId);
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    email: `${user.id}@cobflow.demo`,
    roles: [user.role],
    level: user.level,
    teamId: user.teamId,
    authority: user.authority,
    tenantId: "t_carrier",
  };
}

export async function signIn(
  emailOrUserId: string,
  _password: string
): Promise<CurrentUser> {
  const { cookies } = await import("next/headers");
  const { USERS } = await import("@/lib/mock/users");

  const user =
    USERS.find((u) => u.id === emailOrUserId) ??
    USERS.find((u) => `${u.id}@cobflow.demo` === emailOrUserId);

  if (!user) throw new Error("Invalid credentials");

  (await cookies()).set("cob_user_id", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    email: `${user.id}@cobflow.demo`,
    roles: [user.role],
    level: user.level,
    teamId: user.teamId,
    authority: user.authority,
    tenantId: "t_carrier",
  };
}

export async function signOut(): Promise<void> {
  const { cookies } = await import("next/headers");
  (await cookies()).delete("cob_user_id");
}

export async function getActiveTenant(): Promise<string> {
  // Default to t_carrier (Lakeshore Health Plan) — the pass-1 single tenant and the demo's opening posture.
  const jar = await cookies();
  return jar.get("cob_tenant_id")?.value ?? "t_carrier";
}
