import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const { signInAction, signOutAction } = await import("@/lib/actions/auth");

describe("signInAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets the cob_user_id cookie and redirects to /dashboard for a valid userId", async () => {
    const fd = new FormData();
    fd.set("userId", "u_jm");
    fd.set("password", "any");
    await expect(signInAction(fd)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "cob_user_id",
      "u_jm",
      expect.objectContaining({ httpOnly: true, path: "/" })
    );
  });

  it("sets the cob_user_id cookie and redirects to /dashboard for a valid email", async () => {
    const fd = new FormData();
    fd.set("email", "u_tr@cobflow.demo");
    fd.set("password", "any");
    await expect(signInAction(fd)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "cob_user_id",
      "u_tr",
      expect.any(Object)
    );
  });

  it("redirects to /signin with encoded error param for an unknown userId", async () => {
    const fd = new FormData();
    fd.set("userId", "u_unknown");
    fd.set("password", "any");
    await expect(signInAction(fd)).rejects.toThrow(
      "NEXT_REDIRECT:/signin?error=Invalid%20credentials"
    );
  });

  it("redirects to /signin with error param when email and userId are both missing", async () => {
    const fd = new FormData();
    fd.set("password", "any");
    await expect(signInAction(fd)).rejects.toThrow(
      "NEXT_REDIRECT:/signin?error=Invalid%20credentials"
    );
  });
});

describe("signOutAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the cob_user_id cookie and redirects to /signin", async () => {
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT:/signin");
    expect(mockCookieStore.delete).toHaveBeenCalledWith("cob_user_id");
  });

  // NOTE: This test covers the Server Action in isolation.
  // The component wiring — TopBarClient DropdownMenuItem onSelect → startTransition → signOutAction —
  // cannot be driven in jsdom because Radix DropdownMenu requires pointer events to open.
  // Coverage for the full click→redirect path lives in the CP4 E2E suite:
  //   src/tests/e2e/phase-b.spec.ts  →  "sign out from account menu returns to /signin"
});
