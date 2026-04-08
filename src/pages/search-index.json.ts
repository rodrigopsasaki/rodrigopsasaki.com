import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { personalInfo, summary, experience, education, skillCategories } from '../data/cv-data';

interface SearchItem {
  id: string;
  title: string;
  description: string;
  content: string;
  contentPreview: string;
  tags: string[];
  series?: string;
  seriesOrder?: number;
  date: string;
  url: string;
  type: 'series-overview' | 'series-episode' | 'individual' | 'project' | 'cv';
  author: string;
  category?: 'blog' | 'project' | 'cv';
}

function extractContentPreview(content: string, maxLength: number = 300): string {
  const cleanContent = content
    .replace(/^---[\s\S]*?---\n/, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/class="[^"]*"/g, '')
    .replace(/style="[^"]*"/g, '')
    .replace(/data-[^=]+=["'][^"']*["']/g, '')
    .replace(/#+\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/>\s/g, '')
    .replace(/\|\s*-+\s*\|/g, '')
    .replace(/\|([^|\n]+)\|/g, '$1')
    .replace(/\n\s*\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }

  const truncated = cleanContent.substring(0, maxLength);
  const lastSentence = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );

  if (lastSentence > maxLength * 0.7) {
    return truncated.substring(0, lastSentence + 1);
  }

  return truncated + '...';
}

function cleanTextContent(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/class="[^"]*"/g, '')
    .replace(/style="[^"]*"/g, '')
    .replace(/data-[^=]+=["'][^"']*["']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getContentType(post: { data: { series?: string; order?: number } }): SearchItem['type'] {
  if (post.data.series) {
    return post.data.order ? 'series-episode' : 'series-overview';
  }
  return 'individual';
}

export const GET: APIRoute = async () => {
  try {
    const searchItems: SearchItem[] = [];

    // Index blog posts
    try {
      const posts = await getCollection('blog', ({ data }) => data.draft !== true && data.visible === true);

      const blogItems: SearchItem[] = posts.map((post) => {
        const rawContent = post.body || '';
        const cleanContent = cleanTextContent(rawContent);
        const contentPreview = extractContentPreview(rawContent);

        return {
          id: post.id,
          title: cleanTextContent(post.data.title),
          description: cleanTextContent(post.data.description),
          content: cleanContent,
          contentPreview,
          tags: (post.data.tags || []).map((tag: string) => cleanTextContent(tag)),
          series: post.data.series,
          seriesOrder: post.data.seriesOrder,
          date: post.data.date,
          url: `/blog/${post.slug}/`,
          type: getContentType(post),
          author: post.data.author || 'Rodrigo Sasaki',
          category: 'blog'
        };
      });

      searchItems.push(...blogItems);
    } catch (error) {
      console.warn('Blog collection not found, skipping blog indexing:', error);
    }

    // Index projects
    try {
      const projects = await getCollection('projects', ({ data }) => data.visible === true);
      const projectItems: SearchItem[] = projects.map((project) => {
        const rawContent = project.body || '';
        const cleanContent = cleanTextContent(rawContent);
        const contentPreview = extractContentPreview(rawContent);

        return {
          id: `project-${project.id}`,
          title: cleanTextContent(project.data.title),
          description: cleanTextContent(project.data.description),
          content: cleanContent,
          contentPreview,
          tags: (project.data.tags || []).map((tag: string) => cleanTextContent(tag)),
          date: new Date('2024-01-01').toISOString(),
          url: `/projects/${project.slug}/`,
          type: 'project',
          author: 'Rodrigo Sasaki',
          category: 'project'
        };
      });

      searchItems.push(...projectItems);
    } catch (error) {
      console.warn('Projects collection not found, skipping project indexing');
    }

    // Index CV content
    const cvContent = `
${personalInfo.name}
${personalInfo.location}

Summary:
${summary}

Experience:
${experience.map(job => `
${job.company} - ${job.role} (${job.location})
${job.achievements.join(' ')}
`).join('')}

Education:
${education.map(edu => `
${edu.institution} - ${edu.degree} (${edu.startYear}-${edu.endYear})
`).join('')}

Technical Skills:
${Object.entries(skillCategories).map(([category, skills]) => `
${category}: ${skills.join(', ')}
`).join('')}
    `.trim();

    const cvItem: SearchItem = {
      id: 'cv',
      title: `${personalInfo.name} - CV`,
      description: summary,
      content: cleanTextContent(cvContent),
      contentPreview: extractContentPreview(summary),
      tags: ['CV', 'Resume', 'Experience', 'Skills', ...Object.keys(skillCategories)],
      date: new Date().toISOString(),
      url: '/cv/',
      type: 'cv',
      author: 'Rodrigo Sasaki',
      category: 'cv'
    };

    searchItems.push(cvItem);

    // Sort by relevance: CV first, then projects, then blog posts by date
    const sortedItems = searchItems.sort((a, b) => {
      if (a.category === 'cv') return -1;
      if (b.category === 'cv') return 1;
      if (a.category === 'project' && b.category === 'blog') return -1;
      if (a.category === 'blog' && b.category === 'project') return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return new Response(JSON.stringify(sortedItems), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error generating search index:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate search index' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
