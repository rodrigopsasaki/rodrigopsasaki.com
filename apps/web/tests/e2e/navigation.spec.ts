import { test, expect } from '@playwright/test';

test.describe('Navigation and Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have correct navigation structure', async ({ page }) => {
    // Check main navigation links exist
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();
    
    // Check for main navigation items
    await expect(page.getByRole('link', { name: /home/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /blog/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /projects/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /cv/i })).toBeVisible();
  });

  test('should navigate between main pages', async ({ page }) => {
    // Test blog navigation
    await page.getByRole('link', { name: /blog/i }).click();
    await expect(page).toHaveURL(/\/blog/);
    await expect(page.locator('h1')).toContainText(/blog/i);

    // Test projects navigation
    await page.getByRole('link', { name: /projects/i }).click();
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('h1')).toContainText(/projects/i);

    // Test CV navigation
    await page.getByRole('link', { name: /cv/i }).click();
    await expect(page).toHaveURL(/\/cv/);
    await expect(page.locator('h1')).toContainText(/cv|resume/i);

    // Return home
    await page.getByRole('link', { name: /home/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('should have search functionality in header', async ({ page }) => {
    // Check search input exists
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    
    // Check keyboard shortcut works
    await page.keyboard.press('/');
    await expect(searchInput).toBeFocused();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigation should still be accessible
    const nav = page.locator('nav, header').first();
    await expect(nav).toBeVisible();
    
    // Search should be responsive
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
  });

  test('should have proper meta tags and SEO', async ({ page }) => {
    // Check title
    await expect(page).toHaveTitle(/rodrigo/i);
    
    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);
    
    // Check canonical URL
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href');
    
    // Check Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogTitle).toHaveAttribute('content', /.+/);
    await expect(ogDescription).toHaveAttribute('content', /.+/);
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page');
    expect(response?.status()).toBe(404);
    
    // Should show some kind of 404 content or redirect
    // This depends on your 404 page implementation
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have proper language attributes', async ({ page }) => {
    // Check html lang attribute
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', /en|pt/);
  });
});