# Modelo de contenido de noticias v0

## Estructura de las colecciones

- `games`: `title`, `bgg_id?`, `type` y `relations` (`parents`, `reimplements`).
- `organizations`: `name`.
- `versions`: `game`, `name`, `bgg_version_id?`, `languages`, `markets`, `organizations` (`organization`, `role`) y `cover?`.
- `news`: `title`, `summary`, `slug`, `published_at`, `version`, `event_type`, `sources` e `image?`. El cuerpo Markdown se renderiza como contenido editorial en la página pública de cada noticia.

## Mecanismo real de referencias

Astro 6.3.3 permite importar `defineCollection`, `reference` y `z` desde `astro:content`. Las colecciones de capa de contenido usan `glob` desde `astro/loaders` y se declaran en la configuración única `src/content.config.ts`.

`reference("games")`, por ejemplo, transforma el ID escrito en frontmatter en `{ id, collection: "games" }`. La resolución posterior se realiza buscando ese objeto en la colección indicada. La prueba con la versión instalada confirmó que `reference()` valida la forma y el nombre de colección, pero no comprueba por sí sola que el ID exista: una referencia rota aún permite finalizar `astro build`.

Por ello `npm run build` ejecuta primero `npm run content:validate`. Tras `astro sync`, el script comprueba la existencia de todos los destinos y falla antes del build si encuentra una relación rota. No se añadió ninguna dependencia: reutiliza `devalue`, ya instalado por Astro, para leer su almacén sincronizado.

## ID de cada entrada

Cada colección usa `glob()` con un `generateId` explícito: el ID es la ruta relativa del fichero Markdown sin `.md`. En los fixtures planos coincide con el nombre de fichero, por ejemplo `game-a-base`.

El ID no se deriva de `title`. En `news`, `slug` sigue siendo un campo editorial obligatorio e independiente: el `generateId` explícito evita que el comportamiento por defecto de `glob()` sustituya el ID de entrada por el valor de `slug`.

Por ejemplo, la entrada con ID `game-a-spanish-announcement` conserva el slug editorial distinto `anuncio-edicion-es-game-a`.

## Ejemplos de relaciones

- `games/game-b-expansion.relations.parents` → `games/game-a-base`.
- `games/game-c-reimplementation.relations.reimplements` → `games/game-a-base`.
- `versions/game-a-spanish-edition.game` → `games/game-a-base`.
- `versions/game-a-spanish-edition.organizations` → `organizations/organization-a` como `spanish_publisher` y `organizations/organization-b` como `distributor`.
- `news/game-a-spanish-announcement.version` y `news/game-a-spanish-preorder.version` → `versions/game-a-spanish-edition`.

## Comportamiento ante referencias rotas

`astro sync` y `astro build` aceptan un ID de destino inexistente cuando el campo usa únicamente `reference()`. `getEntry(reference)` no resuelve ese destino y devuelve `undefined` (además de emitir un aviso). La validación del proyecto trata ese caso como error mediante `scripts/validate-content-relations.mjs`.

El script incluye pruebas controladas para Game inexistente desde Version, Organization inexistente, parent inexistente y Version inexistente desde News. Los datos inválidos solo existen en copias en memoria y no quedan en los fixtures.

## Decisiones abiertas

- **PENDIENTE:** política editorial para asignar y conservar IDs internos al crear contenido real.
- **PENDIENTE:** política definitiva de slugs públicos y su relación futura con las URLs.
- **PENDIENTE:** si una versión anunciada debe usar ausencia de `bgg_version_id` o `null`; v0 usa ausencia, la representación opcional idiomática del esquema.
