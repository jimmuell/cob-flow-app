import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleChip } from "@/components/shared/role-chip";

describe("RoleChip", () => {
  it("renders initials", () => {
    render(<RoleChip role="ANALYST" initials="JM" />);
    expect(screen.getByText("JM")).toBeInTheDocument();
  });

  it("renders role label when showLabel is true", () => {
    render(<RoleChip role="SUPERVISOR" initials="TR" showLabel />);
    expect(screen.getByText("Supervisor")).toBeInTheDocument();
  });

  it("does not render role label by default", () => {
    render(<RoleChip role="MANAGER" initials="DB" />);
    expect(screen.queryByText("Manager")).not.toBeInTheDocument();
  });

  it("applies ANALYST color classes", () => {
    const { container } = render(<RoleChip role="ANALYST" initials="JM" />);
    expect(container.firstChild).toHaveClass("border-slate-300");
    expect(container.firstChild).toHaveClass("bg-slate-200");
  });

  it("applies SUPERVISOR color classes", () => {
    const { container } = render(<RoleChip role="SUPERVISOR" initials="TR" />);
    expect(container.firstChild).toHaveClass("border-violet-300");
    expect(container.firstChild).toHaveClass("bg-violet-200");
  });

  it("applies ADMIN color classes", () => {
    const { container } = render(<RoleChip role="ADMIN" initials="SP" />);
    expect(container.firstChild).toHaveClass("border-amber-300");
  });
});
