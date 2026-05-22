import { test, expect } from '@playwright/test';

test.describe('Admin Content Catalog', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('non-admin is redirected away from /admin/content', async ({ page }) => {
    // Sign in as Analyst (J. Mueller) — not Admin
    await page.goto('/signin');
    await page.getByRole('button', { name: /J\. Mueller/ }).click();
    await expect(page).toHaveURL('/dashboard');

    await page.goto('/admin/content');
    // Layout redirects non-admins to /dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('admin can reach /admin/content and sees catalog tabs', async ({ page }) => {
    await page.goto('/signin');
    // A. Donnelly is the Admin demo account
    await page.getByRole('button', { name: /A\. Donnelly/ }).click();
    await expect(page).toHaveURL('/dashboard');

    await page.goto('/admin/content');
    await expect(page).toHaveURL('/admin/content');

    await expect(page.getByText('Content Catalog')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Sequences/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Courses/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Quizzes/ })).toBeVisible();
  });

  test('admin can navigate to New Sequence form', async ({ page }) => {
    await page.goto('/signin');
    await page.getByRole('button', { name: /A\. Donnelly/ }).click();
    await page.goto('/admin/content');

    await page.getByRole('link', { name: '+ New Sequence' }).click();
    await expect(page).toHaveURL('/admin/content/sequences/new');
    await expect(page.getByText('New Sequence')).toBeVisible();
    await expect(page.getByLabel('Name *')).toBeVisible();
    await expect(page.getByLabel('Slug *')).toBeVisible();
  });

  test('New Sequence form auto-generates slug from name', async ({ page }) => {
    await page.goto('/signin');
    await page.getByRole('button', { name: /A\. Donnelly/ }).click();
    await page.goto('/admin/content/sequences/new');

    await page.getByLabel('Name *').fill('Auto COB Wisconsin');
    await expect(page.getByLabel('Slug *')).toHaveValue('auto-cob-wisconsin');
  });

  test('admin can navigate to New Course form', async ({ page }) => {
    await page.goto('/signin');
    await page.getByRole('button', { name: /A\. Donnelly/ }).click();
    await page.goto('/admin/content');

    await page.getByRole('tab', { name: /Courses/ }).click();
    await page.getByRole('link', { name: '+ New Course' }).click();
    await expect(page).toHaveURL('/admin/content/courses/new');
    await expect(page.getByText('New Course')).toBeVisible();
  });
});
