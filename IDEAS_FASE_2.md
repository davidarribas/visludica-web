# Ideas para Fase 2

Ideas que surgieron durante la construcción del MVP y que quedan fuera del alcance inicial.

## Contenido y discovery

- **Buscador de episodios** — búsqueda en cliente por título/descripción usando un índice JSON generado en build time
- **Tags/categorías por episodio** — usar las categorías del feed RSS para crear páginas de archivo por tag
- **Vanity RSS en visludica.com/feed.xml** — redirigir al feed de Captivate con tracking propio
- **Sección de Noticias** — blog editorial, noticias del hobby, curado desde Markdown

## Funcionalidades

- **Power Ranking** — sistema de clasificación de juegos, actualizable desde Markdown o un CSV
- **Modo oscuro** — las variables CSS están preparadas, solo hay que añadir el media query y un toggle
- **Multidioma** — estructura i18n para contenido en catalán o inglés
- **Buscador** — integración con Pagefind (estático, sin servidor) para búsqueda full-text

## Técnico

- **Imagen OG personalizada por episodio** — generación de imágenes OG con título del episodio usando @vercel/og o similar
- **Prebuild de episodios en caché** — cachear el JSON del RSS en build time para builds más rápidos
- **ISR (Incremental Static Regeneration)** — si se migra a Cloudflare Workers, regenerar solo episodios nuevos
- **Sitemap extendido** — añadir imágenes y fechas de modificación al sitemap

## Integración y distribución

- **Newsletter integrada** — formulario de suscripción a Destroquelar directamente desde el sitio
- **Comentarios por episodio** — valorar Giscus (GitHub Discussions) o similar, sin base de datos
- **Sección de próximos directos** — conectar con Twitch API o calendario manual en Markdown
- **Página de sponsors/colaboradores** — si el podcast tiene patrocinadores en el futuro

## Vis Bélica (clonar este repo)

- Clonar repo, cambiar `--color-accent` en tokens.css (#FF6B35 → color militar)
- Cambiar el feed RSS en src/lib/rss.ts
- Ajustar contenido de páginas /sobre, /comunidad, /barton
- Configurar nuevo dominio y repo GitHub separado
