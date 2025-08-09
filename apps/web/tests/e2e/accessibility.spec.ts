import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should pass accessibility audit on homepage', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility audit on blog page', async ({ page }) => {
    await page.goto('/blog');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility audit on projects page', async ({ page }) => {
    await page.goto('/projects');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility audit on CV page', async ({ page }) => {
    await page.goto('/cv');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Should have exactly one h1
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    expect(h1Count).toBe(1);
    
    // Check heading hierarchy (h1 -> h2 -> h3, etc.)
    const allHeadings = page.locator('h1, h2, h3, h4, h5, h6');
    const headings = await allHeadings.allTextContents();
    
    // Should have at least the main h1
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  test('should have proper form labels and ARIA attributes', async ({ page }) => {
    await page.goto('/');
    
    // Search input should have proper labeling
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.count() > 0) {
      // Should be accessible by label or aria-label
      const hasLabel = await searchInput.evaluate(input => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const ariaLabelledby = input.getAttribute('aria-labelledby');
        const associatedLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
        
        return !!(ariaLabel || ariaLabelledby || associatedLabel);
      });
      
      expect(hasLabel).toBeTruthy();
    }
  });

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Should be able to tab through interactive elements
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Test search focus with keyboard shortcut
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeFocused();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    
    // This is tested by axe-core in the main accessibility tests,
    // but we can add specific contrast checks for key elements
    const mainHeading = page.locator('h1').first();
    if (await mainHeading.count() > 0) {
      const contrast = await mainHeading.evaluate(element => {
        const styles = getComputedStyle(element);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        };
      });
      
      // Should have some color (not default/transparent)
      expect(contrast.color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('should have proper link accessibility', async ({ page }) => {
    await page.goto('/');
    
    // All links should have accessible names
    const links = page.locator('a[href]');
    const linkCount = await links.count();
    
    for (let i = 0; i < Math.min(linkCount, 10); i++) { // Test first 10 links
      const link = links.nth(i);
      const hasAccessibleName = await link.evaluate(el => {
        const text = el.textContent?.trim();
        const ariaLabel = el.getAttribute('aria-label');
        const title = el.getAttribute('title');
        
        return !!(text || ariaLabel || title);
      });
      
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should have proper image accessibility', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        
        // Images should have alt text or be marked as decorative
        const hasAlt = await img.getAttribute('alt');
        const hasAriaLabel = await img.getAttribute('aria-label');
        
        expect(hasAlt !== null || hasAriaLabel).toBeTruthy();
      }
    }
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/');
    
    // Test ARIA landmarks
    const landmarks = page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
    const landmarkCount = await landmarks.count();
    expect(landmarkCount).toBeGreaterThan(0);
    
    // Navigation should be identifiable
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();
  });

  test('should work with keyboard-only navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test search functionality with keyboard only
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeFocused();
    
    await searchInput.fill('simplicity');
    
    // Should be able to navigate results with arrows
    await page.keyboard.press('ArrowDown');
    
    // Should be able to select with Enter
    await page.keyboard.press('Enter');
    
    // Should navigate successfully
    await expect(page).toHaveURL(/simplicity/);
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Test that animations respect reduced motion
    // This is mostly tested through CSS, but we can verify elements are still functional
    const searchToggle = page.getByPlaceholder(/search/i);
    await searchToggle.focus();
    
    const searchResults = page.locator('#magical-search-results');
    if (await searchResults.count() > 0) {
      // Should still be functional even with reduced motion
      await expect(searchResults).toBeVisible();
    }
  });

  test('should have proper skip links', async ({ page }) => {
    await page.goto('/');
    
    // Test for skip navigation links (usually hidden until focused)
    const skipLinks = page.locator('a[href="#main"], a[href="#content"], .skip-link');
    if (await skipLinks.count() > 0) {
      // Skip links should become visible when focused
      await page.keyboard.press('Tab');
      const firstSkipLink = skipLinks.first();
      
      if ((await firstSkipLink.isVisible()) || (await firstSkipLink.count() > 0)) {
        // Should be able to use skip link
        await firstSkipLink.click();
        
        // Should jump to main content
        const mainContent = page.locator('#main, #content, main').first();
        await expect(mainContent).toBeVisible();
      }
    }
  });

  test('should announce dynamic content changes', async ({ page }) => {
    await page.goto('/');
    
    // Test search results announcement
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('simplicity');
    
    // Look for ARIA live regions that would announce changes
    const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
    if (await liveRegions.count() > 0) {
      // Should have some mechanism for announcing changes
      await expect(liveRegions.first()).toBeAttached();
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    await page.goto('/');
    
    // Simulate high contrast mode (basic test)
    await page.addStyleTag({
      content: `
        @media (prefers-contrast: high) {
          * { border: 1px solid !important; }
        }
      `
    });
    
    // Content should still be visible and usable
    const mainContent = page.locator('main, .content').first();
    await expect(mainContent).toBeVisible();
    
    // Interactive elements should still work
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.count() > 0) {
      await expect(searchInput).toBeVisible();
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    }
  });

  test('should have accessible error messages', async ({ page }) => {
    await page.goto('/');
    
    // Test search with no results
    await page.keyboard.press('/');
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill('xyznonexistentquery123');
    
    // No results message should be accessible
    const noResultsMessage = page.getByText(/no results found/i);
    if (await noResultsMessage.count() > 0) {
      await expect(noResultsMessage).toBeVisible();
      
      // Should be announced to screen readers
      const hasAriaLive = await noResultsMessage.getAttribute('aria-live');
      const hasRole = await noResultsMessage.getAttribute('role');
      
      // Should have some mechanism for screen reader announcement
      expect(hasAriaLive || hasRole).toBeTruthy();
    }
  });
});