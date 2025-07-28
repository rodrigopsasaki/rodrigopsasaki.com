import { getCollection } from 'astro:content';
import type { Language } from './config';
import { getCollectionName, defaultLang } from './config';

export async function getLocalizedCollection(collection: string, lang: Language) {
  try {
    const collectionName = getCollectionName(collection, lang);
    return await getCollection(collectionName as any);
  } catch (error) {
    // Fallback to default language if the localized collection doesn't exist
    console.warn(`Collection ${collection} not found for language ${lang}, falling back to ${defaultLang}`);
    const fallbackCollectionName = getCollectionName(collection, defaultLang);
    return await getCollection(fallbackCollectionName as any);
  }
}

export async function getLocalizedEntry(collection: string, slug: string, lang: Language) {
  try {
    const collectionName = getCollectionName(collection, lang);
    const entries = await getCollection(collectionName as any);
    return entries.find((entry) => entry.slug === slug);
  } catch (error) {
    // Fallback to default language
    console.warn(`Entry ${slug} not found in ${collection} for language ${lang}, falling back to ${defaultLang}`);
    const fallbackCollectionName = getCollectionName(collection, defaultLang);
    const entries = await getCollection(fallbackCollectionName as any);
    return entries.find((entry) => entry.slug === slug);
  }
}

// Helper to get all available languages for a specific piece of content
export async function getAvailableLanguagesForContent(collection: string, slug: string): Promise<Language[]> {
  const availableLanguages: Language[] = [];
  
  const languages: Language[] = ['en', 'pt-BR']; // This could be imported from config
  
  for (const lang of languages) {
    try {
      const collectionName = getCollectionName(collection, lang);
      const entries = await getCollection(collectionName as any);
      if (entries.find((entry) => entry.slug === slug)) {
        availableLanguages.push(lang);
      }
    } catch (error) {
      // Language doesn't exist for this content
    }
  }
  
  return availableLanguages;
}