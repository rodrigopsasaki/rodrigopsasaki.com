import { defineCollection } from 'astro:content';
import { blogPostSchema, projectSchema } from '@rodrigopsasaki/config';

const blog = defineCollection({
  type: 'content',
  schema: blogPostSchema,
});

const projects = defineCollection({
  type: 'content',
  schema: projectSchema,
});

export const collections = { blog, projects };