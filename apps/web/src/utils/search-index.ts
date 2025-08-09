import { getLocalizedCollection } from '../i18n/content';
import { personalInfo, summary, experience, education, skillCategories } from '../data/cv-data';

export interface SearchItem {
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
  // Remove frontmatter, code blocks, HTML tags, and clean up markdown
  const cleanContent = content
    .replace(/^---[\s\S]*?---\n/, '') // Remove frontmatter
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/class="[^"]*"/g, '') // Remove class attributes specifically
    .replace(/style="[^"]*"/g, '') // Remove style attributes
    .replace(/data-[^=]+=["'][^"']*["']/g, '') // Remove data attributes
    .replace(/#+\s/g, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/>\s/g, '') // Remove blockquotes
    .replace(/\|\s*-+\s*\|/g, '') // Remove table separators
    .replace(/\|([^|\n]+)\|/g, '$1') // Clean up table content
    .replace(/\n\s*\n+/g, ' ') // Replace multiple line breaks with space
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }

  // Find the last complete sentence within the limit
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
  // Clean text content removing any HTML, CSS classes, and unwanted markup
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/class="[^"]*"/g, '') // Remove class attributes
    .replace(/style="[^"]*"/g, '') // Remove style attributes
    .replace(/data-[^=]+=["'][^"']*["']/g, '') // Remove data attributes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function getContentType(post: any): SearchItem['type'] {
  if (post.data.series) {
    return post.data.order ? 'series-episode' : 'series-overview';
  }
  return 'individual';
}

export async function generateSearchIndex(): Promise<SearchItem[]> {
  const searchItems: SearchItem[] = [];

  // Index blog posts
  const posts = await getLocalizedCollection('blog', 'en');
  const filteredPosts = posts.filter(({ data }) => data.draft !== true);

  const blogItems: SearchItem[] = filteredPosts.map((post) => {
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
      seriesOrder: post.data.order,
      date: post.data.date,
      url: `/blog/${post.id.replace('.md', '')}/`,
      type: getContentType(post),
      author: post.data.author || 'Rodrigo Sasaki',
      category: 'blog'
    };
  });

  searchItems.push(...blogItems);

  // Index projects
  try {
    const projects = await getLocalizedCollection('projects', 'en');
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
        date: new Date('2024-01-01').toISOString(), // Projects don't have dates, use fixed date
        url: `/projects/${project.id.replace('.md', '')}/`,
        type: 'project',
        author: 'Rodrigo Sasaki',
        category: 'project'
      };
    });

    searchItems.push(...projectItems);
  } catch (error) {
    // Projects collection might not exist, continue without it
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
  return searchItems.sort((a, b) => {
    if (a.category === 'cv') return -1;
    if (b.category === 'cv') return 1;
    if (a.category === 'project' && b.category === 'blog') return -1;
    if (a.category === 'blog' && b.category === 'project') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

// Utility function to get all unique tags
export function getAllTags(searchItems: SearchItem[]): string[] {
  const tagSet = new Set<string>();
  searchItems.forEach(item => {
    item.tags.forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

// Utility function to get all series
export function getAllSeries(searchItems: SearchItem[]): Array<{name: string, count: number}> {
  const seriesMap = new Map<string, number>();
  
  searchItems.forEach(item => {
    if (item.series) {
      seriesMap.set(item.series, (seriesMap.get(item.series) || 0) + 1);
    }
  });
  
  return Array.from(seriesMap.entries())
    .map(([name, count]) => ({name, count}))
    .sort((a, b) => a.name.localeCompare(b.name));
}