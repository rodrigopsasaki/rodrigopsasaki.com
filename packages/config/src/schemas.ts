import { z } from 'zod';

export const blogPostSchema = z.object({
  title: z.string(),
  date: z.string(),
  tags: z.array(z.string()),
  description: z.string(),
  draft: z.boolean().optional().default(false),
  author: z.string().optional(),
  lastModified: z.string().optional(),
});

export const projectSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  github: z.string().url().optional(),
  demo: z.string().url().optional(),
  npm: z.string().url().optional(),
  featured: z.boolean().optional().default(false),
  order: z.number().optional(),
  parent: z.string().optional(), // For nested project pages
});

export type BlogPost = z.infer<typeof blogPostSchema>;
export type Project = z.infer<typeof projectSchema>;