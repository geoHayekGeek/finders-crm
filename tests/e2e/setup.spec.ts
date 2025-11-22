import { test as setup, expect } from '@playwright/test';
import { loginViaUI } from '../helpers/auth';

/**
 * Setup test - creates authenticated storage states for different user roles
 * This runs before all tests to set up authentication
 */
setup('authenticate as admin', async ({ page }) => {
  await loginViaUI(page, {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
  });

  // Verify we're logged in
  await expect(page).toHaveURL(/\/properties/);
  
  // Save storage state
  await page.context().storageState({ path: 'tests/.auth/admin.json' });
});

setup('authenticate as agent', async ({ page }) => {
  await loginViaUI(page, {
    email: process.env.TEST_AGENT_EMAIL || 'agent@test.com',
    password: process.env.TEST_AGENT_PASSWORD || 'agent123',
  });

  await expect(page).toHaveURL(/\/properties/);
  await page.context().storageState({ path: 'tests/.auth/agent.json' });
});

setup('authenticate as operations manager', async ({ page }) => {
  await loginViaUI(page, {
    email: process.env.TEST_OPS_MANAGER_EMAIL || 'opsmanager@test.com',
    password: process.env.TEST_OPS_MANAGER_PASSWORD || 'ops123',
  });

  await expect(page).toHaveURL(/\/properties/);
  await page.context().storageState({ path: 'tests/.auth/opsmanager.json' });
});

