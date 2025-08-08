import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const blog = await getCollection('blog');
  
  // Sort posts by date, newest first
  const sortedPosts = blog.sort((a, b) => 
    new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  return rss({
    title: 'Rodrigo Sasaki - Blog',
    description: 'Senior Software Engineer specializing in TypeScript, Node.js, and cloud architecture. Building scalable systems with a focus on observability and developer experience.',
    site: context.site,
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date),
      description: post.data.description,
      link: `/blog/${post.slug}/`,
      categories: post.data.tags || [],
      author: post.data.author || 'Rodrigo Sasaki',
    })),
    customData: `<language>en-us</language>
<webMaster>contact@rodrigopsasaki.com (Rodrigo Sasaki)</webMaster>
<managingEditor>contact@rodrigopsasaki.com (Rodrigo Sasaki)</managingEditor>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<atom:link href="https://rodrigopsasaki.com/rss.xml" rel="self" type="application/rss+xml" />`,
    stylesheet: false,
  });
}