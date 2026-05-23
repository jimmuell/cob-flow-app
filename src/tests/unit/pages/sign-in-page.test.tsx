import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

// Mock server-only dependencies
vi.mock("@/lib/actions/auth", () => ({ signInAction: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import SignInPage from "@/app/(auth)/signin/page";

describe("SignInPage — authenticated redirect (T9-fix regression)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls redirect('/dashboard') when getCurrentUser() returns a user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({
      id: "u_jm",
      name: "J. Mueller",
      initials: "JM",
      email: "u_jm@cobflow.demo",
      roles: ["ANALYST"],
      level: "SENIOR",
      tenantId: "t_carrier",
    });
    await SignInPage({ searchParams: Promise.resolve({}) });
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard");
  });
});

describe("SignInPage — error display (CP2 coverage)", () => {
  beforeEach(() => vi.clearAllMocks());
  it("shows the error banner when searchParams.error is set", async () => {
    const element = await SignInPage({
      searchParams: Promise.resolve({ error: "Invalid%20credentials" }),
    });
    render(element);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid credentials");
  });

  it("does not render error banner when searchParams.error is absent", async () => {
    const element = await SignInPage({
      searchParams: Promise.resolve({}),
    });
    render(element);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders all 9 demo account buttons with role-only chips (no Senior Analyst)", async () => {
    const element = await SignInPage({
      searchParams: Promise.resolve({}),
    });
    render(element);
    expect(screen.getByText("Demo accounts")).toBeInTheDocument();
    expect(screen.getByText("J. Mueller")).toBeInTheDocument();
    expect(screen.getByText("A. Donnelly")).toBeInTheDocument();
    // 9 hidden userId inputs = 9 demo users
    const hiddenInputs = document.querySelectorAll('input[name="userId"]');
    expect(hiddenInputs).toHaveLength(9);
    // Job Level must not surface in the chip — J. Mueller renders "Analyst" not "Senior Analyst"
    expect(screen.queryByText("Senior Analyst")).not.toBeInTheDocument();
  });
});
