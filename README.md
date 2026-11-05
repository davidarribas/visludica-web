# Vis Ludica

Sitio estático de Vis Ludica construido con Astro y publicado como assets en Cloudflare.

## Noticias: flujo Work-first

Astro es el único sistema operativo de noticias:

```text
ChatGPT Work → Markdown con YAML → Astro → validación/build → Git → Cloudflare
```

Cada noticia vive en `src/content/news/YYYY-MM-DD-<slug-descriptivo>.md`. La URL pública usa el nombre del fichero sin el prefijo de fecha. Su narración editorial está en el cuerpo Markdown y su ficha práctica se genera exclusivamente desde este frontmatter:

```yaml
schema: visludica-news-v1
title: Título de la noticia
summary: Resumen editorial
date: 2026-09-06 # opcional
published_at: 2026-09-06T23:42:00+02:00
event: announcement
image: # opcional; siempre bajo public/images/news/
  src: /images/news/url-publica-estable.webp
  alt: Descripción accesible de la imagen
products:
  - name: Nombre del juego o producto
    type: base_game # base_game | expansion | accessory
    parent: Juego base # opcional
    bgg_id: 123456 # opcional
    designers: # opcional
      - Nombre Apellido
    publisher_es: Editorial # opcional
    distributor_es: Distribuidor # opcional
    players_min: 1 # opcional
    players_max: 4 # opcional
    duration_min: 45 # opcional, minutos
    duration_max: 60 # opcional, minutos
    age_min: 12 # opcional
    price_eur: 39.95 # opcional
    release_date: 2026-09-20 # opcional
    language: Español # opcional
tags: # opcional
  - lanzamiento
```

Los datos desconocidos se omiten: no se guardan `N/D`, `Desconocido`, `Por determinar` ni valores nulos editoriales. Una noticia multiproducto añade elementos a `products`; una expansión relaciona el juego base por su nombre en `parent`. Las fuentes de investigación no forman parte del Markdown público.

`published_at` es un metadato técnico invisible que determina el orden de publicación. Los valores de `publisher_es` usan el nombre canónico definido en `src/data/publishers.yaml`.

Las imágenes de noticias usan una sola convención: `public/images/news/<slug>.<ext>`, referenciada como `/images/news/<slug>.<ext>`.

News Core está archivado en su propio repositorio y no participa en este flujo. Telegram tampoco forma parte de la implementación: ChatGPT Work genera su versión editorial final y David la publica manualmente, con imagen manual.

## Noticias: modo automático

El modo automático (WORK_FIRST_NEWS_PLAN V1.2, Parte B) usa el mismo contrato y pasa por dos workflows que lanza n8n:

```text
pieza JSON → «Noticia · borrador» → rama news/<slug> + PR (etiqueta noticia)
PR aprobado → «Noticia · publicar» → published_at real → squash a main → workflow Web
```

- **Borrador** (`.github/workflows/news-draft.yml`, entrada `pieza` y `reemplazar`): ejecuta `scripts/news-materialize.mjs`, pasa `npm test` y abre o actualiza el PR. Para corregir o cambiar la imagen se lanza otra vez con la pieza nueva y `reemplazar=true`.
- **Publicar** (`.github/workflows/news-publish.yml`, entrada `pr`): ejecuta `scripts/news-publish.mjs`, vuelve a pasar `npm test`, fusiona y lanza el despliegue. La publicación termina cuando la URL pública responde 200; solo entonces se publica en Telegram.
- **Descartar**: cerrar el PR y borrar la rama.

La pieza es la salida del paso editorial: `slug`, `frontmatter` (sin `published_at`, `schema` ni `image`), `body_markdown`, `telegram`, `image` (`url`, `path` o `telegram_file_path`, más `alt`), `fuentes_internas`, `dudas` y `origen`. El detalle está en la cabecera de `scripts/news-materialize.mjs`. La imagen se guarda como WebP de 1200 px y menos de 200 KB. El cuerpo del PR lleva la versión de Telegram, las dudas y las fuentes entre marcas `<!-- telegram:start -->`/`<!-- telegram:end -->` (igual para `dudas` y `fuentes`).

Requisitos en GitHub: *Settings → Actions → General → Workflow permissions* con «Allow GitHub Actions to create and approve pull requests» activado y, si se usan fotos enviadas al bot, el secreto `TELEGRAM_BOT_TOKEN`.

Codex puede usar el mismo script en local: `npm run news:materialize -- pieza.json`.

## Comandos

```sh
npm run content:validate
npm run build
npm test
```

El runbook del Power Ranking está en [docs/power-ranking.md](docs/power-ranking.md).
