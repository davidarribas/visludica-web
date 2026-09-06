# Auditoría Astro — Vis Ludica

## Resumen ejecutivo

Vis Ludica es una aplicación Astro 6 estática, sin CMS, Content Collections ni base de datos. El contenido actual procede de páginas Astro manuales, datos locales del Power Ranking y RSS remoto de Captivate para el podcast. El build genera todas las rutas y publica `dist/` como assets estáticos mediante Wrangler para Cloudflare.

Una futura sección de noticias encaja técnicamente en Content Collections, pero introduce una capacidad nueva: no hay colecciones, Zod ni relaciones que migrar. Debe conservar SSG, `getStaticPaths`, `BaseLayout`, tokens CSS y assets públicos. No se modificó producción.

## Stack detectado

| Elemento | Resultado |
| --- | --- |
| Raíz | `/Volumes/Dyson/Vibe/visludica` |
| Runtime declarado | Node `>=22.12.0` |
| Runtime inspeccionado | Node `v24.13.0`, npm `11.18.0` |
| Gestor | npm (`package-lock.json`) |
| Astro | `6.3.3` resuelto, `^6.3.3` declarado |
| TypeScript | `tsconfig.json` strict de Astro; TypeScript no instalado |
| Salida | estática, `dist/` |
| Integración | `@astrojs/sitemap` `3.7.2` |
| Otras dependencias | Inter variable `5.2.8`, `fast-xml-parser` `5.8.0` |
| Hosting configurado | assets estáticos Cloudflare según `wrangler.jsonc` |

Scripts: `dev`, `build`, `preview`, `astro` y `ranking:import`. No hay lint, tests, typecheck ni deploy.

## Estructura del repositorio

```text
src/
├── components/       Header, Footer, EpisodeCard, CommunityCard, PowerRankingExperience
├── data/power-ranking/  JSON y editoriales TypeScript por edición
├── layouts/          BaseLayout.astro
├── lib/              RSS, saneado HTML y modelo del ranking
├── pages/            páginas, rutas dinámicas y endpoints JSON
├── styles/           global.css y tokens.css
└── config.ts         configuración editorial y enlaces globales
public/               logo, favicons y redirect estático
scripts/              importador mensual del Power Ranking
docs/                 runbooks y documentación
```

No se detectó monorepo, workspace npm/pnpm, Docker, CI, hooks activos, Tailwind, PostCSS, Sass ni variables versionadas. Existía `.claude/` sin rastrear antes de la auditoría; no pertenece a este trabajo.

## Content Collections

No existe `src/content/`, `src/content.config.*`, `defineCollection`, `getCollection`, Zod ni `reference()`. El sitio no usa API legacy ni actual de Content Collections. Los datos son JSON importado y módulos TypeScript; no hay Markdown/MDX/YAML, frontmatter, borradores o normas editoriales de fechas.

El Power Ranking usa IDs internos slugificados y claves `project.games`; no hay relaciones entre colecciones. El podcast deriva el slug del título RSS con ordinal ante colisión (`src/lib/rss.ts`).

**Respuesta:** sí, Astro 6 expone `defineCollection` (evidencia local: `node_modules/astro/types/content.d.ts`), de modo que `games`, `versions`, `organizations` y `news` pueden añadirse limpiamente. Es una introducción, no una migración. Crear configuración única y validarla con Zod. Fijar y probar el API de referencias durante implementación, pues no hay ejemplos locales ni chequeo instalado.

## Rutas

`src/pages` usa file-based routing. Hay rutas estáticas (`/`, `/escuchar`, `/comunidad`, `/sobre`, `/barton`, legales, `/power-ranking`) y dinámicas estáticas:

- `/podcast/[slug]` y `/podcast/pagina/[page]` desde RSS, con `getStaticPaths`.
- `/power-ranking/[year]/[month]` desde datos locales, con `getStaticPaths`.
- Endpoints JSON estáticos: `/podcast/indice.json` y `/power-ranking/[year]/[month]/datos.json`.

El build confirmó `static`. No hay SSR, híbrido, middleware ni redirects Astro. `public/_redirects` sólo define `/listen → /escuchar` (301). `BaseLayout` calcula canonical con pathname y `Astro.site`.

Patrón futuro: `src/pages/noticias/[slug].astro` con `getStaticPaths`, y `src/pages/noticias/index.astro` como listado; paginación según `/podcast/pagina/[page]`.

## Componentes y layouts reutilizables

