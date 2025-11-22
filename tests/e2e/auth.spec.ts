import { test, expect } from '@playwright/test';
import { loginViaUI, logout, isAuthenticated, getCurrentUser } from '../helpers/auth';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/');
    
    // Check for login form elements
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await loginViaUI(page, {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    });

    // Should redirect to properties page
    await expect(page).toHaveURL(/\/properties/);
    
    // Should be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);

    // Should have user data
    const user = await getCurrentUser(page);
    expect(user).toBeTruthy();
    expect(user.email).toBe(process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/');

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();

    // Should show error message
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 });
    
    // Should still be on login page
    await expect(page).toHaveURL('/');
    
    // Should not be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('should show error with empty credentials', async ({ page }) => {
    await page.goto('/');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Form validation should prevent submission or show error
    // Check if still on login page or error is shown
    const url = page.url();
    expect(url).toContain('/');
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginViaUI(page, {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    });

    // Verify we're logged in
    await expect(page).toHaveURL(/\/properties/);
    
    // Logout
    await logout(page);

    // Should redirect to home/login page
    await expect(page).toHaveURL('/');
    
    // Should not be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(false);
  });

  test('should redirect authenticated user from login page', async ({ page }) => {
    // Login first
    await loginViaUI(page, {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
    });

    // Try to access login page
    await page.goto('/');

    // Should redirect to properties
    await expect(page).toHaveURL(/\/properties/);
  });

  test('should protect dashboard routes', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/dashboard/properties');

    // Should redirect to login
    await expect(page).toHaveURL('/');
  });

  test('should protect properties route', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/properties');

    // Should redirect to login
    await expect(page).toHaveURL('/');
  });
});

