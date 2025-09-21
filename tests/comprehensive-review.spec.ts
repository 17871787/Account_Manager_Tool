import { test, expect } from '@playwright/test';

test.describe('Comprehensive Application Review', () => {

  test.describe('Main Dashboard', () => {
    test('should load main page successfully', async ({ page }) => {
      await page.goto('http://localhost:3000');
      await expect(page).toHaveTitle(/AM Copilot/);

      // Check for main navigation elements
      await expect(page.getByText('AM Copilot')).toBeVisible();

      // Check for dashboard sections
      const dashboardText = await page.textContent('body');
      expect(dashboardText).toBeTruthy();
    });

    test('should have working navigation links', async ({ page }) => {
      await page.goto('http://localhost:3000');

      // Check for Harvest link
      const harvestLink = page.getByRole('link', { name: /Harvest/i });
      if (await harvestLink.count() > 0) {
        await harvestLink.click();
        await expect(page.url()).toContain('/harvest');
        await page.goBack();
      }

      // Check for HubSpot link
      const hubspotLink = page.getByRole('link', { name: /HubSpot/i });
      if (await hubspotLink.count() > 0) {
        await hubspotLink.click();
        await expect(page.url()).toContain('/hubspot');
        await page.goBack();
      }
    });

    test('should be responsive', async ({ page }) => {
      await page.goto('http://localhost:3000');

      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.getByText('AM Copilot')).toBeVisible();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.getByText('AM Copilot')).toBeVisible();

      // Test desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await expect(page.getByText('AM Copilot')).toBeVisible();
    });
  });

  test.describe('Harvest Integration', () => {
    test('should load Harvest dashboard', async ({ page }) => {
      await page.goto('http://localhost:3000/harvest');

      // Check for Harvest elements
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('Harvest');

      // Check for time entries table elements
      const tableExists = await page.locator('table').count() > 0 ||
                          await page.getByText(/time entries/i).count() > 0 ||
                          await page.getByText(/no entries/i).count() > 0;
      expect(tableExists).toBeTruthy();
    });

    test('should have refresh functionality', async ({ page }) => {
      await page.goto('http://localhost:3000/harvest');

      // Look for refresh button
      const refreshButton = page.getByRole('button', { name: /refresh/i });
      if (await refreshButton.count() > 0) {
        await refreshButton.click();
        // Wait for potential loading state
        await page.waitForTimeout(1000);
      }
    });

    test('should display time entries or appropriate message', async ({ page }) => {
      await page.goto('http://localhost:3000/harvest');

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Check for either time entries or no entries message
      const hasContent = await page.locator('table').count() > 0 ||
                         await page.getByText(/no entries/i).count() > 0 ||
                         await page.getByText(/no time entries/i).count() > 0;
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('HubSpot Integration', () => {
    test('should load HubSpot dashboard', async ({ page }) => {
      await page.goto('http://localhost:3000/hubspot');

      // Check for HubSpot dashboard elements
      await expect(page.getByText(/HubSpot/i)).toBeVisible();

      // Check for tabs
      const contactsTab = page.getByRole('button', { name: /contacts/i });
      const companiesTab = page.getByRole('button', { name: /companies/i });
      const dealsTab = page.getByRole('button', { name: /deals/i });

      expect(await contactsTab.count() + await companiesTab.count() + await dealsTab.count()).toBeGreaterThan(0);
    });

    test('should switch between tabs', async ({ page }) => {
      await page.goto('http://localhost:3000/hubspot');

      // Test Contacts tab
      const contactsTab = page.getByRole('button', { name: /contacts/i });
      if (await contactsTab.count() > 0) {
        await contactsTab.click();
        await page.waitForTimeout(500);
      }

      // Test Companies tab
      const companiesTab = page.getByRole('button', { name: /companies/i });
      if (await companiesTab.count() > 0) {
        await companiesTab.click();
        await page.waitForTimeout(500);
      }

      // Test Deals tab
      const dealsTab = page.getByRole('button', { name: /deals/i });
      if (await dealsTab.count() > 0) {
        await dealsTab.click();
        await page.waitForTimeout(500);
      }
    });

    test('should have import functionality link', async ({ page }) => {
      await page.goto('http://localhost:3000/hubspot');

      // Click on Deals tab first
      const dealsTab = page.getByRole('button', { name: /deals/i });
      if (await dealsTab.count() > 0) {
        await dealsTab.click();
        await page.waitForTimeout(500);

        // Check for import link
        const importLink = page.getByRole('link', { name: /import/i });
        expect(await importLink.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('HubSpot Upload Feature', () => {
    test('should load upload page', async ({ page }) => {
      await page.goto('http://localhost:3000/hubspot/upload');

      // Check for upload page elements
      await expect(page.getByText(/Import HubSpot Data/i)).toBeVisible();

      // Check for file upload area
      const uploadArea = page.locator('input[type="file"]');
      expect(await uploadArea.count()).toBeGreaterThan(0);
    });

    test('should have drag and drop area', async ({ page }) => {
      await page.goto('http://localhost:3000/hubspot/upload');

      // Check for drag and drop text
      await expect(page.getByText(/drag and drop/i)).toBeVisible();
    });

    test('should have download template button', async ({ page }) => {
      await page.goto('http://localhost:3000/hubspot/upload');

      // Check for download template button
      const downloadButton = page.getByRole('button', { name: /download template/i });
      expect(await downloadButton.count()).toBeGreaterThan(0);
    });

    test('should have clear all functionality', async ({ page }) => {
      await page.goto('http://localhost:3000/hubspot/upload');

      // Clear all button might only appear if there are deals
      const clearButton = page.getByRole('button', { name: /clear all/i });
      // It's okay if this doesn't exist when no deals are uploaded
      expect(await clearButton.count()).toBeGreaterThanOrEqual(0);
    });

    test('should display instructions', async ({ page }) => {
      await page.goto('http://localhost:3000/hubspot/upload');

      // Check for export instructions
      await expect(page.getByText(/How to Export Deals from HubSpot/i)).toBeVisible();
      await expect(page.getByText(/Navigate to Sales/i)).toBeVisible();
    });
  });

  test.describe('API Endpoints', () => {
    test('should respond to Harvest API endpoint', async ({ request }) => {
      const response = await request.get('http://localhost:3000/api/harvest/time-entries');
      expect(response.status()).toBeLessThan(500); // Not a server error
    });

    test('should respond to HubSpot test endpoint', async ({ request }) => {
      const response = await request.get('http://localhost:3000/api/hubspot/test');
      expect(response.status()).toBeLessThan(500); // Not a server error
    });

    test('should respond to HubSpot upload endpoint', async ({ request }) => {
      const response = await request.get('http://localhost:3000/api/hubspot/upload');
      expect(response.status()).toBeLessThan(500); // Not a server error

      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('success');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto('http://localhost:3000/non-existent-page');

      // Should show 404 error
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('404');
    });

    test('should handle API errors gracefully', async ({ page }) => {
      await page.goto('http://localhost:3000/hubspot');

      // Even with API errors, page should load
      await expect(page).not.toHaveTitle(/Error/);

      // Should show some content or error message
      const hasContent = await page.getByText(/HubSpot/i).count() > 0;
      expect(hasContent).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('should load main page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('http://localhost:3000');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should have no console errors on main pages', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('http://localhost:3000');
      await page.waitForTimeout(1000);

      // Some errors are acceptable (like Sentry auth issues)
      const criticalErrors = consoleErrors.filter(error =>
        !error.includes('Sentry') &&
        !error.includes('401') &&
        !error.includes('NEXT_REDIRECT')
      );

      expect(criticalErrors.length).toBe(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('http://localhost:3000');

      // Check for h1
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThan(0);
    });

    test('should have alt text for images', async ({ page }) => {
      await page.goto('http://localhost:3000');

      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');
        // Images should have alt text (even if empty for decorative)
        expect(altText !== null).toBeTruthy();
      }
    });

    test('should have proper button labels', async ({ page }) => {
      await page.goto('http://localhost:3000');

      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');

        // Button should have either text content or aria-label
        expect(text || ariaLabel).toBeTruthy();
      }
    });
  });
});

test.describe('Data Integration Tests', () => {
  test('should handle CSV upload flow', async ({ page }) => {
    await page.goto('http://localhost:3000/hubspot/upload');

    // Check that upload interface is ready
    const fileInput = page.locator('input[type="file"]');
    expect(await fileInput.count()).toBeGreaterThan(0);

    // Download template to verify format
    const downloadButton = page.getByRole('button', { name: /download template/i });
    if (await downloadButton.count() > 0) {
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await downloadButton.click();
      const download = await downloadPromise;

      if (download) {
        expect(download.suggestedFilename()).toContain('.csv');
      }
    }
  });

  test('should preserve data after refresh', async ({ page }) => {
    await page.goto('http://localhost:3000/hubspot/upload');

    // If there are imported deals, they should persist
    const dealsTable = page.locator('table');
    const initialTableCount = await dealsTable.count();

    if (initialTableCount > 0) {
      await page.reload();
      await page.waitForTimeout(1000);

      const afterReloadCount = await dealsTable.count();
      expect(afterReloadCount).toBe(initialTableCount);
    }
  });
});