import { getCollection, type CollectionEntry } from 'astro:content';
import type { Language } from './config';
import { getCollectionName, defaultLang, supportedLanguages } from './config';

export async function getLocalizedCollection(collection: 'blog', lang: Language): Promise<CollectionEntry<'en/blog' | 'pt-BR/blog'>[]>;
export async function getLocalizedCollection(collection: 'projects', lang: Language): Promise<CollectionEntry<'en/projects' | 'pt-BR/projects'>[]>;
export async function getLocalizedCollection(collection: string, lang: Language): Promise<CollectionEntry<'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects'>[]> {
  try {
    const collectionName = getCollectionName(collection, lang);
    return await getCollection(collectionName as 'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects');
  } catch (error) {
    // Fallback to default language if the localized collection doesn't exist
    console.warn(`Collection ${collection} not found for language ${lang}, falling back to ${defaultLang}`);
    const fallbackCollectionName = getCollectionName(collection, defaultLang);
    return await getCollection(fallbackCollectionName as 'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects');
  }
}

export async function getLocalizedEntry(collection: 'blog', slug: string, lang: Language): Promise<CollectionEntry<'en/blog' | 'pt-BR/blog'> | undefined>;
export async function getLocalizedEntry(collection: 'projects', slug: string, lang: Language): Promise<CollectionEntry<'en/projects' | 'pt-BR/projects'> | undefined>;
export async function getLocalizedEntry(collection: string, slug: string, lang: Language): Promise<CollectionEntry<'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects'> | undefined> {
  try {
    const collectionName = getCollectionName(collection, lang);
    const entries = await getCollection(collectionName as 'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects');
    return entries.find((entry: CollectionEntry<'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects'>) => entry.id === slug);
  } catch (error) {
    // Fallback to default language
    console.warn(`Entry ${slug} not found in ${collection} for language ${lang}, falling back to ${defaultLang}`);
    const fallbackCollectionName = getCollectionName(collection, defaultLang);
    const entries = await getCollection(fallbackCollectionName as 'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects');
    return entries.find((entry: CollectionEntry<'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects'>) => entry.id === slug);
  }
}

// Helper to get all available languages for a specific piece of content
export async function getAvailableLanguagesForContent(collection: string, slug: string): Promise<Language[]> {
  const availableLanguages: Language[] = [];
  
  for (const lang of supportedLanguages) {
    try {
      const collectionName = getCollectionName(collection, lang);
      const entries = await getCollection(collectionName as 'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects');
      if (entries.find((entry: CollectionEntry<'en/blog' | 'en/projects' | 'pt-BR/blog' | 'pt-BR/projects'>) => entry.id === slug)) {
        availableLanguages.push(lang);
      }
    } catch (error) {
      // Language doesn't exist for this content
    }
  }
  
  return availableLanguages;
}