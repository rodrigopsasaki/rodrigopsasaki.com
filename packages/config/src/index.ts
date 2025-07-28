export * from './schemas.js';
export * from './tags.js';

// Site configuration
export const siteConfig = {
  // Set to true when you're open to new opportunities
  availableForWork: false,
  // Other site-wide settings can go here
  name: 'Rodrigo Sasaki',
  title: 'Senior Software Engineer',
  description: "Rodrigo Sasaki's personal website and digital playground",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}