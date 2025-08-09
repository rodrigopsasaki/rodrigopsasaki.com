import { test, expect } from '@playwright/test';

test.describe('Blog Functionality', () => {
  test('should display blog listing page correctly', async ({ page }) => {
    await page.goto('/blog');
    
    // Should have blog page title
    await expect(page.locator('h1')).toContainText(/blog/i);
    
    // Should show blog posts or series
    const posts = page.locator('[data-testid="blog-post"], .blog-post, article');
    const postsCount = await posts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('should handle blog series with collapsible episodes', async ({ page }) => {
    await page.goto('/blog');
    
    // Look for series with episodes
    const seriesToggleButtons = page.locator('[data-series-id]');
    const buttonCount = await seriesToggleButtons.count();
    
    if (buttonCount > 0) {
      const firstSeriesButton = seriesToggleButtons.first();
      const seriesId = await firstSeriesButton.getAttribute('data-series-id');
      
      // Episodes should initially be collapsed or expanded based on design
      const episodesContainer = page.locator(`#episodes-${seriesId}`);
      
      // Click to toggle
      await firstSeriesButton.click();
      
      // Episodes container should be visible after click
      await expect(episodesContainer).toBeVisible();
      
      // Should contain episode links
      const episodeLinks = episodesContainer.locator('a[href*="/blog/"]');
      const episodeCount = await episodeLinks.count();
      expect(episodeCount).toBeGreaterThan(0);
      
      // Click again to collapse
      await firstSeriesButton.click();
      
      // Wait for animation/transition
      await page.waitForTimeout(500);
    }
  });

  test('should show "see all" for series with many episodes', async ({ page }) => {
    await page.goto('/blog');
    
    // Look for series that might have "see all" functionality
    const seeAllButtons = page.locator('button:has-text("see all"), button:has-text("show more")');
    const seeAllCount = await seeAllButtons.count();
    
    if (seeAllCount > 0) {
      const seeAllButton = seeAllButtons.first();
      
      // Click "see all" to expand
      await seeAllButton.click();
      
      // Should show more episodes
      const episodeLinks = page.locator('a[href*="/blog/"]');
      const episodeCount = await episodeLinks.count();
      expect(episodeCount).toBeGreaterThan(3);
      
      // Button text should change or button should be hidden
      await expect(seeAllButton).toBeHidden();
    }
  });

  test('should navigate to individual blog posts', async ({ page }) => {
    await page.goto('/blog');
    
    // Find and click on a blog post link
    const blogLink = page.locator('a[href*="/blog/"]:not([href="/blog/"])').first();
    await expect(blogLink).toBeVisible();
    
    await blogLink.click();
    
    // Should navigate to blog post
    await expect(page).toHaveURL(/\/blog\/[^/]+/);
    
    // Should have blog post content
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main, article, .content')).toBeVisible();
  });

  test('should display blog post metadata correctly', async ({ page }) => {
    await page.goto('/blog');
    
    // Navigate to a blog post
    const blogLink = page.locator('a[href*="/blog/"]:not([href="/blog/"])').first();
    if (await blogLink.count() > 0) {
      await blogLink.click();
      
      // Should show publication date
      const dateElement = page.locator('[datetime], .date, time');
      if (await dateElement.count() > 0) {
        await expect(dateElement.first()).toBeVisible();
      }
      
      // Should have proper headings structure
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      // Should have content
      const content = page.locator('main, article, .prose');
      await expect(content).toBeVisible();
    }
  });

  test('should have proper SEO for blog posts', async ({ page }) => {
    await page.goto('/blog');
    
    const blogLink = page.locator('a[href*="/blog/"]:not([href="/blog/"])').first();
    if (await blogLink.count() > 0) {
      await blogLink.click();
      
      // Should have proper title
      await expect(page).toHaveTitle(/.+/);
      
      // Should have meta description
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveAttribute('content', /.+/);
      
      // Should have structured data
      const structuredData = page.locator('script[type="application/ld+json"]');
      if (await structuredData.count() > 0) {
        await expect(structuredData.first()).toBeAttached();
      }
    }
  });

  test('should handle blog series navigation', async ({ page }) => {
    await page.goto('/blog');
    
    // Navigate to a blog post that's part of a series
    const seriesPostLink = page.locator('a[href*="/blog/"]:not([href="/blog/"])').first();
    if (await seriesPostLink.count() > 0) {
      await seriesPostLink.click();
      
      // Look for series navigation (next/prev episodes)
      const seriesNav = page.locator('.series-nav, [data-testid="series-navigation"]');
      if (await seriesNav.count() > 0) {
        // Should have links to other episodes
        const seriesLinks = seriesNav.locator('a[href*="/blog/"]');
        const linkCount = await seriesLinks.count();
        expect(linkCount).toBeGreaterThan(0);
      }
    }
  });

  test('should handle breadcrumbs correctly', async ({ page }) => {
    await page.goto('/blog');
    
    const blogLink = page.locator('a[href*="/blog/"]:not([href="/blog/"])').first();
    if (await blogLink.count() > 0) {
      await blogLink.click();
      
      // Look for breadcrumbs
      const breadcrumbs = page.locator('[aria-label*="breadcrumb"], .breadcrumb, nav ol');
      if (await breadcrumbs.count() > 0) {
        await expect(breadcrumbs.first()).toBeVisible();
        
        // Should contain link back to blog listing
        const blogBreadcrumb = breadcrumbs.locator('a[href*="/blog"]');
        if (await blogBreadcrumb.count() > 0) {
          await expect(blogBreadcrumb.first()).toBeVisible();
        }
      }
    }
  });

  test('should be mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/blog');
    
    // Content should be responsive
    const main = page.locator('main, .content').first();
    await expect(main).toBeVisible();
    
    const box = await main.boundingBox();
    expect(box?.width).toBeLessThan(380);
    
    // Series toggles should work on mobile
    const seriesToggleButtons = page.locator('[data-series-id]');
    if (await seriesToggleButtons.count() > 0) {
      const firstButton = seriesToggleButtons.first();
      await firstButton.tap();
      
      // Episodes should still be accessible
      const seriesId = await firstButton.getAttribute('data-series-id');
      const episodesContainer = page.locator(`#episodes-${seriesId}`);
      await expect(episodesContainer).toBeVisible();
    }
  });

  test('should support dark mode', async ({ page }) => {
    await page.goto('/blog');
    
    // Look for dark mode toggle
    const darkModeToggle = page.locator('[data-theme], .theme-toggle, [aria-label*="theme"]');
    if (await darkModeToggle.count() > 0) {
      // Get initial background color
      const body = page.locator('body');
      const initialBg = await body.evaluate(el => getComputedStyle(el).backgroundColor);
      
      // Toggle dark mode
      await darkModeToggle.first().click();
      await page.waitForTimeout(300);
      
      // Background should change
      const newBg = await body.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(newBg).not.toBe(initialBg);
    }
  });

  test('should handle code blocks and formatting correctly', async ({ page }) => {
    await page.goto('/blog');
    
    const blogLink = page.locator('a[href*="/blog/"]:not([href="/blog/"])').first();
    if (await blogLink.count() > 0) {
      await blogLink.click();
      
      // Look for code blocks
      const codeBlocks = page.locator('pre code, .highlight, .code-block');
      if (await codeBlocks.count() > 0) {
        await expect(codeBlocks.first()).toBeVisible();
        
        // Code blocks should be properly styled
        const codeBlock = codeBlocks.first();
        const bgColor = await codeBlock.evaluate(el => getComputedStyle(el).backgroundColor);
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Should have background
      }
      
      // Look for other formatting elements
      const formattingElements = page.locator('blockquote, strong, em, ul, ol');
      if (await formattingElements.count() > 0) {
        await expect(formattingElements.first()).toBeVisible();
      }
    }
  });
});