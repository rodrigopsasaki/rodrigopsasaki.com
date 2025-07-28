import type { Language } from './config';

// Import all translation files
const translationModules = import.meta.glob('./translations/*.ts', { eager: true });

// Build translations object
const translations: Record<Language, any> = {} as Record<Language, any>;

for (const path in translationModules) {
  const lang = path.match(/\.\/translations\/(.+)\.ts$/)?.[1] as Language;
  if (lang) {
    const module = translationModules[path] as any;
    // Get the exported translation object (assuming it's the default export or named after the language)
    translations[lang] = module.default || module[lang] || module[Object.keys(module)[0]];
  }
}

export function useTranslations(lang: Language) {
  return translations[lang] || translations['en'];
}

// Helper type to get translation keys
export type TranslationKey = typeof translations['en'];