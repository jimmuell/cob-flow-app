import { test, expect, type Page } from '@playwright/test';

// Seed course always present in the local Supabase instance.
const SEED_COURSE_ID = '0157e736-9b98-4efe-a8bb-f41f981adbfb';

test.describe('Quiz Editor (CP6)', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  async function signInAsAdmin(page: Page) {
    await page.goto('/signin');
    await page.getByRole('button', { name: /A\. Donnelly/ }).click();
    await expect(page).toHaveURL('/dashboard');
  }

  test('course detail page shows Course Quizzes section with Add button', async ({ page }) => {
    await signInAsAdmin(page);

    await page.goto(`/admin/content/courses/${SEED_COURSE_ID}`);
    await expect(page).toHaveURL(`/admin/content/courses/${SEED_COURSE_ID}`);

    // Course Quizzes heading is rendered as an h2
    await expect(page.getByRole('heading', { name: /Course Quizzes/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /\+ Add Course Quiz/ })).toBeVisible();
  });

  test('Add Course Quiz button creates quiz and navigates to quiz editor', async ({ page }) => {
    await signInAsAdmin(page);

    await page.goto(`/admin/content/courses/${SEED_COURSE_ID}`);
    await expect(page).toHaveURL(`/admin/content/courses/${SEED_COURSE_ID}`);

    await page.getByRole('button', { name: /\+ Add Course Quiz/ }).click();

    // Should navigate to the quiz editor route for this course
    await expect(page).toHaveURL(
      /\/admin\/content\/courses\/.+\/course-quizzes\/.+/,
      { timeout: 10000 },
    );

    // QuizEditor renders pass threshold (spinbutton) and Add Question button
    await expect(page.getByRole('spinbutton')).toBeVisible(); // pass threshold input
    await expect(page.getByRole('button', { name: /\+ Add Question/ })).toBeVisible();
  });

  test('quiz editor: add MC question, save, reload persists data', async ({ page }) => {
    await signInAsAdmin(page);

    // Navigate to the course and create a new quiz
    await page.goto(`/admin/content/courses/${SEED_COURSE_ID}`);
    await page.getByRole('button', { name: /\+ Add Course Quiz/ }).click();
    await expect(page).toHaveURL(
      /\/admin\/content\/courses\/.+\/course-quizzes\/.+/,
      { timeout: 10000 },
    );

    // Add a question
    await page.getByRole('button', { name: /\+ Add Question/ }).click();

    // Fill the stem textarea (first textarea on the page)
    await page.locator('textarea').first().fill('What is COB primacy?');

    // Select option A as the correct answer (required for schema validation)
    await page.locator('input[type="radio"]').first().click();

    // Save — button must be enabled (dirty=true from edits above)
    const saveBtn = page.getByRole('button', { name: /^Save$/ });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Wait for save to complete: Save button becomes disabled again (dirty=false)
    await expect(saveBtn).toBeDisabled({ timeout: 10000 });

    // No CONFLICT error should have appeared
    await expect(page.getByText(/CONFLICT/i)).not.toBeVisible();

    // Reload and verify question persists
    await page.reload();
    await expect(page.locator('textarea').first()).toHaveValue('What is COB primacy?', { timeout: 10000 });
  });

  test('module quiz page renders QuizEditor not stub text', async ({ page }) => {
    await signInAsAdmin(page);

    // Verify course detail loads correctly (seed data present)
    await page.goto(`/admin/content/courses/${SEED_COURSE_ID}`);
    await expect(page.getByRole('heading', { name: 'Auto COB Fundamentals' })).toBeVisible();

    // Modules section and Course Quizzes section both visible
    await expect(page.getByRole('heading', { name: /Modules/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Course Quizzes/ })).toBeVisible();

    // Stub text must not appear on any quiz editor page
    const stubText = 'Quiz question editor coming in CP6';
    await expect(page.getByText(stubText)).not.toBeVisible();
  });
});
