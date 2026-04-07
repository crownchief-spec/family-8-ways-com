import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://family.8-ways.com',
  integrations: [sitemap()],
  compressHTML: true,
});
