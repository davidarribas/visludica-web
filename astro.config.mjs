import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://visludica.com',
  publicDir: process.env.ASTRO_NEWS_PUBLIC_DIR ?? './public',
  integrations: [sitemap()],
});
