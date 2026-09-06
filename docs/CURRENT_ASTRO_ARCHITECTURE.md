# Arquitectura actual de Astro — Vis Ludica

## Flujo actual

```text
Páginas y configuración locales ─┐
Datos Power Ranking locales ─────┼─> Astro 6 / build estático ─> dist/ ─> assets Cloudflare ─> visludica.com
RSS de Captivate (en build) ─────┘
```

La raíz es `/Volumes/Dyson/Vibe/visludica`: una aplicación Astro gestionada con npm y Node `>=22.12.0`. `astro.config.mjs` fija `https://visludica.com` y activa sitemap.

## Fuente y contenido

Las páginas están en `src/pages/`. Podcast y Power Ranking se generan con `getStaticPaths`.

El podcast no se almacena localmente. `src/lib/rss.ts` descarga RSS de Captivate en build, extrae episodios y crea páginas, paginación e índice JSON de búsqueda; usa sus imágenes remotas.

Power Ranking vive en JSON y módulos TypeScript por edición en `src/data/power-ranking/`. `src/lib/power-ranking.ts` los importa para páginas y endpoint JSON. `scripts/import-power-ranking.mjs` es el importador manual desde Excel.

No hay Content Collections, Markdown/MDX editorial, CMS, base de datos ni APIs de aplicación. El único `fetch` de servidor identificado es RSS durante build. El navegador descarga JSON estático para Power Ranking.

## Renderizado y presentación

`src/layouts/BaseLayout.astro` envuelve páginas, carga globales, Header/Footer y genera título, canonical, descripción, Open Graph, Twitter, sitemap y RSS.

CSS nativo: `src/styles/tokens.css` define color, tipografía, espaciado, contenedores, sombras y modo oscuro. `src/styles/global.css` aporta reset, `.container`, `.section`, botones y `.prose`; componentes/páginas añaden CSS scoped. Inter Variable se importa desde `@fontsource-variable/inter`.

Assets locales se sirven desde `public/`. No hay `astro:assets`: las imágenes usan ruta pública o URL remota con `<img>`.

## Build y entrega

`npm run build` ejecuta `astro build` y genera `dist/`. La auditoría generó 304 rutas y `sitemap-index.xml`. `wrangler.jsonc` declara `dist/` como directorio de assets Cloudflare.

La rama seguida es `main` en GitHub. No hay CI, scripts de despliegue, previews ni hooks activos en el repositorio; el mecanismo remoto exacto no está visible aquí.

