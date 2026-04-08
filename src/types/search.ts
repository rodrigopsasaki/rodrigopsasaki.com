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
