import { defineCollection, z } from 'astro:content';
import { blogPostSchema, projectSchema } from '@rodrigopsasaki/config';

// English collections  
const blog = defineCollection({
  type: 'content',
  schema: blogPostSchema,
});

const projects = defineCollection({
  type: 'content',
  schema: projectSchema,
});

// Portuguese collections
const blogPtBR = defineCollection({
  type: 'content',
  schema: blogPostSchema,
});

const projectsPtBR = defineCollection({
  type: 'content',
  schema: projectSchema,
});

export const collections = { 
  'en/blog': blog,
  'en/projects': projects,
  'pt-BR/blog': blogPtBR,
  'pt-BR/projects': projectsPtBR,
};