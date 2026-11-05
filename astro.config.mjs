import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://visludica.com',
  publicDir: process.env.ASTRO_NEWS_PUBLIC_DIR ?? './public',
  // Caché propia opcional: permite validar contenido en paralelo (tests,
  // materialización de noticias) sin pisar el data store del build normal.
  ...(process.env.ASTRO_CACHE_DIR ? { cacheDir: process.env.ASTRO_CACHE_DIR } : {}),
  // La convención pública efectiva es URL con barra final (build en
  // directorios, canonical y sitemap ya la usan y Cloudflare normaliza
  // redirigiendo). Declararla alinea el dev server y detecta enlaces
  // internos incorrectos; no cambia el build estático.
  trailingSlash: 'always',
  integrations: [sitemap()],
});
