"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const ROLE_CYCLE: Record<string, string> = {
  u_jm: "u_tr",  // J. Mueller (ANALYST)    → T. Ramos (SUPERVISOR)
  u_tr: "u_db",  // T. Ramos (SUPERVISOR)   → D. Berger (MANAGER)
  u_db: "u_ad",  // D. Berger (MANAGER)     → A. Donnelly (ADMIN)
  u_ad: "u_jm",  // A. Donnelly (ADMIN)     → J. Mueller (ANALYST)
};

export async function setRoleToggleAction(): Promise<void> {
  const jar = await cookies();
  const current = jar.get("cob_user_id")?.value ?? "u_jm";
  const next = ROLE_CYCLE[current] ?? "u_jm";
  jar.set("cob_user_id", next, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}

export async function setActiveTenantAction(formData: FormData): Promise<void> {
  const tenantId = formData.get("tenantId") as string;
  const jar = await cookies();
  jar.set("cob_tenant_id", tenantId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/", "layout");
}
