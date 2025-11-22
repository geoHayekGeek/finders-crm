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
  await page.goto('/');

  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  // Fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();

  await emailInput.fill(credentials.email);
  await passwordInput.fill(credentials.password);

  // Submit and wait for navigation
  await Promise.all([
    page.waitForURL(expectedRedirect, { timeout: 15000 }),
    submitButton.click(),
  ]);

  // Wait a bit for the page to fully load
  await page.waitForLoadState('networkidle');
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button in navigation
  const logoutButton = page.locator('button:has-text("Sign out"), button:has-text("Logout"), [aria-label*="logout" i]').first();
  
  if (await logoutButton.isVisible({ timeout: 5000 })) {
    await logoutButton.click();
    await page.waitForURL('/', { timeout: 10000 });
  } else {
    // If no logout button found, clear localStorage and navigate
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    });
    await page.goto('/');
  }
}

/**
 * Check if user is authenticated by checking localStorage
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return !!localStorage.getItem('token');
  });
}

/**
 * Get current user from localStorage
 */
export async function getCurrentUser(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });
}

/**
 * Set authentication token in localStorage (for API-based auth)
 */
export async function setAuthToken(page: Page, token: string, user: any): Promise<void> {
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }, { token, user });
}

/**
 * Clear authentication (logout)
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
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

