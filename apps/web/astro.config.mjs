// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://rodrigopsasaki.com',
  integrations: [tailwind()],
  output: 'static',
  trailingSlash: 'never',
  build: {
    format: 'directory'
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt-BR'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    }
  }
});
