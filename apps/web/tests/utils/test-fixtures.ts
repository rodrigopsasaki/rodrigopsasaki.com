/**
 * Test fixtures and utilities for the application
 */
import { vi } from 'vitest';

export const mockSearchData = [
  {
    id: '1',
    title: 'Understanding TypeScript Generics',
    description: 'A deep dive into TypeScript generics and their practical applications',
    url: '/blog/typescript-generics',
    category: 'blog',
    tags: ['typescript', 'javascript', 'generics'],
    contentPreview: 'TypeScript generics provide a way to create reusable components that work with multiple types...',
    content: 'Full blog post content about TypeScript generics...',
    author: 'Rodrigo P. Sasaki',
    date: '2024-01-15T00:00:00.000Z'
  },
  {
    id: '2',
    title: 'Building Scalable Node.js Applications',
    description: 'Best practices for building and scaling Node.js applications in production',
    url: '/blog/scalable-nodejs',
    category: 'blog',
    tags: ['nodejs', 'javascript', 'scaling', 'backend'],
    contentPreview: 'When building Node.js applications that need to scale, there are several key considerations...',
    content: 'Full blog post content about scalable Node.js applications...',
    author: 'Rodrigo P. Sasaki',
    date: '2024-01-20T00:00:00.000Z'
  },
  {
    id: '3',
    title: 'Vision Observability Framework',
    description: 'A comprehensive observability framework for Node.js applications',
    url: '/projects/vision',
    category: 'project',
    tags: ['nodejs', 'observability', 'monitoring', 'typescript'],
    contentPreview: 'Vision is a modern observability framework that provides comprehensive monitoring...',
    content: 'Full project description for Vision framework...',
    author: 'Rodrigo P. Sasaki',
    date: '2024-02-01T00:00:00.000Z'
  },
  {
    id: '4',
    title: 'Professional Experience',
    description: 'Senior Software Engineer with expertise in TypeScript, Node.js, and distributed systems',
    url: '/cv',
    category: 'cv',
    tags: ['experience', 'skills', 'typescript', 'nodejs', 'leadership'],
    contentPreview: 'Experienced software engineer with a passion for building scalable applications...',
    content: 'Full CV content...',
    author: 'Rodrigo P. Sasaki',
    date: '2024-01-01T00:00:00.000Z'
  }
];

export const mockBlogSeries = [
  {
    id: 'simplicity-series',
    title: 'The Art of Simplicity',
    description: 'A series exploring simplicity in software engineering',
    episodes: [
      {
        id: 'simplicity-philosophy',
        title: 'The Philosophy of Simple Code',
        url: '/blog/simplicity/philosophy',
        date: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'simplicity-complexity',
        title: 'When Complexity is Necessary',
        url: '/blog/simplicity/complexity',
        date: '2024-01-05T00:00:00.000Z'
      },
      {
        id: 'simplicity-techniques',
        title: 'Techniques for Simplification',
        url: '/blog/simplicity/techniques',
        date: '2024-01-10T00:00:00.000Z'
      }
    ]
  }
];

export const mockProjects = [
  {
    id: 'vision',
    title: 'Vision',
    description: 'Observability framework for Node.js',
    url: '/projects/vision',
    tags: ['nodejs', 'observability', 'typescript'],
    integrations: [
      { name: 'Express', url: '/projects/vision/express' },
      { name: 'Fastify', url: '/projects/vision/fastify' },
      { name: 'Koa', url: '/projects/vision/koa' },
      { name: 'NestJS', url: '/projects/vision/nestjs' },
      { name: 'Prisma', url: '/projects/vision/prisma' },
      { name: 'TypeORM', url: '/projects/vision/typeorm' },
    ]
  },
  {
    id: 'rodrigos-cli',
    title: 'Rodrigo\'s CLI',
    description: 'Personal command-line tools and utilities',
    url: '/projects/rodrigos-cli',
    tags: ['cli', 'nodejs', 'productivity']
  }
];

/**
 * Creates a mock DOM environment for testing
 */
export function createMockDOM() {
  document.body.innerHTML = '';
  
  // Add basic page structure
  const main = document.createElement('main');
  main.id = 'main';
  document.body.appendChild(main);
  
  const nav = document.createElement('nav');
  nav.innerHTML = `
    <a href="/">Home</a>
    <a href="/blog">Blog</a>
    <a href="/projects">Projects</a>
    <a href="/cv">CV</a>
  `;
  document.body.appendChild(nav);
  
  return { main, nav };
}

/**
 * Mock fetch function for testing
 */
export function createMockFetch(data: any = mockSearchData) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data)
  });
}

/**
 * Creates a mock user interaction helper
 */
export async function createMockUser() {
  const { userEvent } = await import('@testing-library/user-event');
  return userEvent.setup({
    delay: null // Remove delays for faster tests
  });
}

/**
 * Waits for element to be visible with timeout
 */
export async function waitForElement(selector: string, timeout = 5000) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const element = document.querySelector(selector);
    if (element && element.offsetParent !== null) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Element ${selector} not found within ${timeout}ms`);
}

/**
 * Mock localStorage for testing
 */
export function createMockLocalStorage() {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    length: 0,
    key: () => null
  };
}

/**
 * Creates a viewport matcher for responsive testing
 */
export const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  wide: { width: 1440, height: 900 }
};

/**
 * Mock intersection observer for testing
 */
export function createMockIntersectionObserver() {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  
  window.IntersectionObserver = mockIntersectionObserver;
  return mockIntersectionObserver;
}

/**
 * Creates a mock ResizeObserver
 */
export function createMockResizeObserver() {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  
  window.ResizeObserver = mockResizeObserver;
  return mockResizeObserver;
}

/**
 * Test helper for checking accessibility
 */
export async function expectElementToBeAccessible(element: Element) {
  // Basic accessibility checks
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'img') {
    expect(element.getAttribute('alt')).toBeTruthy();
  }
  
  if (tagName === 'a') {
    const text = element.textContent?.trim();
    const ariaLabel = element.getAttribute('aria-label');
    const title = element.getAttribute('title');
    
    expect(text || ariaLabel || title).toBeTruthy();
  }
  
  if (tagName === 'button' || element.getAttribute('role') === 'button') {
    const text = element.textContent?.trim();
    const ariaLabel = element.getAttribute('aria-label');
    
    expect(text || ariaLabel).toBeTruthy();
  }
  
  return true;
}

/**
 * Mock console methods for testing
 */
export function mockConsole() {
  const originalConsole = { ...console };
  
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
  console.info = vi.fn();
  
  return {
    restore: () => {
      Object.assign(console, originalConsole);
    },
    logs: console.log as any,
    warnings: console.warn as any,
    errors: console.error as any,
    info: console.info as any,
  };
}