import { Page } from '@playwright/test';
import * as path from 'path';

const API_BASE_URL = process.env.BACKEND_URL || 'http://localhost:10000/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  message: string;
}

/**
 * Login through the API and return the token
 */
export async function loginViaAPI(credentials: LoginCredentials): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || `Login failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Login through the UI and wait for redirect
 */
export async function loginViaUI(
  page: Page,
  credentials: LoginCredentials,
  expectedRedirect: string | RegExp = /\/properties|\/dashboard/
): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"], input[placeholder*="email" i]', { timeout: 10000 });

  // Fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in")').first();

  // Clear and fill inputs
  await emailInput.clear();
  await emailInput.fill(credentials.email);
  await passwordInput.clear();
  await passwordInput.fill(credentials.password);

  // Wait for form to be ready
  await page.waitForTimeout(500);

  // Wait for API response or navigation
  const navigationPromise = page.waitForURL(expectedRedirect, { timeout: 20000 });
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes('/users/login') && response.status() === 200,
    { timeout: 15000 }
  ).catch(() => null);

  // Click submit
  await submitButton.click();

  // Wait for either navigation or API response
  try {
    // Wait for API response first (if it comes) - don't fail if it doesn't
    const response = await responsePromise;
    
    // If we got a response, check if it was successful
    if (response) {
      if (response.status() !== 200) {
        // Wait a bit for error message to appear
        await page.waitForTimeout(1000);
        const errorVisible = await page.locator('text=/error|invalid|incorrect|credentials|failed/i').first().isVisible({ timeout: 3000 }).catch(() => false);
        if (errorVisible) {
          const errorText = await page.locator('text=/error|invalid|incorrect|credentials|failed/i').first().textContent().catch(() => 'Login failed');
          throw new Error(`Login failed: ${errorText}`);
        }
      }
    }
    
    // Wait for navigation - this is the main thing we care about
    await navigationPromise;
  } catch (error: any) {
    // Check if we're already on the expected page
    const currentURL = page.url();
    if (currentURL.match(expectedRedirect)) {
      // We're already there, that's fine
      return;
    }
    
    // Wait a bit more for navigation to complete (sometimes it's delayed)
    await page.waitForTimeout(2000);
    const finalURLAfterWait = page.url();
    if (finalURLAfterWait.match(expectedRedirect)) {
      return; // Success after waiting
    }
    
    // Check if there's an error message on the page
    const errorVisible = await page.locator('text=/error|invalid|incorrect|credentials|failed|network|administrator/i').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (errorVisible) {
      const errorText = await page.locator('text=/error|invalid|incorrect|credentials|failed|network|administrator/i').first().textContent().catch(() => 'Login failed');
      // If it's a network error, the backend might not be running - skip this test
      if (errorText.toLowerCase().includes('network') || errorText.toLowerCase().includes('fetch') || errorText.toLowerCase().includes('administrator')) {
        // Check URL one more time after a longer wait
        await page.waitForTimeout(3000);
        const finalCheckURL = page.url();
        if (finalCheckURL.match(expectedRedirect)) {
          return; // Success after longer wait
        }
        // Backend might not be accessible - this is a test environment issue
        throw new Error(`Backend not accessible or login failed: ${errorText}. Make sure backend is running on ${process.env.BACKEND_URL || 'http://localhost:10000'}`);
      }
      throw new Error(`Login failed: ${errorText}`);
    }
    
    // Final check - maybe navigation happened but we missed it
    const finalURL = page.url();
    if (!finalURL.match(expectedRedirect)) {
      // Take screenshot for debugging
      await page.screenshot({ path: `test-results/login-debug-${Date.now()}.png` }).catch(() => {});
      throw new Error(`Login failed - expected redirect to ${expectedRedirect}, but stayed on ${finalURL}. Original error: ${error.message}`);
    }
  }

  // Wait for page to be interactive instead of networkidle (more reliable)
  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
  // Wait a short time for any initial API calls to complete
  await page.waitForTimeout(1000);
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button in navigation
  const logoutButton = page.locator('button:has-text("Sign out"), button:has-text("Logout"), [aria-label*="logout" i]').first();
  
  if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL('/', { timeout: 10000 });
  } else {
    // If no logout button found, clear localStorage and navigate
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
      // Ignore errors
    }
    await page.goto('/');
  }
}

/**
 * Check if user is authenticated by checking localStorage
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    return await page.evaluate(() => {
      try {
        return !!localStorage.getItem('token');
      } catch (e) {
        return false;
      }
    });
  } catch (e) {
    return false;
  }
}

/**
 * Get current user from localStorage
 */
export async function getCurrentUser(page: Page): Promise<any> {
  try {
    return await page.evaluate(() => {
      try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
      } catch (e) {
        return null;
      }
    });
  } catch (e) {
    return null;
  }
}

/**
 * Set authentication token in localStorage (for API-based auth)
 */
export async function setAuthToken(page: Page, token: string, user: any): Promise<void> {
  try {
    await page.evaluate(({ token, user }) => {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      } catch (e) {
        console.error('Error setting auth token:', e);
      }
    }, { token, user });
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Clear authentication (logout)
 */
export async function clearAuth(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch (e) {
        // Ignore errors
      }
    });
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Wait for authentication to be established
 */
export async function waitForAuth(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => !!localStorage.getItem('token'),
    { timeout }
  );
}

