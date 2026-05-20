import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShellContext, useAppShell } from "@/lib/contexts/app-shell-context";
import { useState } from "react";

function TestConsumer() {
  const { sidebarOpen, setSidebarOpen } = useAppShell();
  return (
    <div>
      <span data-testid="state">{sidebarOpen ? "open" : "closed"}</span>
      <button onClick={() => setSidebarOpen((o) => !o)}>toggle</button>
    </div>
  );
}

function TestProvider({ initial = false }: { initial?: boolean }) {
  const [sidebarOpen, setSidebarOpen] = useState(initial);
  return (
    <AppShellContext.Provider value={{ sidebarOpen, setSidebarOpen }}>
      <TestConsumer />
    </AppShellContext.Provider>
  );
}

describe("AppShellContext", () => {
  it("provides sidebarOpen state", () => {
    render(<TestProvider initial={false} />);
    expect(screen.getByTestId("state").textContent).toBe("closed");
  });

  it("updates sidebarOpen via functional updater", async () => {
    render(<TestProvider initial={false} />);
    await userEvent.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("state").textContent).toBe("open");
  });

  it("useAppShell throws when used outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useAppShell must be used within AppShellClient"
    );
    consoleError.mockRestore();
  });
});
