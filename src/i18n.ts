const translations = {
  en: {
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.projects': 'Projects',
    'nav.cv': 'CV',
    'home.title': 'Rodrigo Sasaki',
    'home.subtitle': 'Software Engineer',
    'home.description': "I like thinking about code and about systems. Here I'll share some of my work and my thoughts on software engineering",
    'home.cta.projects': 'View Projects',
    'home.cta.blog': 'Read Blog',
    'meta.title': 'Rodrigo Sasaki - Software Engineer',
    'meta.description': 'Senior Software Engineer specializing in TypeScript, Node.js, and cloud architecture.',
  },
  'pt-BR': {
    'nav.home': 'Início',
    'nav.blog': 'Blog',
    'nav.projects': 'Projetos',
    'nav.cv': 'Currículo',
    'home.title': 'Rodrigo Sasaki',
    'home.subtitle': 'Engenheiro de Software',
    'home.description': 'Eu construo sistemas de software bem pensados que priorizam clareza, manutenibilidade e experiência do desenvolvedor.',
    'home.cta.projects': 'Ver Projetos',
    'home.cta.blog': 'Ler Blog',
    'meta.title': 'Rodrigo Sasaki - Engenheiro de Software',
    'meta.description': 'Engenheiro de Software Sênior especializado em TypeScript, Node.js e arquitetura cloud.',
  },
} as const;

type Lang = keyof typeof translations;
type TranslationKey = keyof (typeof translations)['en'];

export function t(lang: string, key: TranslationKey): string {
  const l = (lang in translations ? lang : 'en') as Lang;
  return translations[l][key] ?? translations.en[key] ?? key;
}

export function formatDate(date: string, lang: string = 'en'): string {
  const locale = lang === 'pt-BR' ? 'pt-BR' : 'en-US';
  return new Date(date).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