| Ruta | Función / props | Uso en noticias |
| --- | --- | --- |
| `src/layouts/BaseLayout.astro` | marco global; `title`, `description`, `image`, `type` | detalle/listado; admite `type="article"` |
| `src/components/Header.astro` | navegación, tema y menú móvil | añadir Noticias a su arreglo local |
| `src/components/Footer.astro` | enlaces globales/legales | reutilizar |
| `src/components/EpisodeCard.astro` | tarjeta `episode`, `featured` | patrón para `NewsCard`, no reutilizable por tipo |
| `src/components/CommunityCard.astro` | tarjeta/enlace | patrón secundario |
| `src/styles/global.css` `.prose` | contenido rico | cuerpo editorial |

No hay componentes para breadcrumbs, autor, fuentes, fecha genérica, enlace externo editorial o JSON-LD. El detalle de podcast aporta el patrón de artículo: vuelta, `h1`, barra lateral y `.prose`.

## Estilos

CSS nativo: `global.css` se importa desde `BaseLayout` y los componentes/páginas aportan `<style>` scoped. No hay Tailwind, Sass ni PostCSS.

`src/styles/tokens.css` define color, espaciado, escala tipográfica, radios, sombras, `--container-max: 1200px` y `--header-height: 64px`. Inter Variable se carga desde `@fontsource-variable/inter`. Hay modo oscuro por `prefers-color-scheme` y `data-theme`/`localStorage`. Breakpoints: 900px, 768px, 640px, 540px y 480px.

La sección debe usar `BaseLayout`, `.container`, `.section`, `.label`, `.btn`, `.prose`, tokens `var(--*)` y CSS scoped. No introducir utilidades o tokens paralelos.

## Imágenes

Los assets locales están en `public/` (logo y favicons). No hay `src/assets`, `astro:assets`, componente `Image`, dominios remotos permitidos ni optimización. Header/Footer usan `/logo.png`; podcast/home usan `<img>` con URLs de Captivate. Las tarjetas de episodio usan `loading="lazy"` y `decoding="async"`; detalle y hero no.

1. Siguiendo el patrón vigente, las portadas de Version deben residir en `public/images/versions/` con ID estable de versión, no título.
2. News debe reutilizar la ruta de portada de Version, no duplicar archivo. Una imagen excepcional tendrá ruta propia.
3. `dist/` se publica como assets Wrangler: muchas imágenes aumentarán artefacto y despliegue. Límites/caché son **PENDIENTE DE DAVID**.
4. No se generan imágenes sociales. `BaseLayout` usa imagen recibida o `/logo.png` para Open Graph y Twitter como URL absoluta.

Migrar a `src/assets`/`astro:assets` sería una mejora separada que requiere decidir patrón de importación y optimización.

## SEO

`BaseLayout` centraliza título, descripción, canonical, Open Graph, `og:locale=es_ES`, `og:type`, Twitter `summary_large_image`, favicon, sitemap y enlace RSS externo. `@astrojs/sitemap` crea sitemap en build. No hay `robots.txt`, JSON-LD ni RSS generado por el proyecto.

Una noticia debe aportar título, resumen, slug, fecha, imagen/fallback y tipo `article`; después podrán añadirse actualización, autor y fuentes. No añadir JSON-LD sin decisión editorial.

## Build y tests

| Comando | Resultado |
| --- | --- |
| `npm ls --depth=0` | dependencias instaladas sin errores |
| `npm run astro -- check` | no ejecutado: Astro solicitó instalar `@astrojs/check` y `typescript`; no se añadieron por restricción |
| `npm run build` | correcto; estático, 304 páginas y sitemap; 3.24 s según salida |

No hay lint, tests ni typecheck. `dist/` está ignorado, contiene 324 ficheros y ocupa 10 MB. Build depende de Captivate para home y podcast; en esta ejecución respondió correctamente.

## Git y despliegue

Rama actual `main`, que sigue `origin/main` en GitHub (`davidarribas/visludica-web`). No hay hooks activos, GitHub Actions ni otro CI en repo. Un commit histórico configura Cloudflare estático, pero no revela el trigger.

No se detectaron preview/staging, healthchecks, webhooks ni comprobación de fin de despliegue. Punto mínimo seguro para un publicador: sólo datos/activos editoriales en rama, `npm run build`, PR y merge revisado en `main`. Que el merge despliegue automáticamente es **PENDIENTE DE DAVID**.

## Hosting

`wrangler.jsonc` declara `name: "visludica-web"`, compatibilidad `2026-07-07` y `assets.directory: "./dist/"`. Confirma assets estáticos con Wrangler/Cloudflare. Build local `npm run build`; output `dist/`; no hay variables requeridas visibles.

