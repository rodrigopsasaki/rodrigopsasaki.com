# Test Suite

This directory contains comprehensive tests for the application, covering unit tests, integration tests, and end-to-end tests.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests with Playwright
│   ├── accessibility.spec.ts   # WCAG compliance and a11y testing
│   ├── blog.spec.ts            # Blog functionality and series
│   ├── navigation.spec.ts      # Navigation and layout
│   ├── pages.spec.ts           # Core pages (home, projects, CV)
│   └── search.spec.ts          # Search functionality
├── utils/
│   └── test-fixtures.ts        # Test utilities and fixtures
└── README.md
```

## Test Types

### Unit Tests
- **Location**: `src/components/*.test.ts`
- **Framework**: Vitest + Testing Library
- **Coverage**: Individual components and utilities
- **Example**: `MagicalSearchBar.test.ts`

### End-to-End Tests
- **Location**: `tests/e2e/*.spec.ts`
- **Framework**: Playwright
- **Coverage**: Complete user workflows and interactions
- **Browsers**: Chrome, Firefox, Safari, Mobile

### Accessibility Tests
- **Framework**: axe-core with Playwright
- **Coverage**: WCAG 2.1 AA compliance
- **Features**: Screen reader support, keyboard navigation, color contrast

## Running Tests

### Unit Tests
```bash
# Run all unit tests
pnpm test

# Run with UI
pnpm test:ui

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### End-to-End Tests
```bash
# Install browsers (first time only)
pnpm playwright:install

# Run E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug
```

### All Tests
```bash
# Run everything
pnpm test:all

# CI mode (faster, less verbose)
pnpm test:ci
```

## Test Coverage

### Search Functionality ✅
- [x] Keyboard shortcuts (`/` to focus)
- [x] Arrow key navigation with highlighting
- [x] Search debouncing and performance
- [x] Recent searches persistence
- [x] Error handling and edge cases
- [x] Accessibility compliance
- [x] Mobile responsiveness

### Navigation & Layout ✅
- [x] Main navigation between pages
- [x] Responsive design across devices
- [x] SEO meta tags and structured data
- [x] Language switching (i18n)
- [x] Theme switching (dark/light)
- [x] Error page handling

### Blog Features ✅
- [x] Blog listing and individual posts
- [x] Series with collapsible episodes
- [x] "Show more" functionality for long series
- [x] Breadcrumb navigation
- [x] Code syntax highlighting
- [x] Content formatting (markdown)

### Core Pages ✅
- [x] Homepage with proper content structure
- [x] Projects listing and individual project pages
- [x] Vision project integrations
- [x] CV/Resume page with professional content
- [x] Internationalization support
- [x] Print-friendly CV formatting

### Accessibility ✅
- [x] WCAG 2.1 AA compliance
- [x] Screen reader support
- [x] Keyboard-only navigation
- [x] Focus management
- [x] Color contrast requirements
- [x] Reduced motion support
- [x] Skip links and landmarks

### Performance ✅
- [x] Page load times
- [x] Resource optimization
- [x] Bundle size limits
- [x] Search performance with large datasets
- [x] Memory usage monitoring

## Test Configuration

### Vitest Configuration
- **File**: `vitest.config.ts`
- **Environment**: jsdom
- **Setup**: `src/test-setup.ts`
- **Coverage**: Built-in coverage reporting

### Playwright Configuration
- **File**: `playwright.config.ts`
- **Base URL**: `http://localhost:4322`
- **Browsers**: Chromium, Firefox, WebKit, Mobile
- **Reports**: HTML reports with screenshots

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/dom';
import { createMockUser, mockSearchData } from '../tests/utils/test-fixtures';

describe('MyComponent', () => {
  it('should render correctly', async () => {
    // Arrange
    const user = await createMockUser();
    
    // Act
    render('<my-component></my-component>');
    
    // Assert
    expect(screen.getByRole('button')).toBeVisible();
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('should navigate correctly', async ({ page }) => {
  // Arrange
  await page.goto('/');
  
  // Act
  await page.getByRole('link', { name: 'Blog' }).click();
  
  // Assert
  await expect(page).toHaveURL('/blog');
});
```

## Continuous Integration

The test suite is designed to run in CI environments:

1. **Unit tests run first** - Fast feedback on component logic
2. **E2E tests run after build** - Validates complete application
3. **Accessibility tests included** - Ensures compliance
4. **Performance monitoring** - Catches regressions

## Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Keep tests independent and isolated

### Selectors
- Prefer semantic selectors (roles, labels)
- Avoid implementation details
- Use test IDs for complex components
- Test user-facing behavior, not internals

### Accessibility
- Test with keyboard-only navigation
- Verify screen reader announcements
- Check color contrast programmatically
- Test with reduced motion preferences

### Performance
- Set reasonable timeout limits
- Monitor bundle sizes in tests
- Test with large datasets
- Verify memory usage doesn't leak

## Troubleshooting

### Common Issues
1. **Flaky tests**: Add proper waits and assertions
2. **Timeout errors**: Increase timeout or optimize test setup
3. **Browser install errors**: Run `pnpm playwright:install-deps`
4. **Coverage gaps**: Check test file patterns in config

### Debug Mode
```bash
# Debug specific test
pnpm test:e2e:debug --grep "search functionality"

# Visual debug with UI
pnpm test:e2e:ui

# Unit test debugging
pnpm test:ui
```

## Test Data

All test fixtures and mock data are centralized in `tests/utils/test-fixtures.ts`:
- Mock search data with realistic content
- Blog series with episodes
- Project data with integrations
- Utility functions for common test scenarios