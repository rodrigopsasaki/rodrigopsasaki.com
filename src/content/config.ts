import { defineCollection } from 'astro:content';
import { z } from 'zod';

const blogSchema = z.object({
  title: z.string(),
  date: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  lang: z.string().default('en'),
  draft: z.boolean().default(false),
  visible: z.boolean().default(false),
  author: z.string().optional(),
  lastModified: z.string().optional(),
  series: z.string().optional(),
  seriesOrder: z.number().optional(),
  parent: z.string().optional(),
});

const projectSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  lang: z.string().default('en'),
  github: z.string().url().optional(),
  demo: z.string().url().optional(),
  npm: z.string().url().optional(),
  featured: z.boolean().default(false),
  visible: z.boolean().default(false),
  order: z.number().optional(),
  parent: z.string().optional(),
});

export const collections = {
  blog: defineCollection({ type: 'content', schema: blogSchema }),
  projects: defineCollection({ type: 'content', schema: projectSchema }),
};
