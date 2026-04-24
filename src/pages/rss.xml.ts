import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection(
    'blog',
    ({ data }) => data.visible === true && data.draft !== true
  );

  const items = posts
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
    .map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date),
      description: post.data.description,
      link: `/blog/${post.slug}/`,
      categories: post.data.tags ?? [],
      author: post.data.author ?? 'Rodrigo Sasaki',
    }));

  return rss({
    title: 'Rodrigo Sasaki',
    description: 'Essays on simplicity, state, and the software we ship.',
    site: context.site ?? 'https://rodrigopsasaki.com',
    items,
    customData: '<language>en</language>',
  });
}
