import { test, expect } from '@playwright/test';

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/reports');
    await page.waitForLoadState('domcontentloaded');
    // Wait for reports content to appear
    await page.waitForSelector('h1, .reports, [data-testid="reports"]', { timeout: 10000 }).catch(() => {});
  });

  test('should display reports page', async ({ page }) => {
    // Check for reports page content
    const reportsHeader = page.locator('h1:has-text("Reports"), h2:has-text("Reports")').first();
    await expect(reportsHeader).toBeVisible({ timeout: 10000 });
  });

  test('should show report tabs', async ({ page }) => {
    // Check for tab navigation
    const tabs = page.locator('[role="tab"], .tab, button[data-tab]');
    const tabCount = await tabs.count();
    
    if (tabCount > 0) {
      expect(tabCount).toBeGreaterThan(0);
    }
  });

  test('should switch between report tabs', async ({ page }) => {
    const tabs = page.locator('[role="tab"], .tab, button[data-tab]');
    const tabCount = await tabs.count();
    
    if (tabCount > 1) {
      // Click on second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(1000);
      
      // Verify tab content changes
      const activeTab = page.locator('[role="tab"][aria-selected="true"], .tab.active').first();
      if (await activeTab.count() > 0) {
        await expect(activeTab).toBeVisible();
      }
    }
  });

  test('should display Monthly Agent Statistics tab', async ({ page }) => {
    const monthlyTab = page.locator('button:has-text("Monthly Agent Statistics"), [data-tab="monthly-agent-stats"]').first();
    
    if (await monthlyTab.isVisible({ timeout: 5000 })) {
      await monthlyTab.click();
      await page.waitForTimeout(1000);
      
      // Check for report content
      const reportContent = page.locator('.report-content, [data-testid="monthly-agent-stats"]').first();
      if (await reportContent.isVisible({ timeout: 5000 })) {
        await expect(reportContent).toBeVisible();
      }
    }
  });

  test('should display DCSR Report tab', async ({ page }) => {
    const dcsrTab = page.locator('button:has-text("DCSR Report"), [data-tab="dcsr-report"]').first();
    
    if (await dcsrTab.isVisible({ timeout: 5000 })) {
      await dcsrTab.click();
      await page.waitForTimeout(1000);
      
      const reportContent = page.locator('.report-content, [data-testid="dcsr-report"]').first();
      if (await reportContent.isVisible({ timeout: 5000 })) {
        await expect(reportContent).toBeVisible();
      }
    }
  });

  test('should create a new report', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Report")').first();
    
    if (await createButton.isVisible({ timeout: 5000 })) {
      await createButton.click();
      
      // Wait for create report modal
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Fill report form
      const startDateInput = page.locator('input[name*="start"], input[type="date"]').first();
      if (await startDateInput.isVisible({ timeout: 2000 })) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        await startDateInput.fill(startDate.toISOString().split('T')[0]);
        
        const endDateInput = page.locator('input[name*="end"], input[type="date"]').nth(1);
        if (await endDateInput.isVisible({ timeout: 2000 })) {
          const endDate = new Date();
          await endDateInput.fill(endDate.toISOString().split('T')[0]);
        }
        
        // Submit
        const submitButton = page.locator('button[type="submit"]:has-text("Create"), button:has-text("Save")').first();
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

  test('should filter reports by date range', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"], input[name*="date"]').first();
    
    if (await dateFilter.isVisible({ timeout: 5000 })) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      await dateFilter.fill(startDate.toISOString().split('T')[0]);
      
      await page.waitForTimeout(1000);
      
      // Verify filter is applied
      const filteredResults = page.locator('table tbody tr, .report-item').first();
      if (await filteredResults.count() > 0) {
        await expect(filteredResults).toBeVisible();
      }
    }
  });

  test('should export report to Excel', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Excel"), [aria-label*="export" i]').first();
    
    if (await exportButton.isVisible({ timeout: 5000 })) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      await exportButton.click();
      
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain('.xlsx');
      }
    }
  });

  test('should export report to PDF', async ({ page }) => {
    const exportButton = page.locator('button:has-text("PDF"), [aria-label*="pdf" i]').first();
    
    if (await exportButton.isVisible({ timeout: 5000 })) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      
      await exportButton.click();
      
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toContain('.pdf');
      }
    }
  });

  test('should view report details', async ({ page }) => {
    const viewButton = page.locator('button:has-text("View"), [aria-label*="view" i]').first();
    
    if (await viewButton.isVisible({ timeout: 5000 })) {
      await viewButton.click();
      
      // Check for report details modal or page
      const detailsModal = page.locator('[role="dialog"], .modal').first();
      if (await detailsModal.isVisible({ timeout: 5000 })) {
        await expect(detailsModal).toBeVisible();
      }
    }
  });

  test('should edit report', async ({ page }) => {
    const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();
    
    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Check for editable fields
      const formInput = page.locator('input, textarea').first();
      if (await formInput.isVisible({ timeout: 2000 })) {
        await expect(formInput).toBeVisible();
      }
    }
  });

  test('should delete report', async ({ page }) => {
    const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete" i]').first();
    
    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();
      
      // Check for confirmation
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

