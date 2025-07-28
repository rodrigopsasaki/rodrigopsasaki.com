export const languages = {
  en: {
    label: 'English',
    dir: 'ltr',
  },
  'pt-BR': {
    label: 'Português (Brasil)',
    dir: 'ltr',
  },
} as const;

export type Language = keyof typeof languages;
export const defaultLang: Language = 'en';
export const supportedLanguages = Object.keys(languages) as Language[];

// Content collection mapping
export const getCollectionName = (collection: string, lang: Language): string => {
  return `${lang}/${collection}`;
};

// Path utilities
export function getLangFromUrl(url: URL): Language {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) return lang as Language;
  return defaultLang;
}

export function getLocalizedPath(path: string, lang: Language): string {
  // Remove any existing language prefix
  const cleanPath = path.replace(/^\/(en|pt-BR)/, '');
  
  // For default language (en), don't add prefix
  if (lang === defaultLang) {
    return cleanPath || '/';
  }
  
  // For other languages, add the prefix
  // If cleanPath is empty, return just the lang prefix without trailing slash
  if (!cleanPath || cleanPath === '/') {
    return `/${lang}`;
  }
  
  return `/${lang}${cleanPath}`;
}

export function getAlternateLanguageLinks(currentPath: string): Array<{ lang: Language; href: string; label: string }> {
  // Remove any existing language prefix to get the base path
  const basePath = currentPath.replace(/^\/(en|pt-BR)/, '');
  
  return supportedLanguages.map((lang) => ({
    lang,
    href: getLocalizedPath(basePath, lang),
    label: languages[lang].label,
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
  return lang;
}