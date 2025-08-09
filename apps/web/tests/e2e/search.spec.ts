import { test, expect } from '@playwright/test';

test.describe('Magical Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open search with keyboard shortcut', async ({ page }) => {
    // Press / to open search
    await page.keyboard.press('/');
    
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeFocused();
    
    // Search dropdown should be visible
    const searchResults = page.locator('#magical-search-results');
    await expect(searchResults).toBeVisible();
  });

  test('should show suggestions when search is empty', async ({ page }) => {
    await page.keyboard.press('/');
    
    // Should show search suggestions
    await expect(page.getByText(/try searching for/i)).toBeVisible();
    
    // Should have suggestion buttons
    const suggestions = page.locator('.search-suggestion');
    await expect(suggestions.first()).toBeVisible();
  });

  test('should search and display results', async ({ page }) => {
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    
    // Type search query
    await searchInput.fill('simplicity');
    
    // Wait for search results
    await expect(page.locator('.search-result')).toBeVisible();
    
    // Results should contain the search term or related content
    const results = page.locator('.search-result');
    const resultCount = await results.count();
    expect(resultCount).toBeGreaterThan(0);
  });

  test('should navigate results with arrow keys', async ({ page }) => {
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    
    await searchInput.fill('simplicity');
    await expect(page.locator('.search-result')).toBeVisible();
    
    // Press arrow down to select first result
    await page.keyboard.press('ArrowDown');
    
    // First result should have selected styling
    const firstResult = page.locator('.search-result').first();
    await expect(firstResult).toHaveClass(/selected/);
    
    // Visual selection should be apparent (blue background, etc)
    await expect(firstResult).toHaveCSS('background-color', 'rgb(239, 246, 255)');
    await expect(firstResult).toHaveCSS('border-left', '4px solid rgb(59, 130, 246)');
    
    // Press arrow down again to move to second result
    await page.keyboard.press('ArrowDown');
    
    // Second result should now be selected
    const secondResult = page.locator('.search-result').nth(1);
    await expect(secondResult).toHaveClass(/selected/);
    await expect(firstResult).not.toHaveClass(/selected/);
  });

  test('should navigate to result on Enter key', async ({ page }) => {
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    
    await searchInput.fill('simplicity');
    await expect(page.locator('.search-result')).toBeVisible();
    
    // Select first result and press Enter
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    
    // Should navigate to the selected result
    await expect(page).toHaveURL(/simplicity/);
  });

  test('should close search with Escape key', async ({ page }) => {
    await page.keyboard.press('/');
    const searchResults = page.locator('#magical-search-results');
    await expect(searchResults).toBeVisible();
    
    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(searchResults).toBeHidden();
  });

  test('should handle click navigation on results', async ({ page }) => {
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    
    await searchInput.fill('simplicity');
    await expect(page.locator('.search-result')).toBeVisible();
    
    // Click on first result
    const firstResult = page.locator('.search-result').first();
    await firstResult.click();
    
    // Should navigate to the result
    await expect(page).toHaveURL(/simplicity/);
  });

  test('should show category badges on results', async ({ page }) => {
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    
    await searchInput.fill('vision');
    await expect(page.locator('.search-result')).toBeVisible();
    
    // Should show category badges (Project, Blog, CV)
    const categoryBadges = page.locator('.search-result span[class*="bg-"]');
    const badgeCount = await categoryBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('should handle no results state', async ({ page }) => {
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    
    // Search for something that won't return results
    await searchInput.fill('xyznonexistentquery123');
    
    // Should show no results message
    await expect(page.getByText(/no results found/i)).toBeVisible();
    await expect(page.getByText(/try a different search term/i)).toBeVisible();
  });

  test('should be accessible via screen readers', async ({ page }) => {
    // Check ARIA attributes
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toHaveAttribute('type', 'text');
    
    await page.keyboard.press('/');
    const searchResults = page.locator('#magical-search-results');
    await expect(searchResults).toBeVisible();
    
    // Results should be focusable and have proper roles
    await searchInput.fill('simplicity');
    await expect(page.locator('.search-result')).toBeVisible();
    
    const results = page.locator('.search-result');
    const firstResult = results.first();
    await expect(firstResult).toHaveAttribute('href'); // Should be a proper link
  });

  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Touch interaction to open search
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.tap();
    
    const searchResults = page.locator('#magical-search-results');
    await expect(searchResults).toBeVisible();
    
    // Type and search on mobile
    await searchInput.fill('vision');
    await expect(page.locator('.search-result')).toBeVisible();
    
    // Results should be appropriately sized for mobile
    const firstResult = page.locator('.search-result').first();
    const box = await firstResult.boundingBox();
    expect(box?.width).toBeLessThan(400); // Should fit mobile screen
  });

  test('should maintain search history', async ({ page }) => {
    // Perform a search
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('simplicity');
    await page.keyboard.press('Enter');
    
    // Go back and open search again
    await page.goBack();
    await page.keyboard.press('/');
    
    // Should show recent searches section
    await expect(page.getByText(/recent searches/i)).toBeVisible();
    
    // Should show the previous search
    await expect(page.getByText('simplicity')).toBeVisible();
  });
});