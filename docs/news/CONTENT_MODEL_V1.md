# Modelo de contenido de noticias V1

> **Status: FROZEN FOR NEWS-CORE V1.** El futuro News Core debe producir
> contenido compatible con este contrato. Un cambio incompatible requiere
> migración explícita o `CONTENT_MODEL_V2`; «frozen» no impide una evolución
> futura deliberada.

V1 es el resultado del corpus de NEWS-ASTRO-003. Conserva el modelo de cuatro
entidades y solo incorpora cambios exigidos por casos concretos. Las ausencias
del corpus son ausencias de datos, no valores de relleno.

## Game

- `title`
- `bgg_id?`
- `type`: `base_game`, `expansion` o `accessory`
- `relations.parents` y `relations.reimplements`

`accessory` describe un producto comercial complementario que requiere su
propia Version y News. No expresa el acontecimiento. No se añade `promo`:
ningún caso requiere que un incentivo de preventa sea un producto navegable.

### Contrato implementado

| Campo | Estado en el esquema |
| --- | --- |
| `id` | generado desde la ruta relativa del Markdown sin extensión |
| `title` | obligatorio |
| `bgg_id` | opcional; entero positivo |
| `type` | obligatorio: `base_game`, `expansion` o `accessory` |
| `relations` | opcional; objeto con valor por defecto `{}` |
| `relations.parents` | lista de referencias a `games`, por defecto `[]` |
| `relations.reimplements` | lista de referencias a `games`, por defecto `[]` |

## Version

- `game`
- `name`
- `bgg_version_id?`
- `languages`, `markets`, `organizations` y `cover?`
- `release_date?`: fecha parcial de la salida comercial de esta edición.

`release_date` pertenece a Version porque es una propiedad de la edición que
puede ser anunciada, puesta en preventa y finalmente lanzada sin duplicarse en
cada News. Una News `release` puede conservar el acontecimiento histórico con
su `effective_date` aunque la previsión comercial posterior cambie.

| Campo | Estado en el esquema |
| --- | --- |
| `id` | generado desde la ruta relativa del Markdown sin extensión |
| `game` | obligatorio; referencia a `games` |
| `name` | obligatorio |
| `bgg_version_id` | opcional; entero positivo |
| `languages` | lista obligatoria |
| `markets` | lista opcional de entrada, por defecto `[]` |
| `organizations` | lista obligatoria de `{ organization, role }` |
| `release_date` | opcional; fecha parcial |
| `cover` | opcional; ruta de imagen |

## Organization

- `name`

Los roles se conservan: `spanish_publisher`, `distributor` y
`original_publisher`. El corpus no aporta una organización ni prueba que se
necesite otro rol; las listas vacías no se rellenan artificialmente.

`id` se genera desde la ruta relativa y `name` es obligatorio. No hay otros
campos. La colección puede no contener ninguna entrada; si una Version incluye
una relación, su Organization sí debe existir y pasa la validación referencial.

## News

- `title`, `summary`, `slug`
- `published_at?`: instante de publicación por Vis Ludica
- `effective_date?`: fecha parcial del acontecimiento comunicado
- `version`
- `event_type`
- `sources`
- `image?`; el cuerpo Markdown conserva el contenido editorial puntual

`published_at` se volvió opcional para no falsificar el archivo editorial
cuando la fecha original no ha sido suministrada. En contenido listo para la
cronología pública debe estar presente. `effective_date` solo se rellena si el
acontecimiento tiene una fecha conocida distinta: por ejemplo la apertura de
una preventa. No es sustituto de `published_at`.

Una fecha parcial es `{ value, precision }`, donde `precision` es `day`,
`month`, `quarter`, `year` o `unknown`. Sus formatos son respectivamente
`YYYY-MM-DD`, `YYYY-MM`, `YYYY-QN`, `YYYY` y ausencia de `value`. Así octubre
no se convierte en el día 1 y «próximamente» queda como `unknown` si se decide
conservarlo.

| Campo | Estado en el esquema |
| --- | --- |
| `id` | generado desde la ruta relativa del Markdown sin extensión |
| `title`, `summary`, `slug` | obligatorios |
| `published_at` | opcional; fecha/hora coercible por Astro |
| `effective_date` | opcional; fecha parcial |
| `version` | obligatorio; referencia a `versions` |
| `event_type` | obligatorio: `announcement`, `preorder`, `release`, `restock`, `reprint`, `new_edition`, `crowdfunding`, `delay`, `cancellation` o `date_change` |
| `sources` | lista obligatoria; puede ser vacía según el esquema actual |
| `image` | opcional; ruta de imagen que prevalece sobre `Version.cover` |
| cuerpo | cuerpo Markdown del fichero; Astro lo renderiza sin exigencia de longitud |

`News.published_at` es cuándo publica Vis Ludica; `News.effective_date` es
cuándo ocurre el acontecimiento comunicado; `Version.release_date` es una
fecha o ventana comercial propia de la edición. Son conceptos distintos y no
deben duplicarse si un dato no aporta significado adicional.