Producto Cloudflare exacto, CI/remoto, previews, caché y healthchecks: **PENDIENTE DE DAVID**. URL Astro: `https://visludica.com`.

## Integraciones existentes

| Fuente | Uso |
| --- | --- |
| Captivate RSS | `src/lib/rss.ts` descarga/parsa XML y crea episodios, rutas, imágenes e índice JSON en build |
| JSON + TypeScript local | `src/data/power-ranking/` y `src/lib/power-ranking.ts` alimentan ranking y endpoint JSON |
| Excel local | `scripts/import-power-ranking.mjs` importa ranking mensual |

No hay BGG, base de datos, CMS, object storage, API server-side ni servicio serverless. El servidor sólo hace `fetch` al RSS en build; el cliente del ranking descarga JSON generado.

## Encaje preliminar del modelo Game/Version/Organization/News

El modelo encaja en Content Collections de Astro 6 y SSG. Mantener colección por entidad e ID interno estable, separado de slug:

- `games`: ID, `bgg_id`, relaciones `parents`/`reimplements`.
- `versions`: ID, `bgg_version_id`, relación a `game`, portada y roles de organizaciones.
- `organizations`: entidad canónica para no repetir editor/distribuidor.
- `news`: slug, fecha, contenido, fuente(s) y `version` principal.

Relaciones por IDs/referencias validadas, nunca URL slugs. N↔N con rol como `{ organization, role }`. Evitar ciclos y duplicación: guardar IDs y resolver en generación, sin anidar entidades completas. Expansión y reimplementación son Games propios con relación correspondiente.

El proyecto actual no condiciona BGG: sus IDs sólo pertenecen al ranking. `bgg_id` y `bgg_version_id` son campos de dominio, no nombres de fichero ni slugs. Con cientos/miles de entradas SSG es viable si se evitan búsquedas cuadráticas/datos duplicados; medir con contenido real.

## Riesgos

| Nivel | Riesgo | Evidencia y mitigación posterior |
| --- | --- | --- |
| alto | Build no reproducible ante caída Captivate | home y `getStaticPaths` de podcast hacen `fetch`; definir cache/fallback antes de automatización |
| alto | Sin validación tipos | `astro check` requiere dependencias ausentes; crear ticket específico |
| medio | Despliegue/staging no verificable | sin CI/preview en repo; confirmar trigger y rollback |
| medio | Assets sin política volumen/optimización | sólo `public/`/`<img>`; definir estrategia antes de muchas portadas |
| medio | Relaciones son capacidad nueva | sin colección ni ejemplo; validar esquema mínimo |
| medio | Slug podcast depende título RSS | no repetir; slugs editoriales explícitos |
| bajo | SEO editorial incompleto | faltan fecha/autor/fuentes/JSON-LD; ampliar retrocompatible |
| bajo | Sólo un redirect | fijar URL canónica de noticias desde el lanzamiento |

No hay bloqueo técnico ni necesidad de reescritura. Astro `6.3.3` no es antiguo para este objetivo.

## Decisiones técnicas que ya pueden darse por confirmadas

- Sección SSG dentro del build Astro existente.
- Detalle con `BaseLayout`, canonical/metadatos y `type="article"`.
- Ruta `/noticias/[slug]` y listado `/noticias`.
- Content Collections pueden introducirse sin migrar contenido actual.
- Portadas referenciadas desde Version, nunca duplicadas en News.
- IDs BGG como campos de dominio, sin afectar ranking o podcast.

## Decisiones que todavía deben esperar

- Esquema definitivo y API exacto de referencias.
- Política: `public/` o `src/assets`.
- Resiliencia del RSS.
- Indexación, taxonomía, JSON-LD, autores, RSS de noticias y borradores.
- Automatización tras confirmar CI, staging y deploy.

## Pendiente de David

- Producto Cloudflare exacto y evento de producción.
- Staging/preview, promoción y rollback fuera del repositorio.
- Límites/política de imágenes y posible almacenamiento externo.
- Quién escribe contenido y flujo editorial/PR.

## Comandos ejecutados

```text
rg --files ...
sed -n ... documento de encargo, package.json, config y fuentes
find src public docs scripts -maxdepth 3 -type f | sort
npm ls --depth=0
node --version; npm --version
git status --short; git branch --all; git remote -v; git log --all ...
npm ls typescript
npm run astro -- check
npm run build
du -sh dist; find dist -type f | wc -l
```

No se instalaron dependencias. No hubo commits, push, cambios de rama ni modificaciones de producción.

