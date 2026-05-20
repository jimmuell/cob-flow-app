import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

// Import after mock setup so the top-level import in session.ts is intercepted
const { getActiveTenant } = await import("@/lib/auth/session");

describe("getActiveTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the stored tenant id when cookie is set", async () => {
    mockCookieStore.get.mockReturnValue({ value: "t_vendor" });
    expect(await getActiveTenant()).toBe("t_vendor");
  });

  it("defaults to t_carrier when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    expect(await getActiveTenant()).toBe("t_carrier");
  });
});
