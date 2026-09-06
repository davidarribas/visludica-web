# Noticias públicas v0

## Rutas

- `/noticias` lista las entradas de `news` por `published_at` descendente.
- `/noticias/[slug]` genera una página estática por cada `news.data.slug`. El slug editorial no depende del ID interno del fichero.

## Resolución de contenido

Cada página resuelve `News → Version → Game` y las relaciones `Version → Organization` mediante `getEntry()` de `astro:content`. Una relación requerida ausente provoca un error explícito durante la generación estática.

## Imagen

La imagen se resuelve en este orden: `News.image`, `Version.cover` y, si ambas faltan, ninguna. El `BaseLayout` mantiene entonces su fallback habitual para los metadatos.

## Datos visibles

Las tarjetas muestran imagen cuando existe, título, resumen, fecha y juego. El detalle añade el tipo de juego, organizaciones con etiquetas editoriales y fuentes externas, además del cuerpo Markdown.

No se exponen identificadores BGG, idiomas, mercados, roles internos, páginas de entidades ni taxonomías públicas.

## Componentes

- `src/components/NewsCard.astro`: tarjeta presentacional con un view model ya resuelto.
- `src/lib/news.ts`: resolución limitada del grafo y utilidades de formato.

## Decisiones abiertas

- **PENDIENTE:** diseño definitivo de la hemeroteca, paginación, búsqueda y taxonomía.
- **PENDIENTE:** estrategia de imágenes reales y política editorial de fuentes.
