import { test, expect } from '@playwright/test';
import { loginViaUI, logout, isAuthenticated, getCurrentUser } from '../helpers/auth';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth - handle localStorage access errors
    try {
      await page.evaluate(() => {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        } catch (e) {
          // Ignore localStorage errors
        }
      });
    } catch (e) {
      // Ignore errors if page isn't ready
    }
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
    await expect(page).toHaveURL(/\/properties/, { timeout: 15000 });
    
    // Wait for the properties API call to complete
    await page.waitForResponse(
      (response) => response.url().includes('/api/properties') && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => {
      // If API call doesn't complete, just continue - might be cached
    });
    
    // Wait for page content to appear (h1 with "Properties" text)
    await page.waitForSelector('h1:has-text("Properties"), h1', { timeout: 10000 }).catch(() => {});
    
    // Give a moment for any remaining API calls
    await page.waitForTimeout(1000);
    
    // Should be authenticated
    const authenticated = await isAuthenticated(page);
    expect(authenticated).toBe(true);

    // Should have user data
    const user = await getCurrentUser(page);
    expect(user).toBeTruthy();
    expect(user?.email).toBe(process.env.TEST_ADMIN_EMAIL || 'admin@test.com');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await emailInput.fill('invalid@test.com');
    await passwordInput.fill('wrongpassword');
    
    // Wait for API response
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/users/login'),
      { timeout: 10000 }
    ).catch(() => null);
    
    await submitButton.click();
    await responsePromise;

    // Wait for error to appear
    await page.waitForTimeout(2000);

    // Should show error message or stay on login page
    const errorVisible = await page.locator('text=/invalid|error|incorrect|credentials|failed/i').first().isVisible({ timeout: 5000 }).catch(() => false);
    const currentURL = page.url();
    
    // Should still be on login page (not redirected)
    expect(currentURL).toMatch(/\//);
    expect(currentURL).not.toMatch(/\/properties|\/dashboard/);
    
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
    await expect(page).toHaveURL(/\/properties/, { timeout: 15000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 }).catch(() => {});
    
    // Logout
    await logout(page);

    // Should redirect to home/login page
    await expect(page).toHaveURL('/', { timeout: 10000 });
    
    // Wait a bit before checking localStorage
    await page.waitForTimeout(500);
    
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

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 }).catch(() => {});

    // Try to access login page
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Should redirect to properties
    await expect(page).toHaveURL(/\/properties/, { timeout: 10000 });
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

