// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://behindthesigns.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // /thanks and /design-system are noindex; keep them out of the sitemap too
      filter: (page) => !page.includes('/thanks') && !page.includes('/design-system'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()]
  },
  markdown: {
    shikiConfig: {
      theme: 'dracula-soft',
      wrap: true
    }
  }
});