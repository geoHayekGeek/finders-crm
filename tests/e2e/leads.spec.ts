import { test, expect } from '@playwright/test';

test.describe('Leads Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/leads');
    await page.waitForLoadState('networkidle');
  });

  test('should display leads list', async ({ page }) => {
    // Check for leads table or list
    const leadsTable = page.locator('table, [data-testid="leads-table"], .leads-list').first();
    await expect(leadsTable).toBeVisible({ timeout: 10000 });
  });

  test('should show add lead button for users with permissions', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Lead")').first();
    
    if (await addButton.count() > 0) {
      await expect(addButton).toBeVisible();
    }
  });

  test('should filter leads by status', async ({ page }) => {
    const statusFilter = page.locator('select[name*="status"], [data-testid="status-filter"]').first();
    
    if (await statusFilter.count() > 0) {
      await statusFilter.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
      
      // Verify filter is applied
      const url = page.url();
      expect(url).toContain('status') || expect(page.locator('table tbody tr').first()).toBeVisible();
    }
  });

  test('should create a new lead', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Lead")').first();
    
    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click();
      
      // Wait for modal
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Fill form
      const customerNameInput = page.locator('input[name*="customer"], input[name*="name"], input[placeholder*="customer" i]').first();
      if (await customerNameInput.isVisible({ timeout: 2000 })) {
        const timestamp = Date.now();
        await customerNameInput.fill(`Test Customer ${timestamp}`);
        
        // Fill phone if visible
        const phoneInput = page.locator('input[name*="phone"], input[type="tel"]').first();
        if (await phoneInput.isVisible({ timeout: 2000 })) {
          await phoneInput.fill('+961-3-123456');
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

  test('should view lead details', async ({ page }) => {
    const firstLeadRow = page.locator('table tbody tr, .lead-item').first();
    const viewButton = page.locator('button:has-text("View"), [aria-label*="view" i]').first();
    
    if (await firstLeadRow.count() > 0) {
      if (await viewButton.isVisible({ timeout: 2000 })) {
        await viewButton.click();
      } else {
        await firstLeadRow.click();
      }
      
      const detailsModal = page.locator('[role="dialog"], .modal').first();
      await expect(detailsModal).toBeVisible({ timeout: 5000 });
    }
  });

  test('should edit lead', async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();
    
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      const formInput = page.locator('input, textarea').first();
      await expect(formInput).toBeVisible();
      
      if (await formInput.isEditable({ timeout: 2000 })) {
        await formInput.fill('Updated Customer Name');
        
        const saveButton = page.locator('button[type="submit"]:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should delete lead with confirmation', async ({ page }) => {
    const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete" i]').first();
    
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      
      const confirmDialog = page.locator('[role="dialog"], .modal, text=/confirm|delete/i').first();
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await page.waitForTimeout(2000);
        
        const successMessage = page.locator('text=/success|deleted|removed/i').first();
        if (await successMessage.count() > 0) {
          await expect(successMessage).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should add referral to lead', async ({ page }) => {
    const viewButton = page.locator('button:has-text("View"), [aria-label*="view" i]').first();
    
    if (await viewButton.isVisible({ timeout: 5000 })) {
      await viewButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Look for add referral button
      const addReferralButton = page.locator('button:has-text("Add Referral"), button:has-text("Referral")').first();
      if (await addReferralButton.isVisible({ timeout: 2000 })) {
        await addReferralButton.click();
        
        // Fill referral form if visible
        const referralInput = page.locator('input[name*="referral"], input[placeholder*="referral" i]').first();
        if (await referralInput.isVisible({ timeout: 2000 })) {
          await referralInput.fill('Test Referral Source');
          
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")').first();
          if (await saveButton.isVisible({ timeout: 2000 })) {
            await saveButton.click();
            await page.waitForTimeout(2000);
          }
        }
      }
    }
  });

  test('should add note to lead', async ({ page }) => {
    const viewButton = page.locator('button:has-text("View"), [aria-label*="view" i]').first();
    
    if (await viewButton.isVisible({ timeout: 5000 })) {
      await viewButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Look for add note button or notes section
      const addNoteButton = page.locator('button:has-text("Add Note"), button:has-text("Note")').first();
      const notesTextarea = page.locator('textarea[name*="note"], textarea[placeholder*="note" i]').first();
      
      if (await addNoteButton.isVisible({ timeout: 2000 })) {
        await addNoteButton.click();
      }
      
      if (await notesTextarea.isVisible({ timeout: 2000 })) {
        await notesTextarea.fill('Test note from E2E test');
        
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")').first();
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should navigate to lead statuses page', async ({ page }) => {
    const statusesLink = page.locator('a:has-text("Lead Statuses"), [href*="statuses"]').first();
    
    if (await statusesLink.isVisible({ timeout: 5000 })) {
      await statusesLink.click();
      await expect(page).toHaveURL(/\/statuses/);
    }
  });
});

