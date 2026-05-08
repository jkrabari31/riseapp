import { test, expect } from '@playwright/test';

test.describe('Academic Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@rise.in');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('should create a new assignment', async ({ page }) => {
    await page.click('text=Assignments');
    await expect(page).toHaveURL(/.*assignments/);
    
    // Click New Assignment
    await page.click('button:has-text("New Assignment")');
    
    // Fill in assignment details
    await page.fill('placeholder="e.g. Chapter 4 Quiz"', 'Playwright Test Assignment');
    await page.fill('textarea[placeholder*="e.g. Please complete"]', 'Test instructions');
    await page.fill('input[type="date"]', '2026-12-31');
    
    // Question 1
    await page.fill('textarea[placeholder="Write your question here..."]', 'What is Playwright?');
    
    // Add another question
    await page.click('text=Add Another Question');
    
    // Question 2 (Wait for it to appear)
    const questions = page.locator('textarea[placeholder="Write your question here..."]');
    await questions.nth(1).fill('Why do we use automation testing?');
    
    // Save
    await page.click('button:has-text("Save & Distribute Sheet")');
    
    // Verification
    await expect(page.locator('text=Playwright Test Assignment')).toBeVisible();
  });
});
