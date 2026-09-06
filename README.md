# Vis Ludica

Sitio estático de Vis Ludica construido con Astro y publicado como assets en Cloudflare.

## Noticias: flujo Work-first

Astro es el único sistema operativo de noticias:

```text
ChatGPT Work → Markdown con YAML → Astro → validación/build → Git → Cloudflare
```

Cada noticia vive en `src/content/news/<id>.md`. Su narración editorial está en el cuerpo Markdown y su ficha práctica se genera exclusivamente desde este frontmatter:

```yaml
schema: visludica-news-v1
title: Título de la noticia
slug: url-publica-estable
summary: Resumen editorial
date: 2026-09-06 # opcional
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

Las imágenes de noticias usan una sola convención: `public/images/news/<slug>.<ext>`, referenciada como `/images/news/<slug>.<ext>`.

News Core está archivado en su propio repositorio y no participa en este flujo. Telegram tampoco forma parte de la implementación: ChatGPT Work genera su versión editorial final y David la publica manualmente, con imagen manual.

## Comandos

```sh
npm run content:validate
npm run build
npm test
```

El runbook del Power Ranking está en [docs/power-ranking.md](docs/power-ranking.md).
