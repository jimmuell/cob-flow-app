import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSet = vi.fn();
const mockCookieStore = {
  get: vi.fn(),
  set: mockSet,
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { setRoleToggleAction, setActiveTenantAction } = await import("@/lib/actions/session");
import { revalidatePath } from "next/cache";

describe("setRoleToggleAction — role cycle", () => {
  beforeEach(() => vi.clearAllMocks());

  const cases: Array<[string, string]> = [
    ["u_jm", "u_tr"],   // ANALYST → SUPERVISOR
    ["u_tr", "u_db"],   // SUPERVISOR → MANAGER
    ["u_db", "u_ad"],   // MANAGER → ADMIN
    ["u_ad", "u_jm"],   // ADMIN → ANALYST
    ["u_unknown", "u_jm"], // fallback → ANALYST
  ];

  it.each(cases)("advances %s → %s", async (current, expected) => {
    mockCookieStore.get.mockReturnValue({ value: current });
    await setRoleToggleAction();
    expect(mockSet).toHaveBeenCalledWith(
      "cob_user_id",
      expected,
      expect.objectContaining({ httpOnly: true, path: "/" })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("setActiveTenantAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("writes the tenantId cookie and revalidates", async () => {
    const fd = new FormData();
    fd.set("tenantId", "t_vendor");
    await setActiveTenantAction(fd);
    expect(mockSet).toHaveBeenCalledWith(
      "cob_tenant_id",
      "t_vendor",
      expect.objectContaining({ httpOnly: true, path: "/" })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
