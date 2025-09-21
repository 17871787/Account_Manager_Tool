import { test, expect } from '@playwright/test';

test.describe('Quick Application Review', () => {
  test('Main page loads successfully', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/AM Copilot/);
  });

  test('Harvest page is accessible', async ({ page }) => {
    await page.goto('http://localhost:3000/harvest');
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Harvest');
  });

  test('HubSpot dashboard loads', async ({ page }) => {
    await page.goto('http://localhost:3000/hubspot');
    await expect(page.getByText(/HubSpot/i)).toBeVisible();
  });

  test('HubSpot upload page loads', async ({ page }) => {
    await page.goto('http://localhost:3000/hubspot/upload');
    await expect(page.getByText(/Import HubSpot Data/i)).toBeVisible();
  });

  test('API endpoints respond', async ({ request }) => {
    // Test Harvest API
    const harvestResponse = await request.get('http://localhost:3000/api/harvest/time-entries');
    expect(harvestResponse.status()).toBeLessThan(500);

    // Test HubSpot test API
    const hubspotTestResponse = await request.get('http://localhost:3000/api/hubspot/test');
    expect(hubspotTestResponse.status()).toBeLessThan(500);

    // Test HubSpot upload API
    const uploadResponse = await request.get('http://localhost:3000/api/hubspot/upload');
    expect(uploadResponse.status()).toBeLessThan(500);
  });

  test('404 handling works', async ({ page }) => {
    await page.goto('http://localhost:3000/non-existent');
    const content = await page.textContent('body');
    expect(content).toContain('404');
  });

  test('HubSpot tabs functionality', async ({ page }) => {
    await page.goto('http://localhost:3000/hubspot');

    // Check all tabs exist
    const tabs = ['Contacts', 'Companies', 'Deals'];
    for (const tab of tabs) {
      const tabButton = page.getByRole('button', { name: new RegExp(tab, 'i') });
      expect(await tabButton.count()).toBeGreaterThan(0);
    }
  });

  test('Upload page has all elements', async ({ page }) => {
    await page.goto('http://localhost:3000/hubspot/upload');

    // Check for key elements
    await expect(page.getByText(/drag and drop/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /download template/i })).toBeVisible();
    await expect(page.getByText(/How to Export Deals/i)).toBeVisible();
  });

  test('Navigation between pages works', async ({ page }) => {
    // Start at main
    await page.goto('http://localhost:3000');

    // Navigate to HubSpot if link exists
    const hubspotLink = page.getByRole('link', { name: /HubSpot/i });
    if (await hubspotLink.count() > 0) {
      await hubspotLink.click();
      await expect(page.url()).toContain('/hubspot');
    }

    // Navigate to upload from HubSpot
    await page.goto('http://localhost:3000/hubspot');
    const dealsTab = page.getByRole('button', { name: /deals/i });
    if (await dealsTab.count() > 0) {
      await dealsTab.click();
      const importLink = page.getByRole('link', { name: /import/i });
      if (await importLink.count() > 0) {
        await importLink.click();
        await expect(page.url()).toContain('/hubspot/upload');
      }
    }
  });

  test('Responsive design works', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('AM Copilot')).toBeVisible();

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByText('AM Copilot')).toBeVisible();
  });
});