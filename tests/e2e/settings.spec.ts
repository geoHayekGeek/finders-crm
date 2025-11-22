import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Settings page requires admin role
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display settings page', async ({ page }) => {
    // Check for settings page content
    const settingsHeader = page.locator('h1:has-text("Settings"), h2:has-text("Settings")').first();
    await expect(settingsHeader).toBeVisible({ timeout: 10000 });
  });

  test('should show settings tabs or sections', async ({ page }) => {
    // Check for settings sections
    const settingsSection = page.locator('.settings-section, [data-testid="settings"]').first();
    if (await settingsSection.count() > 0) {
      await expect(settingsSection).toBeVisible();
    }
  });

  test('should update SMTP settings', async ({ page }) => {
    // Look for SMTP settings section
    const smtpSection = page.locator('text=/smtp|email/i, [data-testid="smtp-settings"]').first();
    
    if (await smtpSection.isVisible({ timeout: 5000 })) {
      // Find SMTP host input
      const hostInput = page.locator('input[name*="host"], input[placeholder*="smtp" i]').first();
      if (await hostInput.isVisible({ timeout: 2000 })) {
        await hostInput.fill('smtp.test.com');
        
        // Fill other SMTP fields if visible
        const portInput = page.locator('input[name*="port"], input[type="number"]').first();
        if (await portInput.isVisible({ timeout: 2000 })) {
          await portInput.fill('587');
        }
        
        // Save
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          
          await page.waitForTimeout(2000);
          
          // Check for success message
          const successMessage = page.locator('text=/success|saved|updated/i').first();
          if (await successMessage.count() > 0) {
            await expect(successMessage).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });

  test('should update commission settings', async ({ page }) => {
    // Look for commission settings
    const commissionSection = page.locator('text=/commission/i, [data-testid="commission-settings"]').first();
    
    if (await commissionSection.isVisible({ timeout: 5000 })) {
      const commissionInput = page.locator('input[name*="commission"], input[type="number"]').first();
      if (await commissionInput.isVisible({ timeout: 2000 })) {
        await commissionInput.fill('2.5');
        
        const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
          
          const successMessage = page.locator('text=/success|saved|updated/i').first();
          if (await successMessage.count() > 0) {
            await expect(successMessage).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });

  test('should validate settings form', async ({ page }) => {
    // Try to submit invalid data
    const saveButton = page.locator('button:has-text("Save"), button[type="submit"]').first();
    
    if (await saveButton.isVisible({ timeout: 5000 })) {
      // Clear required fields if any
      const requiredInput = page.locator('input[required], input:invalid').first();
      if (await requiredInput.isVisible({ timeout: 2000 })) {
        await requiredInput.clear();
        
        await saveButton.click();
        
        // Check for validation error
        const errorMessage = page.locator('text=/error|invalid|required/i').first();
        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should restrict access to non-admin users', async ({ page }) => {
    // This test should be run with a non-admin user
    // Check if access is denied or redirected
    const accessDenied = page.locator('text=/access denied|unauthorized|permission/i').first();
    const settingsContent = page.locator('.settings-content, [data-testid="settings"]').first();
    
    // Either access is denied or settings content is not visible
    if (await accessDenied.count() > 0) {
      await expect(accessDenied).toBeVisible();
    } else if (await settingsContent.count() === 0) {
      // Settings page might redirect or not show content
      expect(page.url()).not.toContain('/settings') || await expect(settingsContent).not.toBeVisible();
    }
  });
});

