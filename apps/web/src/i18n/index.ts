import { en } from './translations/en';
import { ptBR } from './translations/pt-BR';

export const languages = {
  en: 'English',
  'pt-BR': 'Português',
} as const;

export type Language = keyof typeof languages;

export const defaultLang: Language = 'en';

const translations = {
  en,
  'pt-BR': ptBR,
} as const;

export type TranslationKey = typeof en;

export function getLangFromUrl(url: URL): Language {
  const [, lang] = url.pathname.split('/');
  if (lang in translations) return lang as Language;
  return defaultLang;
}

export function useTranslations(lang: Language) {
  return translations[lang] || translations[defaultLang];
}

export function getLocalizedPath(path: string, lang: Language): string {
  // Remove any existing language prefix
  const cleanPath = path.replace(/^\/(en|pt-BR)/, '');
  
  // For default language (en), don't add prefix
  if (lang === defaultLang) {
    return cleanPath || '/';
  }
  
  // For other languages, add the prefix
  return `/${lang}${cleanPath || ''}`;
}

export function getAlternateLanguageLinks(currentPath: string): Array<{ lang: Language; href: string; label: string }> {
  // Remove any existing language prefix to get the base path
  const basePath = currentPath.replace(/^\/(en|pt-BR)/, '');
  
  return Object.entries(languages).map(([lang, label]) => ({
    lang: lang as Language,
    href: getLocalizedPath(basePath, lang as Language),
    label,
  }));
}

// Helper to format dates in the correct locale
export function formatDate(date: Date | string, lang: Language): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = lang === 'pt-BR' ? 'pt-BR' : 'en-US';
  
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper to get the correct locale for the HTML lang attribute
export function getHtmlLang(lang: Language): string {
  return lang === 'pt-BR' ? 'pt-BR' : 'en';
}