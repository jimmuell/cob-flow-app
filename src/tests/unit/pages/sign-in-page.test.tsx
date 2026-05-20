import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock the server action so the sign-in page can be rendered in jsdom
vi.mock("@/lib/actions/auth", () => ({ signInAction: vi.fn() }));

import SignInPage from "@/app/(auth)/signin/page";

describe("SignInPage — error display (CP2 coverage)", () => {
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

  it("renders all 9 demo account buttons", async () => {
    const element = await SignInPage({
      searchParams: Promise.resolve({}),
    });
    render(element);
    expect(screen.getByText("Demo accounts")).toBeInTheDocument();
    expect(screen.getByText("J. Mueller")).toBeInTheDocument();
    expect(screen.getByText("S. Patel")).toBeInTheDocument();
    // 9 hidden userId inputs = 9 demo users
    const hiddenInputs = document.querySelectorAll('input[name="userId"]');
    expect(hiddenInputs).toHaveLength(9);
  });
});
