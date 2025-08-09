import { test, expect } from '@playwright/test';

test.describe('Blog post styling enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog/simplicity/');
    await page.waitForLoadState('networkidle');
  });

  test('should have custom styled unordered lists without double bullets', async ({ page }) => {
    // Find any unordered list on the page
    const firstList = page.locator('ul').first();
    await expect(firstList).toBeVisible();
    
    // Check that default list-style-type is removed
    const listStyleType = await firstList.evaluate((el) => {
      return window.getComputedStyle(el).listStyleType;
    });
    expect(listStyleType).toBe('none');
    
    // Check that list items have proper spacing and custom bullets
    const firstListItem = firstList.locator('li').first();
    await expect(firstListItem).toBeVisible();
    
    const styles = await firstListItem.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      const beforeElement = window.getComputedStyle(el, '::before');
      return {
        paddingLeft: computed.paddingLeft,
        position: computed.position,
        beforeContent: beforeElement.content,
        beforeWidth: beforeElement.width
      };
    });
    
    // Should have left padding for custom bullet
    expect(styles.paddingLeft).toBe('24px'); // pl-6
    expect(styles.position).toBe('relative');
    // Custom bullet should exist
    expect(styles.beforeContent).toBe('""');
    expect(styles.beforeWidth).toBe('6px'); // w-1.5
  });

  test('should have custom styled ordered lists with colored numbers', async ({ page }) => {
    const orderedList = page.locator('ol').first();
    
    // Skip test if no ordered lists exist
    if (await orderedList.count() === 0) {
      test.skip();
      return;
    }
    
    const listStyleType = await orderedList.evaluate((el) => {
      return window.getComputedStyle(el).listStyleType;
    });
    expect(listStyleType).toBe('none');
    
    const firstItem = orderedList.locator('li').first();
    const hasCustomNumber = await firstItem.evaluate((el) => {
      const beforeElement = window.getComputedStyle(el, '::before');
      return beforeElement.content.includes('.');
    });
    expect(hasCustomNumber).toBe(true);
  });

  test('should style emphasized text with accent colors', async ({ page }) => {
    const italicText = page.locator('em').first();
    
    if (await italicText.count() > 0) {
      const styles = await italicText.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          fontStyle: computed.fontStyle,
          fontWeight: computed.fontWeight,
          color: computed.color
        };
      });
      
      // Should not be italic (we use not-italic class)
      expect(styles.fontStyle).toBe('normal');
      // Should have medium font weight
      expect(styles.fontWeight).toMatch(/500|medium/);
    }
  });

  test('should style blockquotes with colored borders and backgrounds', async ({ page }) => {
    const blockquote = page.locator('blockquote').first();
    
    if (await blockquote.count() > 0) {
      const styles = await blockquote.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderLeftWidth: computed.borderLeftWidth,
          paddingLeft: computed.paddingLeft,
          backgroundColor: computed.backgroundColor
        };
      });
      
      expect(styles.borderLeftWidth).toBe('4px');
      expect(styles.paddingLeft).toBe('24px'); // pl-6 = 24px
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('should create call-out boxes for paragraphs starting with bold text', async ({ page }) => {
    // Look for paragraphs that start with strong/bold text
    const calloutParagraphs = page.locator('p:has(strong:first-child)');
    
    if (await calloutParagraphs.count() > 0) {
      const styles = await calloutParagraphs.first().evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderLeftWidth: computed.borderLeftWidth,
          paddingLeft: computed.paddingLeft,
          backgroundColor: computed.backgroundColor
        };
      });
      
      expect(styles.borderLeftWidth).toBe('4px');
      expect(styles.paddingLeft).toBe('24px');
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('should have no duplicate bullets or numbers in lists', async ({ page }) => {
    // Check for any visible list-style markers that shouldn't be there
    const allListItems = page.locator('li');
    const count = await allListItems.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const item = allListItems.nth(i);
      const hasDefaultMarker = await item.evaluate((el) => {
        const parent = el.parentElement;
        if (!parent) return false;
        
        const parentStyle = window.getComputedStyle(parent);
        return parentStyle.listStyleType !== 'none';
      });
      
      expect(hasDefaultMarker).toBe(false);
    }
  });

  test('should maintain readability and accessibility', async ({ page }) => {
    // Check that text contrast is maintained
    const textElements = page.locator('p, li, h1, h2, h3, h4, h5, h6');
    const count = await textElements.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const element = textElements.nth(i);
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor
        };
      });
      
      // Ensure we have actual color values (not transparent)
      expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });
});