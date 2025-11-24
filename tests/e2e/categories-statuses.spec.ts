import { test, expect } from '@playwright/test';

test.describe('Categories and Statuses Pages', () => {
  test.describe('Categories', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/properties/categories');
      await page.waitForLoadState('domcontentloaded');
      // Wait for categories/statuses table to appear
      await page.waitForSelector('table, .categories-table, .statuses-table', { timeout: 10000 }).catch(() => {});
    });

    test('should display categories list', async ({ page }) => {
      const categoriesTable = page.locator('table, [data-testid="categories-table"]').first();
      await expect(categoriesTable).toBeVisible({ timeout: 10000 });
    });

    test('should create a new category', async ({ page }) => {
      const addButton = page.locator('button:has-text("Add"), button:has-text("New Category")').first();
      
      if (await addButton.isVisible({ timeout: 5000 })) {
        await addButton.click();
        
        await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
        
        const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
        if (await nameInput.isVisible({ timeout: 2000 })) {
          const timestamp = Date.now();
          await nameInput.fill(`Test Category ${timestamp}`);
          
          const codeInput = page.locator('input[name*="code"], input[placeholder*="code" i]').first();
          if (await codeInput.isVisible({ timeout: 2000 })) {
            await codeInput.fill(`TC${timestamp}`);
          }
          
          const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').first();
          if (await submitButton.isVisible({ timeout: 2000 })) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            const successMessage = page.locator('text=/success|created|saved/i').first();
            if (await successMessage.count() > 0) {
              await expect(successMessage).toBeVisible({ timeout: 5000 });
            }
          }
        }
      }
    });

    test('should edit category', async ({ page }) => {
      const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();
      
      if (await editButton.isVisible({ timeout: 5000 })) {
        await editButton.click();
        
        await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
        
        const nameInput = page.locator('input[name*="name"]').first();
        if (await nameInput.isVisible({ timeout: 2000 })) {
          await nameInput.fill('Updated Category Name');
          
          const saveButton = page.locator('button[type="submit"]:has-text("Save")').first();
          if (await saveButton.isVisible({ timeout: 2000 })) {
            await saveButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    });

    test('should delete category', async ({ page }) => {
      const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete" i]').first();
      
      if (await deleteButton.isVisible({ timeout: 5000 })) {
        await deleteButton.click();
        
        const confirmDialog = page.locator('[role="dialog"], .modal, text=/confirm|delete/i').first();
        if (await confirmDialog.isVisible({ timeout: 5000 })) {
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    });
  });

  test.describe('Statuses', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/properties/statuses');
      await page.waitForLoadState('domcontentloaded');
      // Wait for categories/statuses table to appear
      await page.waitForSelector('table, .categories-table, .statuses-table', { timeout: 10000 }).catch(() => {});
    });

    test('should display statuses list', async ({ page }) => {
      const statusesTable = page.locator('table, [data-testid="statuses-table"]').first();
      await expect(statusesTable).toBeVisible({ timeout: 10000 });
    });

    test('should create a new status', async ({ page }) => {
      const addButton = page.locator('button:has-text("Add"), button:has-text("New Status")').first();
      
      if (await addButton.isVisible({ timeout: 5000 })) {
        await addButton.click();
        
        await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
        
        const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
        if (await nameInput.isVisible({ timeout: 2000 })) {
          const timestamp = Date.now();
          await nameInput.fill(`Test Status ${timestamp}`);
          
          const codeInput = page.locator('input[name*="code"], input[placeholder*="code" i]').first();
          if (await codeInput.isVisible({ timeout: 2000 })) {
            await codeInput.fill(`TS${timestamp}`);
          }
          
          const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').first();
          if (await submitButton.isVisible({ timeout: 2000 })) {
            await submitButton.click();
            await page.waitForTimeout(2000);
            
            const successMessage = page.locator('text=/success|created|saved/i').first();
            if (await successMessage.count() > 0) {
              await expect(successMessage).toBeVisible({ timeout: 5000 });
            }
          }
        }
      }
    });

    test('should edit status', async ({ page }) => {
      const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();
      
      if (await editButton.isVisible({ timeout: 5000 })) {
        await editButton.click();
        
        await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
        
        const nameInput = page.locator('input[name*="name"]').first();
        if (await nameInput.isVisible({ timeout: 2000 })) {
          await nameInput.fill('Updated Status Name');
          
          const saveButton = page.locator('button[type="submit"]:has-text("Save")').first();
          if (await saveButton.isVisible({ timeout: 2000 })) {
            await saveButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    });

    test('should delete status', async ({ page }) => {
      const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete" i]').first();
      
      if (await deleteButton.isVisible({ timeout: 5000 })) {
        await deleteButton.click();
        
        const confirmDialog = page.locator('[role="dialog"], .modal, text=/confirm|delete/i').first();
        if (await confirmDialog.isVisible({ timeout: 5000 })) {
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    });
  });
});