## Relaciones

```text
Game → Game          parents / reimplements
Version → Game       edición comercial de un producto
Version → Organization
News → Version       un producto + un acontecimiento
```

Una expansión tiene Game propio con `type: expansion`; no es una clase de
Version. Una reposición conserva la misma Version y crea otra News con
`event_type: restock`.

## Identidad

- `bgg_id` identifica una obra cuando se conoce; expansiones y
  reimplementaciones con BGG ID propio son otro Game.
- `bgg_version_id` identifica una edición comercial cuando se conoce.
- El ID interno es la ruta relativa del Markdown sin extensión: es estable y
  no deriva del título.
- `slug` es la identidad pública editorial de News, única e independiente del
  ID interno.

No se añaden `ean`, `product_code` ni `pvp`: el corpus no demuestra que sean
necesarios para distinguir una Version o para un comportamiento editorial.

## Fuentes

`primary`, `secondary` y `community` requieren URL. `editorial_input` admite
URL opcional para conservar información proporcionada directamente por David,
un vídeo o una publicación no capturable sin inventar enlace. La vista pública
etiqueta esta última como «Información editorial suministrada».

Una fuente puede producir varias News. V1 no almacena `source_batch_id`: esa
trazabilidad operativa pertenece al futuro News Core y no es necesaria para
representar ni publicar las noticias.

## Tipos y taxonomía pública provisional

| Regla interna | Categoría editorial |
| --- | --- |
| `event_type: announcement` | ANUNCIO |
| `event_type: preorder` | PREVENTA |
| `event_type: restock` | REPOSICIÓN |
| `event_type: crowdfunding` | CROWDFUNDING |
| `event_type: release` + `Game.type: expansion` | EXPANSIÓN |
| `event_type: release` + `Game.type: base_game` | posible NOVEDAD; regla no congelada |
| `event_type: reprint` o `new_edition` | posible REEDICIÓN; requiere criterio editorial |

La tabla no está implementada como UI. `Game.type` responde qué producto es;
`News.event_type`, qué ocurrió. Un anuncio de expansión sigue siendo ANUNCIO,
no EXPANSIÓN, si la taxonomía pública se usa como clase principal del
acontecimiento.

## Reedición

No hay un caso inequívoco que permita una regla universal. Una reedición puede
ser una Version nueva bajo el mismo Game, un Game nuevo si es una
reimplementación con identidad propia, o una News `new_edition` según la
evidencia comercial. Extra Ammo se conserva como Version comercial; queda
`NEEDS_EDITORIAL_RESEARCH` determinar si además merece la etiqueta editorial
REEDICIÓN.

## CHANGES FROM V0

```yaml
- change: added
  entity: Game
  field: type.accessory
  required: false
  justified_by:
    - leviathan-wilds-source-multiple
    - beast-products-source-multiple
  reason: Productos como el Pack de mutaciones, miniaturas, monedas y tokens
    necesitan News propias sin confundirse con expansiones ni acontecimientos.

- change: added
  entity: Version
  field: release_date
  required: false
  justified_by:
    - quartermaster-general-1914-preorder
    - zombie-princess-preorder
  reason: La fecha comercial de salida describe la edición y no debe duplicarse
    en la preventa, el lanzamiento y posibles actualizaciones de la misma Version.

- change: added
  entity: News
  field: effective_date
  required: false
  justified_by:
    - quartermaster-general-1914-preorder
    - zombie-princess-preorder
  reason: published_at no puede expresar por sí sola cuándo abre una preventa
    u ocurre el acontecimiento comunicado.

- change: changed
  entity: News
  field: published_at
  required: false
  justified_by:
    - quartermaster-general-1914-preorder
    - zombie-princess-preorder
    - beast-products-source-multiple
  reason: El corpus suministrado no contiene las fechas originales de Vis Ludica;
    la ausencia preserva la incertidumbre en lugar de fabricar una cronología.

- change: changed
  entity: News.sources.editorial_input.url
  field: url
  required: false
  justified_by:
    - quartermaster-general-1914-preorder
    - leviathan-wilds-source-multiple
    - beast-products-source-multiple
  reason: Información editorial directa debe poder conservarse sin URL inventada.
```

## Decisiones abiertas

- Recuperar las fechas, enlaces, organizaciones e identificadores desde las
  fuentes originales antes de considerar estas entradas archivo publicado final.
- Resolver los puntos marcados `NEEDS_EDITORIAL_RESEARCH` en el documento del
  corpus.
- No hay evidencia todavía para entidades de promoción, feria, lote de fuentes
  ni para nuevas clases de producto más específicas que `accessory`.

## Nota sobre el validador

`scripts/validate-content-relations.mjs` utiliza `devalue` y el almacén
sincronizado interno de Astro 6.3.3. Esta implementación está acoplada a
detalles internos y es provisional: antes de automatizar publicaciones en
producción debe tener una prueba de regresión específica o sustituirse por una
estrategia basada en APIs públicas estables.
