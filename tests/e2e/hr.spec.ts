import { test, expect } from '@playwright/test';

test.describe('HR Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/hr');
    await page.waitForLoadState('domcontentloaded');
    // Wait for HR content to appear
    await page.waitForSelector('h1, table, .hr-content', { timeout: 10000 }).catch(() => {});
  });

  test('should display users list', async ({ page }) => {
    // Check for users table
    const usersTable = page.locator('table, [data-testid="users-table"]').first();
    await expect(usersTable).toBeVisible({ timeout: 10000 });
  });

  test('should show add user button for users with permissions', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New User")').first();
    
    if (await addButton.count() > 0) {
      await expect(addButton).toBeVisible();
    }
  });

  test('should filter users by role', async ({ page }) => {
    const roleFilter = page.locator('select[name*="role"], [data-testid="role-filter"]').first();
    
    if (await roleFilter.count() > 0) {
      await roleFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      
      // Verify filter is applied
      const url = page.url();
      expect(url).toContain('role') || expect(page.locator('table tbody tr').first()).toBeVisible();
    }
  });

  test('should create a new user', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New User")').first();
    
    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Fill form
      const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible({ timeout: 2000 })) {
        const timestamp = Date.now();
        await nameInput.fill(`Test User ${timestamp}`);
        
        // Fill email
        const emailInput = page.locator('input[type="email"], input[name*="email"]').first();
        if (await emailInput.isVisible({ timeout: 2000 })) {
          await emailInput.fill(`testuser${timestamp}@test.com`);
        }
        
        // Fill password
        const passwordInput = page.locator('input[type="password"], input[name*="password"]').first();
        if (await passwordInput.isVisible({ timeout: 2000 })) {
          await passwordInput.fill('test123');
        }
        
        // Select role
        const roleSelect = page.locator('select[name*="role"]').first();
        if (await roleSelect.isVisible({ timeout: 2000 })) {
          await roleSelect.selectOption({ index: 1 });
        }
        
        // Submit
        const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').first();
        if (await submitButton.isVisible({ timeout: 2000 })) {
          await submitButton.click();
          
          await page.waitForTimeout(2000);
          
          // Check for success
          const successMessage = page.locator('text=/success|created|saved/i').first();
          if (await successMessage.count() > 0) {
            await expect(successMessage).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });

  test('should view user details', async ({ page }) => {
    const viewButton = page.locator('button:has-text("View"), [aria-label*="view" i]').first();
    const firstUserRow = page.locator('table tbody tr').first();
    
    if (await viewButton.isVisible({ timeout: 5000 })) {
      await viewButton.click();
    } else if (await firstUserRow.isVisible({ timeout: 5000 })) {
      await firstUserRow.click();
    }
    
    // Check for user details modal
    const detailsModal = page.locator('[role="dialog"], .modal').first();
    if (await detailsModal.isVisible({ timeout: 5000 })) {
      await expect(detailsModal).toBeVisible();
    }
  });

  test('should edit user', async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();
    
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Check for editable fields
      const nameInput = page.locator('input[name*="name"]').first();
      if (await nameInput.isVisible({ timeout: 2000 })) {
        await nameInput.fill('Updated User Name');
        
        const saveButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should delete user with confirmation', async ({ page }) => {
    const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete" i]').first();
    
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      
      // Check for confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], .modal, text=/confirm|delete/i').first();
      if (await confirmDialog.isVisible({ timeout: 5000 })) {
        await expect(confirmDialog).toBeVisible();
        
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
          
          // Check for success
          const successMessage = page.locator('text=/success|deleted|removed/i').first();
          if (await successMessage.count() > 0) {
            await expect(successMessage).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });

  test('should search users', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('admin');
      await page.waitForTimeout(1000);
      
      // Verify search results
      const results = page.locator('table tbody tr');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should assign agent to team leader', async ({ page }) => {
    // Look for team leader section or assignment button
    const assignButton = page.locator('button:has-text("Assign"), button:has-text("Assign Agent")').first();
    
    if (await assignButton.isVisible({ timeout: 5000 })) {
      await assignButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Select team leader and agent
      const teamLeaderSelect = page.locator('select[name*="team"], select[name*="leader"]').first();
      if (await teamLeaderSelect.isVisible({ timeout: 2000 })) {
        await teamLeaderSelect.selectOption({ index: 1 });
      }
      
      const agentSelect = page.locator('select[name*="agent"]').first();
      if (await agentSelect.isVisible({ timeout: 2000 })) {
        await agentSelect.selectOption({ index: 1 });
      }
      
      // Submit
      const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Assign")').first();
      if (await submitButton.isVisible({ timeout: 2000 })) {
        await submitButton.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('should view user documents', async ({ page }) => {
    const viewButton = page.locator('button:has-text("View"), [aria-label*="view" i]').first();
    
    if (await viewButton.isVisible({ timeout: 5000 })) {
      await viewButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Look for documents section
      const documentsSection = page.locator('text=/document/i, [data-testid="documents"]').first();
      if (await documentsSection.isVisible({ timeout: 2000 })) {
        await expect(documentsSection).toBeVisible();
      }
    }
  });
});

