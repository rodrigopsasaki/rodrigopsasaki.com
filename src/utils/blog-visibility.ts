export const BLOG_VISIBILITIES = ['hidden', 'draft', 'published'] as const;

export type BlogVisibility = (typeof BLOG_VISIBILITIES)[number];

export function isBlogVisible(
  data: { visibility: BlogVisibility },
  isDevelopment: boolean
): boolean {
  if (data.visibility === 'published') return true;
  return isDevelopment && data.visibility === 'draft';
}
