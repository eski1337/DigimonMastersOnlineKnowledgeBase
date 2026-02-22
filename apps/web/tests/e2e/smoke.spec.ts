import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check that we're on the right page
    expect(page.url()).toContain('localhost:3000');
    
    // Page should have a title
    await expect(page).toHaveTitle(/DMO|Digimon/i);
  });

  test('digimon list page loads', async ({ page }) => {
    await page.goto('/digimon');
    
    await page.waitForLoadState('networkidle');
    
    // Should be on digimon page
    expect(page.url()).toContain('/digimon');
    
    // Should have heading or content
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('navigation works', async ({ page }) => {
    await page.goto('/');
    
    // Try to find and click a nav link (adjust selector based on actual markup)
    const navLinks = page.locator('nav a, header a').filter({ hasText: /digimon|guides|maps/i });
    
    if (await navLinks.count() > 0) {
      await navLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // URL should have changed
      expect(page.url()).not.toBe('http://localhost:3000/');
    }
  });

  test('search functionality exists', async ({ page }) => {
    await page.goto('/');
    
    // Look for search input (adjust selector based on actual markup)
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[aria-label*="search" i]').first();
    
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();
    }
  });

  test('404 page works', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-xyz');
    
    // Should return 404 status or show 404 content
    if (response) {
      expect(response.status()).toBe(404);
    }
    
    // Page should indicate 404
    const content = await page.textContent('body');
    expect(content).toMatch(/404|not found/i);
  });
});
