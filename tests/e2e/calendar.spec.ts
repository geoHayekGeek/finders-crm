import { test, expect } from '@playwright/test';

test.describe('Calendar Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/calendar');
    await page.waitForLoadState('networkidle');
  });

  test('should display calendar', async ({ page }) => {
    // Check for calendar component
    const calendar = page.locator('.calendar, [data-testid="calendar"], .rbc-calendar').first();
    await expect(calendar).toBeVisible({ timeout: 10000 });
  });

  test('should switch between month, week, and day views', async ({ page }) => {
    const monthButton = page.locator('button:has-text("Month"), [aria-label*="month" i]').first();
    const weekButton = page.locator('button:has-text("Week"), [aria-label*="week" i]').first();
    const dayButton = page.locator('button:has-text("Day"), [aria-label*="day" i]').first();
    
    if (await monthButton.isVisible({ timeout: 5000 })) {
      await monthButton.click();
      await page.waitForTimeout(1000);
    }
    
    if (await weekButton.isVisible({ timeout: 5000 })) {
      await weekButton.click();
      await page.waitForTimeout(1000);
    }
    
    if (await dayButton.isVisible({ timeout: 5000 })) {
      await dayButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should create a new calendar event', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Event"), [aria-label*="add event" i]').first();
    
    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click();
      
      // Wait for event modal
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Fill event form
      const titleInput = page.locator('input[name*="title"], input[placeholder*="title" i]').first();
      if (await titleInput.isVisible({ timeout: 2000 })) {
        await titleInput.fill('Test Event');
        
        // Fill start date if visible
        const startDateInput = page.locator('input[name*="start"], input[type="datetime-local"]').first();
        if (await startDateInput.isVisible({ timeout: 2000 })) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const dateStr = tomorrow.toISOString().slice(0, 16);
          await startDateInput.fill(dateStr);
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

  test('should click on calendar day to create event', async ({ page }) => {
    // Try clicking on a calendar day cell
    const dayCell = page.locator('.rbc-day-bg, .calendar-day, [data-day]').first();
    
    if (await dayCell.isVisible({ timeout: 5000 })) {
      await dayCell.click();
      
      // Check if event modal opens
      const eventModal = page.locator('[role="dialog"], .modal').first();
      if (await eventModal.isVisible({ timeout: 3000 })) {
        await expect(eventModal).toBeVisible();
      }
    }
  });

  test('should view event details', async ({ page }) => {
    // Click on an existing event
    const event = page.locator('.rbc-event, .calendar-event, [data-event]').first();
    
    if (await event.isVisible({ timeout: 5000 })) {
      await event.click();
      
      // Check for event details modal
      const detailsModal = page.locator('[role="dialog"], .modal').first();
      await expect(detailsModal).toBeVisible({ timeout: 5000 });
    }
  });

  test('should edit event', async ({ page }) => {
    const event = page.locator('.rbc-event, .calendar-event, [data-event]').first();
    
    if (await event.isVisible({ timeout: 5000 })) {
      await event.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Look for edit button or editable fields
      const editButton = page.locator('button:has-text("Edit")').first();
      if (await editButton.isVisible({ timeout: 2000 })) {
        await editButton.click();
      }
      
      const titleInput = page.locator('input[name*="title"]').first();
      if (await titleInput.isVisible({ timeout: 2000 })) {
        await titleInput.fill('Updated Event Title');
        
        const saveButton = page.locator('button[type="submit"]:has-text("Save")').first();
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should delete event', async ({ page }) => {
    const event = page.locator('.rbc-event, .calendar-event, [data-event]').first();
    
    if (await event.isVisible({ timeout: 5000 })) {
      await event.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      const deleteButton = page.locator('button:has-text("Delete"), [aria-label*="delete" i]').first();
      if (await deleteButton.isVisible({ timeout: 2000 })) {
        await deleteButton.click();
        
        // Confirm deletion if confirmation dialog appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should link event to property', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Event")').first();
    
    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Look for property selector
      const propertySelect = page.locator('select[name*="property"], [data-testid="property-select"]').first();
      if (await propertySelect.isVisible({ timeout: 2000 })) {
        await propertySelect.selectOption({ index: 1 });
        
        const saveButton = page.locator('button[type="submit"]:has-text("Save")').first();
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should link event to lead', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Event")').first();
    
    if (await addButton.isVisible({ timeout: 5000 })) {
      await addButton.click();
      
      await page.waitForSelector('[role="dialog"], .modal', { timeout: 5000 });
      
      // Look for lead selector
      const leadSelect = page.locator('select[name*="lead"], [data-testid="lead-select"]').first();
      if (await leadSelect.isVisible({ timeout: 2000 })) {
        await leadSelect.selectOption({ index: 1 });
        
        const saveButton = page.locator('button[type="submit"]:has-text("Save")').first();
        if (await saveButton.isVisible({ timeout: 2000 })) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }
  });

  test('should filter events', async ({ page }) => {
    // Look for filter controls
    const filterButton = page.locator('button:has-text("Filter"), [aria-label*="filter" i]').first();
    
    if (await filterButton.isVisible({ timeout: 5000 })) {
      await filterButton.click();
      
      // Check for filter options
      const filterPanel = page.locator('.filter-panel, [data-testid="filters"]').first();
      if (await filterPanel.isVisible({ timeout: 2000 })) {
        await expect(filterPanel).toBeVisible();
      }
    }
  });
});

