import { test, expect } from "@playwright/test";

test.describe("Phase B: Auth + App Shell", () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test("unauthenticated visit to / redirects to /signin", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/signin");
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });

  test("sign-in via demo accounts panel works for Analyst (J. Mueller)", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: /J\. Mueller/ }).click();
    await expect(page).toHaveURL("/dashboard");
    // exact:true avoids matching the "COB Flow Recovery — Brookfield" tenant <option> inside the header
    await expect(page.locator("header").getByText("COB Flow", { exact: true })).toBeVisible();
  });

  test("sign-in via email form works", async ({ page }) => {
    await page.goto("/signin");
    await page.fill('input[name="email"]', "u_tr@cobflow.demo");
    await page.fill('input[name="password"]', "anything");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("sign-out from account menu returns to /signin", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: /J\. Mueller/ }).click();
    await expect(page).toHaveURL("/dashboard");

    // Click the avatar to open the Radix DropdownMenu
    await page.getByRole("button", { name: "Open account menu" }).click();
    // Wait for the menu to be fully rendered before clicking — this is the
    // integration seam that the unit tests couldn't cover (Radix requires
    // real pointer events; jsdom can't open the menu).
    const signOutItem = page.getByRole("menuitem", { name: "Sign out" });
    await expect(signOutItem).toBeVisible();
    await signOutItem.click();
    await expect(page).toHaveURL("/signin");
  });

  test("role toggle cycles Analyst → Supervisor → Manager → Admin → Analyst with sidebar gating", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: /J\. Mueller/ }).click();
    await expect(page).toHaveURL("/dashboard");

    // Start: Analyst — Management and Admin absent from sidebar
    await expect(page.getByRole("link", { name: "Management" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();

    // → Supervisor (T. Ramos): Management appears, Admin absent
    // Scope role label checks to the toggle button to avoid matching sidebar links/chips elsewhere
    await page.getByTitle(/Toggle demo role/).click();
    await expect(page.getByTitle(/Toggle demo role/)).toContainText("Supervisor");
    await expect(page.getByRole("link", { name: "Management" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();

    // → Manager (D. Berger): Management still visible
    await page.getByTitle(/Toggle demo role/).click();
    await expect(page.getByTitle(/Toggle demo role/)).toContainText("Manager");
    await expect(page.getByRole("link", { name: "Management" })).toBeVisible();

    // → Admin (S. Patel): Management gone, Admin appears
    await page.getByTitle(/Toggle demo role/).click();
    await expect(page.getByTitle(/Toggle demo role/)).toContainText("Admin");
    await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Management" })).not.toBeVisible();

    // → Back to Analyst (J. Mueller): both gone
    await page.getByTitle(/Toggle demo role/).click();
    await expect(page.getByTitle(/Toggle demo role/)).toContainText("Analyst");
    await expect(page.getByRole("link", { name: "Management" })).not.toBeVisible();
    await expect(page.getByRole("link", { name: "Admin" })).not.toBeVisible();
  });

  test("tenant dropdown updates the customer-mode info box", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: /J\. Mueller/ }).click();
    await expect(page).toHaveURL("/dashboard");

    // Default tenant: Lakeshore Health Plan → "Carrier in-house" in the sidebar info box
    // Scope to aside to avoid matching the selected <option> text in the tenant dropdown
    await expect(page.locator("aside").getByText("Carrier in-house")).toBeVisible();

    // Switch to Badger State Subrogation Services (t_vendor)
    await page.selectOption('select[name="tenantId"]', "t_vendor");
    await expect(page.locator("aside").getByText("Subrogation vendor / TPA")).toBeVisible();
  });

  test("mobile sidebar opens on hamburger tap and closes on backdrop click", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/signin");
    await page.getByRole("button", { name: /J\. Mueller/ }).click();
    await expect(page).toHaveURL("/dashboard");

    // Sidebar sheet is hidden at start — hamburger visible, sheet absent
    const hamburger = page.getByRole("button", { name: "Toggle sidebar" });
    await expect(hamburger).toBeVisible();
    const sheet = page.locator("aside.fixed");
    await expect(sheet).not.toBeVisible();

    // Tap hamburger → sheet appears with nav links
    await hamburger.click();
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Dashboard" })).toBeVisible();

    // Tap backdrop → sheet closes
    await page.locator(".fixed.inset-0").click({ position: { x: 350, y: 300 } });
    await expect(sheet).not.toBeVisible();
  });

  test("already signed-in visit to /signin redirects to /dashboard", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("button", { name: /J\. Mueller/ }).click();
    await expect(page).toHaveURL("/dashboard");

    await page.goto("/signin");
    await expect(page).toHaveURL("/dashboard");
  });
});
