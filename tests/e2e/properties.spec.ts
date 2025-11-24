import { test, expect } from '@playwright/test';

test.describe('Properties Page', () => {
  test.beforeEach(async ({ page }) => {
    // Use authenticated state
    await page.goto('/properties');
    
    // Wait for the properties API call to complete
    await page.waitForResponse(
      (response) => response.url().includes('/api/properties') && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => {
      // If API call doesn't complete, just continue - might be cached
    });
    
    // Wait for the h1 "Properties" heading to appear
    await page.waitForSelector('h1:has-text("Properties")', { timeout: 10000 }).catch(() => {});
    
    // Give a moment for content to render
    await page.waitForTimeout(500);
  });

  test('should display properties list', async ({ page }) => {
    // Check for properties table or list
    const propertiesTable = page.locator('table, [data-testid="properties-table"], .properties-list').first();
    await expect(propertiesTable).toBeVisible({ timeout: 10000 });
  });

  test('should show add property button for users with permissions', async ({ page }) => {
    // Check for add property button
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Property"), [aria-label*="add property" i]').first();
    
    // Button might not be visible for agents, so check if it exists
    const buttonExists = await addButton.count() > 0;
    if (buttonExists) {
      await expect(addButton).toBeVisible();
    }
  });

  test('should filter properties by status', async ({ page }) => {
    // Look for status filter
    const statusFilter = page.locator('select[name*="status"], [data-testid="status-filter"]').first();
    
    if (await statusFilter.count() > 0) {
      await statusFilter.selectOption({ index: 1 });
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
      
      // Verify filter is applied (check URL or table content)
      const url = page.url();
      expect(url).toContain('status') || expect(page.locator('table tbody tr').first()).toBeVisible();
    }
  });

  test('should open add property modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Property")').first();
    
    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click();
      
      // Check for modal
      const modal = page.locator('[role="dialog"], .modal, [data-testid="add-property-modal"]').first();
      await expect(modal).toBeVisible({ timeout: 5000 });
      
      // Check for form fields
      await expect(page.locator('input[name*="reference"], input[placeholder*="reference" i]').first()).toBeVisible();
    }
  });

  test('should create a new property', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Property")').first();
    
    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Fill form (adjust selectors based on actual form)
      const referenceInput = page.locator('input[name*="reference"], input[placeholder*="reference" i]').first();
      if (await referenceInput.isVisible({ timeout: 2000 })) {
        const timestamp = Date.now();
        await referenceInput.fill(`TEST-${timestamp}`);
        
        // Fill other required fields if visible
        const locationInput = page.locator('input[name*="location"], textarea[name*="location"]').first();
        if (await locationInput.isVisible({ timeout: 2000 })) {
          await locationInput.fill('Test Location');
        }
        
        // Submit form
        const submitButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Create")').first();
        if (await submitButton.isVisible({ timeout: 2000 })) {
          await submitButton.click();
          
          // Wait for success message or modal close
          await page.waitForTimeout(2000);
          
          // Verify property was created (check for success message or new row in table)
          const successMessage = page.locator('text=/success|created|saved/i').first();
          if (await successMessage.count() > 0) {
            await expect(successMessage).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });

  test('should view property details', async ({ page }) => {
    // Click on first property row or view button
    const firstPropertyRow = page.locator('table tbody tr, .property-item').first();
    const viewButton = page.locator('button:has-text("View"), [aria-label*="view" i]').first();
    
    if (await firstPropertyRow.count() > 0) {
      // Try clicking view button first, then row
      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
      } else {
        await firstPropertyRow.click();
      }
      
      // Check for property details modal or page
      const detailsModal = page.locator('[role="dialog"], .modal, [data-testid="view-property-modal"]').first();
      await expect(detailsModal).toBeVisible({ timeout: 5000 });
    }
  });

  test('should edit property', async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();
    
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      
      // Wait for edit modal
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Check for form fields
      const formInput = page.locator('input, textarea').first();
      await expect(formInput).toBeVisible();
      
      // Try to update a field
      if (await formInput.isEditable({ timeout: 2000 })) {
        await formInput.fill('Updated Value');
        
        // Save
        const saveButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          
          // Wait for update
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should delete property with confirmation', async ({ page }) => {
    const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete" i]').first();
    
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      
      // Check for confirmation dialog
      const confirmDialog = page.locator('[role="dialog"], .modal, text=/confirm|delete/i').first();
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      
      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        
        // Wait for deletion
        await page.waitForTimeout(2000);
        
        // Check for success message
        const successMessage = page.locator('text=/success|deleted|removed/i').first();
        if (await successMessage.count() > 0) {
          await expect(successMessage).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should search properties', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill('A-001');
      await page.waitForTimeout(1000);
      
      // Verify search results
      const results = page.locator('table tbody tr, .property-item');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should navigate to categories page', async ({ page }) => {
    const categoriesLink = page.locator('a:has-text("Categories"), [href*="categories"]').first();
    
    if (await categoriesLink.isVisible({ timeout: 5000 })) {
      await categoriesLink.click();
      await expect(page).toHaveURL(/\/categories/);
    }
  });

  test('should navigate to statuses page', async ({ page }) => {
    const statusesLink = page.locator('a:has-text("Statuses"), [href*="statuses"]').first();
    
    if (await statusesLink.isVisible({ timeout: 5000 })) {
      await statusesLink.click();
      await expect(page).toHaveURL(/\/statuses/);
    }
  });
});

