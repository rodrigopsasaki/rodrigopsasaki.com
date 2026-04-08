import type { CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

interface SeriesNavigation {
  prev: BlogPost | null;
  next: BlogPost | null;
  breadcrumbs: Array<{ label: string; href?: string }>;
  seriesPosts: BlogPost[];
  isInSeries: boolean;
  seriesName: string | undefined;
  parentPost: BlogPost | null;
}

export function getSeriesName(post: BlogPost): string | undefined {
  if (post.data.series) return post.data.series;
  if (post.id.includes('/')) return post.id.split('/')[0];
  return undefined;
}

export function getSeriesNavigation(allPosts: BlogPost[], currentPost: BlogPost): SeriesNavigation {
  const seriesName = getSeriesName(currentPost);

  if (!seriesName) {
    return {
      prev: null,
      next: null,
      breadcrumbs: [{ label: 'Blog', href: '/blog/' }, { label: currentPost.data.title }],
      seriesPosts: [],
      isInSeries: false,
      seriesName: undefined,
      parentPost: null,
    };
  }

  const seriesPosts = allPosts
    .filter((p) => p.data.visible && (p.data.series === seriesName || p.id.startsWith(seriesName + '/')))
    .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));

  const isInSeries = seriesPosts.length > 1;

  const parentPost =
    seriesPosts.find(
      (p) => p.id === `${seriesName}.md` || (p.data.series === seriesName && !p.id.includes('/'))
    ) ?? null;

  const currentIndex = seriesPosts.findIndex((p) => p.id === currentPost.id);
  const prev = currentIndex > 0 ? seriesPosts[currentIndex - 1] : null;
  const next = currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null;

  const breadcrumbs: Array<{ label: string; href?: string }> = [{ label: 'Blog', href: '/blog/' }];

  if (isInSeries && parentPost) {
    breadcrumbs.push({
      label: parentPost.data.title,
      href: `/blog/${seriesName}/`,
    });
  }

  breadcrumbs.push({ label: currentPost.data.title });

  return { prev, next, breadcrumbs, seriesPosts, isInSeries, seriesName, parentPost };
}

export function postUrl(post: BlogPost): string {
  return `/blog/${post.id.replace('.md', '')}/`;
}
