import { test, expect } from '@playwright/test';

test.describe('Core Pages', () => {
  test.describe('Home Page', () => {
    test('should display homepage correctly', async ({ page }) => {
      await page.goto('/');
      
      // Should have a main heading
      await expect(page.locator('h1')).toBeVisible();
      
      // Should have main content sections
      const mainContent = page.locator('main, .main-content');
      await expect(mainContent).toBeVisible();
      
      // Should have navigation to other sections
      const navLinks = page.locator('a[href*="/blog"], a[href*="/projects"], a[href*="/cv"]');
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThanOrEqual(3);
    });

    test('should have proper SEO meta tags', async ({ page }) => {
      await page.goto('/');
      
      // Title should include name/brand
      await expect(page).toHaveTitle(/rodrigo/i);
      
      // Meta description
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveAttribute('content', /.{50,}/);
      
      // Open Graph tags
      const ogTitle = page.locator('meta[property="og:title"]');
      const ogDescription = page.locator('meta[property="og:description"]');
      const ogImage = page.locator('meta[property="og:image"]');
      
      await expect(ogTitle).toHaveAttribute('content', /.+/);
      await expect(ogDescription).toHaveAttribute('content', /.+/);
      if (await ogImage.count() > 0) {
        await expect(ogImage).toHaveAttribute('content', /https?:\/\/.+/);
      }
    });
  });

  test.describe('Projects Page', () => {
    test('should display projects listing', async ({ page }) => {
      await page.goto('/projects');
      
      // Should have projects page heading
      await expect(page.locator('h1')).toContainText(/projects/i);
      
      // Should show project items
      const projects = page.locator('[data-testid="project"], .project-item, a[href*="/projects/"]:not([href="/projects/"])');
      const projectCount = await projects.count();
      expect(projectCount).toBeGreaterThan(0);
    });

    test('should navigate to individual projects', async ({ page }) => {
      await page.goto('/projects');
      
      // Find and click on a project
      const projectLink = page.locator('a[href*="/projects/"]:not([href="/projects/"])').first();
      await expect(projectLink).toBeVisible();
      
      await projectLink.click();
      
      // Should navigate to project page
      await expect(page).toHaveURL(/\/projects\/[^/]+/);
      
      // Should have project content
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('main, .content')).toBeVisible();
    });

    test('should display project metadata', async ({ page }) => {
      await page.goto('/projects');
      
      const projectLink = page.locator('a[href*="/projects/"]:not([href="/projects/"])').first();
      if (await projectLink.count() > 0) {
        await projectLink.click();
        
        // Should have project description
        const description = page.locator('meta[name="description"]');
        await expect(description).toHaveAttribute('content', /.+/);
        
        // Should have proper heading
        await expect(page.locator('h1')).toBeVisible();
        
        // Look for project links (GitHub, demo, etc.)
        const externalLinks = page.locator('a[href^="http"]:not([href*="rodrigopsasaki.com"])');
        if (await externalLinks.count() > 0) {
          // External links should open in new tab
          await expect(externalLinks.first()).toHaveAttribute('target', '_blank');
          await expect(externalLinks.first()).toHaveAttribute('rel', /noopener|noreferrer/);
        }
      }
    });

    test('should handle Vision project integrations', async ({ page }) => {
      await page.goto('/projects/vision');
      
      // Should display main Vision project page
      await expect(page.locator('h1')).toContainText(/vision/i);
      
      // Should show integration options
      const integrations = page.locator('a[href*="/projects/vision/"]:not([href="/projects/vision/"])');
      const integrationCount = await integrations.count();
      expect(integrationCount).toBeGreaterThan(0);
      
      // Test one integration
      const firstIntegration = integrations.first();
      await firstIntegration.click();
      
      // Should navigate to integration page
      await expect(page).toHaveURL(/\/projects\/vision\/[^/]+/);
      await expect(page.locator('h1')).toBeVisible();
    });
  });

  test.describe('CV/Resume Page', () => {
    test('should display CV page correctly', async ({ page }) => {
      await page.goto('/cv');
      
      // Should have CV/Resume heading
      await expect(page.locator('h1')).toContainText(/cv|resume/i);
      
      // Should have main CV content
      await expect(page.locator('main, .content')).toBeVisible();
      
      // Should have sections like experience, education, skills
      const sections = page.locator('h2, h3, [role="region"]');
      const sectionCount = await sections.count();
      expect(sectionCount).toBeGreaterThan(2);
    });

    test('should have professional content structure', async ({ page }) => {
      await page.goto('/cv');
      
      // Look for typical CV sections
      const experienceSection = page.getByText(/experience|work/i);
      const skillsSection = page.getByText(/skills|technologies/i);
      const educationSection = page.getByText(/education/i);
      
      if (await experienceSection.count() > 0) {
        await expect(experienceSection.first()).toBeVisible();
      }
      if (await skillsSection.count() > 0) {
        await expect(skillsSection.first()).toBeVisible();
      }
      if (await educationSection.count() > 0) {
        await expect(educationSection.first()).toBeVisible();
      }
    });

    test('should be printer-friendly', async ({ page }) => {
      await page.goto('/cv');
      
      // Check for print styles (this is basic - real print testing is complex)
      const printStyles = await page.locator('style, link[rel="stylesheet"]')
        .evaluateAll(elements => 
          elements.some(el => el.textContent?.includes('@media print') || 
                              el.getAttribute('media')?.includes('print'))
        );
      
      // Should have some consideration for print media
      // (This is a basic check - real print testing requires more sophisticated approaches)
    });
  });

  test.describe('Internationalization', () => {
    test('should support Portuguese content', async ({ page }) => {
      // Test Portuguese version if it exists
      const response = await page.goto('/pt-BR/');
      
      if (response?.status() === 200) {
        // Should have proper lang attribute
        const html = page.locator('html');
        await expect(html).toHaveAttribute('lang', 'pt-BR');
        
        // Should have Portuguese content
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    });

    test('should have language switching', async ({ page }) => {
      await page.goto('/');
      
      // Look for language switcher
      const langSwitcher = page.locator('[lang], .language-switcher, [hreflang]');
      if (await langSwitcher.count() > 0) {
        // Should be able to switch languages
        const ptLink = page.locator('a[href*="/pt-BR"], a[hreflang="pt-BR"]');
        if (await ptLink.count() > 0) {
          await ptLink.first().click();
          await expect(page).toHaveURL(/\/pt-BR/);
        }
      }
    });

    test('should have proper hreflang tags', async ({ page }) => {
      await page.goto('/');
      
      // Check for alternate language links
      const hreflangLinks = page.locator('link[hreflang]');
      if (await hreflangLinks.count() > 0) {
        await expect(hreflangLinks.first()).toHaveAttribute('hreflang');
        await expect(hreflangLinks.first()).toHaveAttribute('href');
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle missing pages gracefully', async ({ page }) => {
      const response = await page.goto('/nonexistent-page-12345');
      
      // Should return 404
      expect(response?.status()).toBe(404);
      
      // Should display some content (error page or redirect)
      await expect(page.locator('body')).toBeVisible();
    });

    test('should handle malformed URLs', async ({ page }) => {
      // Test various malformed URLs
      const malformedUrls = [
        '/blog//double-slash',
        '/projects/../../../etc',
        '/blog/../../..',
      ];

      for (const url of malformedUrls) {
        const response = await page.goto(url);
        // Should not crash and should return some response
        expect(response?.status()).toBeDefined();
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (adjust as needed)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should have efficient resource loading', async ({ page }) => {
      const responses: Array<{ url: string; status: number; size: number }> = [];
      
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status(),
          size: response.headers()['content-length'] ? 
                parseInt(response.headers()['content-length']) : 0
        });
      });
      
      await page.goto('/');
      
      // Check that most resources loaded successfully
      const failedRequests = responses.filter(r => r.status >= 400);
      expect(failedRequests.length).toBeLessThan(2); // Allow for minor failures
      
      // Check for reasonable bundle sizes (adjust thresholds as needed)
      const jsFiles = responses.filter(r => r.url.includes('.js') && r.size > 0);
      const totalJsSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
      expect(totalJsSize).toBeLessThan(1000000); // Less than 1MB total JS
    });
  });
});