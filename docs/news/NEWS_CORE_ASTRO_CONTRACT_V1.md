# Contrato News Core → Astro V1

> **Status: FROZEN FOR NEWS-CORE V1.** `visludica-news-core` debe escribir
> contenido compatible con este contrato. Un cambio incompatible exige una
> migración explícita o `CONTENT_MODEL_V2`.

## Colecciones públicas

News Core escribe ficheros Markdown en estas colecciones públicas:

```text
src/content/games/
src/content/versions/
src/content/organizations/
src/content/news/
```

El ID interno de cada entrada es la ruta relativa al directorio de su
colección, sin `.md`. Es estable, explícito por nombre de fichero y distinto de
los identificadores externos de BGG.

## Lo que debe producir News Core

Para cada noticia, News Core debe resolver o crear el `Game`, la `Version` y,
solo si están confirmadas, las `Organization` necesarias; después crea la
`News`. Debe producir IDs internos estables, `News.slug` explícito y único,
referencias válidas, cuerpo Markdown y rutas de imágenes solo cuando existan.

Debe escribir únicamente datos confirmados. Un dato desconocido se omite:
no se sustituye por `null`, `N/A`, `0`, fechas ficticias ni IDs inferidos. En
particular, `bgg_id`, `bgg_version_id`, URLs de `editorial_input`, fechas y
organizaciones son opcionales y no deben fabricarse.

`slug` es obligatorio, estable tras publicar, no se recalcula desde `title` y
no se deriva obligatoriamente del ID. News Core debe recibirlo o generarlo
antes de escribir; esta política no se implementa en Astro.

## Esquema que debe respetar

- **Game:** `title` y `type` son obligatorios. `type` es `base_game`,
  `expansion` o `accessory`; `bgg_id` es opcional. `relations.parents` y
  `relations.reimplements` son listas de referencias a `games` y por defecto
  están vacías.
- **Version:** `game`, `name`, `languages` y `organizations` son obligatorios.
  `markets` tiene por defecto `[]`; `bgg_version_id`, `release_date` y `cover`
  son opcionales. Los roles son `spanish_publisher`, `distributor` y
  `original_publisher`.
- **Organization:** requiere `name`.
- **News:** `title`, `summary`, `slug`, `version`, `event_type` y `sources` son
  obligatorios. `published_at`, `effective_date` e `image` son opcionales. El
  cuerpo Markdown forma el contenido editorial.

`event_type` admite `announcement`, `preorder`, `release`, `restock`,
`reprint`, `new_edition`, `crowdfunding`, `delay`, `cancellation` y
`date_change`.

Una fecha parcial es `{ value, precision }`: `day` usa `YYYY-MM-DD`, `month`
usa `YYYY-MM`, `quarter` usa `YYYY-QN`, `year` usa `YYYY`; `unknown` no admite
`value`. `News.published_at` es el momento de publicación de Vis Ludica,
`News.effective_date` el del acontecimiento comunicado y
`Version.release_date` una fecha o ventana de la edición. No son equivalentes.

Las fuentes `primary`, `secondary` y `community` requieren una URL válida.
`editorial_input` puede omitirla. No se añaden a contenido público títulos de
captura, hashes, snapshots, estados de borrador, aprobaciones, costes, tokens,
IDs de trabajos, IDs de Telegram, credenciales, errores ni logs.

## Ejemplo canónico — NON-PUBLIC CONTRACT EXAMPLE

Este ejemplo técnico no debe copiarse a `src/content/` ni publicarse.

```yaml
# organizations/contract-publisher.md
name: Contract Publisher

# games/contract-game.md
title: Contract Game
type: base_game
relations:
  parents: []
  reimplements: []

# versions/contract-spanish-edition.md
game: contract-game
name: Contract Game — edición española
languages: [es]
markets: [ES]
organizations:
  - organization: contract-publisher
    role: spanish_publisher
release_date:
  value: 2026-09-18
  precision: day
cover: /images/versions/contract-game.svg

# news/contract-game-preorder.md
title: Se abre la preventa de Contract Game
summary: Ejemplo no público de una preventa con fecha efectiva.
slug: preventa-contract-game
published_at: 2026-09-03T10:00:00+02:00
effective_date:
  value: 2026-09-05
  precision: day
version: contract-spanish-edition
event_type: preorder
sources:
  - type: primary
    url: https://example.com/contract-game-preorder
---

Markdown editorial de ejemplo.
```

Los IDs son, respectivamente, `contract-publisher`, `contract-game`,
`contract-spanish-edition` y `contract-game-preorder`; la ruta pública es
`/noticias/preventa-contract-game`.

## Responsabilidades de Astro

Astro valida estructura con Content Collections; `npm run content:validate`
comprueba las relaciones, las fuentes y la unicidad de slugs; las rutas
`/noticias` y `/noticias/[slug]` resuelven el grafo, heredan `Version.cover`
si la News no tiene imagen, renderizan Markdown y delegan el SEO en
`BaseLayout`.

Una escritura de News Core no se considera válida hasta ejecutar:

```text
npm run content:validate
npm run build
```

La secuencia futura es:

```text
News Core → Game / Version / Organization / News → content:validate → build → publicación
```

La publicación no forma parte de este contrato.

## Límite provisional del validador

El validador actual usa `devalue` y el almacén sincronizado interno de Astro
6.3.3. Está acoplado a detalles internos; antes de automatizar publicaciones
en producción debe tener una prueba de regresión específica o ser sustituido
por una estrategia basada en APIs públicas estables.
