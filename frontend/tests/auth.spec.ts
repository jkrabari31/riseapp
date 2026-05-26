import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login successfully with default credentials', async ({ page }) => {
    await page.goto('/login');

    // Check if we are on the login page
    await expect(page).toHaveTitle(/Welcome/);
    
    // Fill in credentials
    await page.fill('input[type="email"]', 'admin@rise.in');
    await page.fill('input[type="password"]', 'password123');
    
    // Click login button
    await page.click('button[type="submit"]');

    // Should redirect to dashboard (CEO Dashboard for admin usually)
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Sign Out')).toBeVisible();
  });

  test('should show error message on failed login', async ({ page }) => {
    await page.goto('/login');

    // Fill in wrong credentials
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Click login button
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator('text=Login failed')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@rise.in');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Logout
    await page.click('text=Sign Out');

    // Should redirect back to login
    await expect(page).toHaveURL(/.*login/);
  });
});
