import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each navigation test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@rise.in');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should navigate to Students page', async ({ page }) => {
    await page.click('text=Students');
    await expect(page).toHaveURL(/.*students/);
    await expect(page.locator('h1')).toContainText('Students');
  });

  test('should navigate to Teachers page', async ({ page }) => {
    await page.click('text=Teachers');
    await expect(page).toHaveURL(/.*teachers/);
    await expect(page.locator('h1')).toContainText('Trainers'); // Assuming it says Trainers
  });

  test('should navigate to Attendance page', async ({ page }) => {
    await page.click('text=Attendance');
    await expect(page).toHaveURL(/.*attendance/);
    await expect(page.locator('h1')).toContainText('Attendance');
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.click('text=Settings');
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.locator('h1')).toContainText('Settings');
  });
});
