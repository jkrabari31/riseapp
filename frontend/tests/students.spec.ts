import { test, expect } from '@playwright/test';

test.describe('Student Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@rise.in');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('should list interns', async ({ page }) => {
    await page.click('text=Students');
    await expect(page).toHaveURL(/.*students/);
    await expect(page.locator('table')).toBeVisible();
  });

  test('should add a new intern', async ({ page }) => {
    await page.click('text=Students');
    await page.click('text=Enroll New Intern'); // Or the button that navigates to add student

    // Section 1: Personal Details
    await page.fill('placeholder=John', 'Test');
    await page.fill('placeholder=Doe', 'Intern');
    await page.fill('input[type="date"]', '2000-01-01');
    await page.selectOption('select', 'Male'); // Gender

    // Section 2: Academic Background
    await page.fill('placeholder="e.g. B.E Computer Science"', 'B.Tech CS');
    await page.fill('label:has-text("College Name") + input', 'Test College');
    await page.fill('label:has-text("University Name") + input', 'Test University');

    // Section 4: Contact
    await page.fill('label:has-text("Personal Mobile") + input', '1234567890');
    await page.fill('label:has-text("Registered Email") + input', 'test.intern@example.com');
    await page.fill('label:has-text("Guardian Contact") + input', '0987654321');
    await page.fill('textarea', '123 Test Street, Test City');
    await page.fill('label:has-text("City") + input', 'Test City');

    // Submit
    await page.click('button:has-text("Register & Enroll Intern")');

    // Verification
    await expect(page.locator('text=Intern Enrolled!')).toBeVisible();
    await expect(page.locator('text=Assigned Registration Number')).toBeVisible();
  });
});
