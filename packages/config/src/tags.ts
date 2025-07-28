export const tags = {
  // Tech tags
  typescript: { name: 'TypeScript', color: '#3178c6' },
  javascript: { name: 'JavaScript', color: '#f7df1e' },
  react: { name: 'React', color: '#61dafb' },
  nodejs: { name: 'Node.js', color: '#339933' },
  nestjs: { name: 'NestJS', color: '#e0234e' },
  astro: { name: 'Astro', color: '#ff5d01' },
  tailwind: { name: 'TailwindCSS', color: '#06b6d4' },
  
  // Topic tags
  frontend: { name: 'Frontend', color: '#8b5cf6' },
  backend: { name: 'Backend', color: '#10b981' },
  devops: { name: 'DevOps', color: '#f59e0b' },
  architecture: { name: 'Architecture', color: '#ef4444' },
  tutorial: { name: 'Tutorial', color: '#3b82f6' },
  opinion: { name: 'Opinion', color: '#ec4899' },
  opensource: { name: 'Open Source', color: '#6366f1' },
} as const;

export type TagKey = keyof typeof tags;

export function getTag(key: TagKey) {
  return tags[key];
}

export function getTagKeys(): TagKey[] {
  return Object.keys(tags) as TagKey[];
}