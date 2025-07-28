import type { Language } from '../i18n/config';

/**
 * Site-wide configuration
 * This is where you control which features are enabled
 */
export const siteConfig = {
  /**
   * I18n Configuration
   * Control which languages are active on the site
   * 
   * - If only one language is enabled, the language toggle won't be shown
   * - The first language in the array will be the default
   * - Make sure you have content and translations for each enabled language
   */
  i18n: {
    // Available options: 'en', 'pt-BR'
    // To add more languages, update the languages object in i18n/config.ts first
    enabledLanguages: ['en'] as Language[],
    
    // Set to true to show language codes in URLs for all languages (including default)
    // Set to false to show clean URLs for the default language
    prefixDefaultLocale: false,
  },
  
  /**
   * Other site configuration can go here
   */
  site: {
    name: 'Rodrigo Sasaki',
    url: 'https://rodrigopsasaki.com',
    description: 'Software Engineer specializing in TypeScript, Node.js, and cloud architecture.',
  },
} as const;

// Derived configurations (computed from the above)
export const defaultLanguage = siteConfig.i18n.enabledLanguages[0];
export const isMultiLanguage = siteConfig.i18n.enabledLanguages.length > 1;
export const enabledLanguages = siteConfig.i18n.enabledLanguages;