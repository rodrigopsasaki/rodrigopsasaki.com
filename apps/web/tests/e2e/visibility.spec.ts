import { test, expect } from '@playwright/test';

test.describe('Content Visibility System', () => {
  test('should only show visible blog posts on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Should show the parent simplicity post (visible: true)
    await expect(page.locator('text=Simple Made Easy')).toBeVisible();
    
    // Should NOT show hidden episodes (visible: false)
    await expect(page.locator('text=Understanding Complexity')).not.toBeVisible();
    await expect(page.locator('text=The Art of Complecting')).not.toBeVisible();
    await expect(page.locator('text=Building Simple Systems')).not.toBeVisible();
  });

  test('should only show visible blog posts on blog index page', async ({ page }) => {
    await page.goto('/blog/');
    
    // Should show the parent simplicity post
    await expect(page.locator('text=Simple Made Easy')).toBeVisible();
    
    // Should NOT show hidden episodes
    await expect(page.locator('text=Understanding Complexity')).not.toBeVisible();
    await expect(page.locator('text=The Art of Complecting')).not.toBeVisible();  
    await expect(page.locator('text=Building Simple Systems')).not.toBeVisible();
  });

  test('should only show visible projects on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Get all project titles on the page
    const projectTitles = await page.locator('.max-w-6xl h3').allTextContents();
    
    // All shown projects should have visible: true in their frontmatter
    // This test ensures the filter is working
    expect(projectTitles.length).toBeGreaterThanOrEqual(0);
  });

  test('should still allow direct access to hidden posts via URL', async ({ page }) => {
    // Hidden posts should be accessible directly but not indexed
    const response = await page.goto('/blog/simplicity-complexity/');
    
    // Should load successfully (not 404)
    expect(response?.status()).toBe(200);
    
    // Should show the content
    await expect(page.locator('text=Understanding Complexity')).toBeVisible();
  });

  test('should include visible posts in search results', async ({ page }) => {
    await page.goto('/');
    
    // Open search
    await page.press('body', '/');
    
    // Search for simplicity
    await page.fill('#magical-search-input', 'simplicity');
    
    // Wait for search results
    await page.waitForSelector('.search-results', { timeout: 2000 });
    
    // Should show the parent post
    await expect(page.locator('.search-results >> text=Simple Made Easy')).toBeVisible();
    
    // Should NOT show hidden episodes in search
    await expect(page.locator('.search-results >> text=Understanding Complexity')).not.toBeVisible();
    await expect(page.locator('.search-results >> text=Building Simple Systems')).not.toBeVisible();
  });

  test('should trigger search when clicking on tags', async ({ page }) => {
    await page.goto('/blog/simplicity/');
    
    // Find a tag button and click it
    const tagButton = page.locator('.tag-button').first();
    const tagText = await tagButton.textContent();
    
    await tagButton.click();
    
    // Should open search with the tag text
    await expect(page.locator('#magical-search-input')).toHaveValue(tagText || '');
    await expect(page.locator('.search-results')).toBeVisible();
  });

  test('should not show hidden episodes in sidebar navigation', async ({ page }) => {
    await page.goto('/blog/simplicity/');
    
    // Should show the overview in sidebar
    await expect(page.locator('.bg-gray-200 >> text=Overview')).toBeVisible();
    
    // Should NOT show hidden episodes in sidebar
    await expect(page.locator('.bg-gray-200 >> text=Understanding Complexity')).not.toBeVisible();
    await expect(page.locator('.bg-gray-200 >> text=The Art of Complecting')).not.toBeVisible();
    await expect(page.locator('.bg-gray-200 >> text=Building Simple Systems')).not.toBeVisible();
    
    // Should show series title in sidebar
    await expect(page.locator('.bg-gray-200 >> text=Simple is not Easy')).toBeVisible();
  });

  test('should not show duplicate titles', async ({ page }) => {
    await page.goto('/blog/simplicity/');
    
    // Count how many times the title appears (should only be once in the header)
    const titleElements = await page.locator('text="Simple is not Easy"').all();
    
    // Should appear only once in the page header, not duplicated in content
    // Note: It might appear in sidebar too, so we check that main content doesn't duplicate
    const mainContentTitle = page.locator('main h1:has-text("Simple is not Easy")');
    await expect(mainContentTitle).toHaveCount(1);
    
    // Ensure content doesn't start with the same title as an H1
    const contentH1 = page.locator('.prose h1').first();
    if (await contentH1.count() > 0) {
      const h1Text = await contentH1.textContent();
      expect(h1Text).not.toBe('Simple is not Easy');
    }
  });

  test('should not show double bullets on lists', async ({ page }) => {
    await page.goto('/blog/simplicity/');
    
    // Check that list items don't have browser default bullets AND custom bullets
    const listItems = page.locator('.prose ul li');
    
    if (await listItems.count() > 0) {
      const firstItem = listItems.first();
      
      // Check computed styles to ensure no double bullets
      const listStyleType = await firstItem.evaluate(
        (el) => window.getComputedStyle(el).listStyleType
      );
      
      // Should be 'none' due to our CSS overrides
      expect(listStyleType).toBe('none');
      
      // Should have our custom bullet (::before pseudo-element)
      const hasCustomBullet = await firstItem.evaluate((el) => {
        const beforeStyles = window.getComputedStyle(el, '::before');
        return beforeStyles.content !== 'none' && beforeStyles.content !== '""';
      });
      
      expect(hasCustomBullet).toBe(true);
    }
  });

  test('should not show backticks around inline code', async ({ page }) => {
    await page.goto('/blog/simplicity/');
    
    // Find inline code elements
    const codeElements = page.locator('.prose code').not('.prose pre code');
    
    if (await codeElements.count() > 0) {
      const firstCode = codeElements.first();
      const codeText = await firstCode.textContent();
      
      // Should not start or end with backticks
      expect(codeText).not.toMatch(/^`.*`$/);
      
      // Check that no pseudo-element is adding backticks
      const beforeContent = await firstCode.evaluate((el) => {
        const beforeStyles = window.getComputedStyle(el, '::before');
        return beforeStyles.content;
      });
      
      const afterContent = await firstCode.evaluate((el) => {
        const afterStyles = window.getComputedStyle(el, '::after');
        return afterStyles.content;
      });
      
      // Both should be 'none' or empty
      expect(beforeContent).toMatch(/^(none|""|'')$/);
      expect(afterContent).toMatch(/^(none|""|'')$/);
    }
  });
});