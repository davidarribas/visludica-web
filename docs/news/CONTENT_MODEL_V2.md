# Modelo público de noticias V2

> **Estado: FROZEN para el consumidor Astro.** Este documento implementa la
> proyección pública definida en `docs/NEWS_CONTRACT_002_DESIGN.md`. No cambia
> ni reinterpreta `CONTENT_MODEL_V1.md`.

## Coexistencia

Astro distingue dos ramas persistidas:

```text
sin content_model_version → News V1: version + sources
content_model_version: 2  → News V2: products, sin version ni sources
```

Las ramas son estrictas. Una News V2 no puede usar `version` como shorthand ni
incluir `sources`; una News V1 no puede incluir `products`. Los Markdown V1 no
se migran. El adapter V1 convierte su relación singular en un producto solo en
el view model resuelto en memoria.

## Game

V2 conserva los campos V1 y añade facts tipados opcionales:

```yaml
title: Nombre del juego
type: base_game # base_game | expansion | accessory
bgg_id: 1234 # opcional
relations:
  parents: []
  reimplements: []
players:               # opcional
  min: 2
  max: 4               # opcional; ausencia significa mínimo abierto, p. ej. 2+
duration_minutes:      # opcional
  min: 45
  max: 60              # obligatorio si existe el objeto
recommended_age_min: 14 # opcional
credits:               # opcional, pero no vacío
  - name: Nombre oficial
    role: designer     # designer | developer | system_designer
```

`players`, `duration_minutes` y edad usan enteros positivos. Si existe `max`,
debe ser mayor o igual que `min`. Una duración exacta usa el mismo valor en
ambos extremos. No se guardan textos de presentación. Los créditos conservan
el orden editorial y no crean una entidad `Person`.

No hay herencia de facts desde `relations.parents`: una expansión confirma
sus facts o los omite.

## Version

Version mantiene el contrato V1:

```yaml
game: game-id
name: Nombre de la edición
bgg_version_id: 5678 # opcional
languages: [es]
markets: [ES]
organizations:
  - organization: publisher-id
    role: spanish_publisher
release_date:         # opcional
  value: 2026-09-18
  precision: day
cover: /images/versions/example.webp # opcional
```

Los roles son `spanish_publisher`, `distributor` y `original_publisher`.
Jugadores, duración y edad no se duplican ni se sobrescriben en Version. La
editorial española se deriva de Organization mediante `spanish_publisher`.

## News V2

```yaml
content_model_version: 2
title: Título editorial
summary: Resumen editorial
slug: slug-estable
published_at: 2026-09-04T10:00:00+02:00 # opcional
effective_date:                           # opcional
  value: 2026-09-05
  precision: day
event_type: release
products:
  - version: version-a-es
    price_snapshot:                       # opcional y propio de esta Version
      kind: pvpr
      amount_minor: 3999
      currency: EUR
      market: ES
      observed_at: 2026-09-04T10:00:00+02:00
  - version: version-b-es
image: /images/news/example.webp           # opcional
---

Cuerpo editorial Markdown.
```

### Productos

- `products` contiene de uno a n objetos y es obligatorio.
- Su orden es editorial y se conserva en cards, detalle y adapters futuros.
- Una Version no puede aparecer dos veces en la misma News.
- Cada `version` debe existir y resolver un Game existente.
- No existen `primary_product`, `featured_version`, `main_version`, roles ni
  productos relacionados secundarios.
- El primer elemento nunca se interpreta como principal.

### Acontecimientos

V2 admite:

```text
announcement, preorder, release, restock, new_edition, crowdfunding,
delay, cancellation, date_change, content_change
```

`content_change` no tiene subtipos. `reprint` permanece disponible solo en V1;
una reimpresión ordinaria nueva usa `restock`.

### Precio histórico

`PriceSnapshot` contiene:

```text
kind: pvpr | reservation_deposit
amount_minor: entero no negativo
currency: código ISO 4217
market: código de mercado de la Version
observed_at: ISO 8601 con zona
```

El snapshot de `products[]` pertenece solo a esa Version y forma parte de la
News histórica. El renderer nunca consulta un precio mutable de Version.

Una oferta conjunta real puede usar una sola vez:

```yaml
group_price_snapshot:
  kind: reservation_deposit
  amount_minor: 2000
  currency: EUR
  market: ES
  observed_at: 2026-07-16T10:00:00+02:00
```

Este campo requiere al menos dos productos y su mercado debe existir en todas
las Versions. No se reparte ni duplica el importe entre fichas.

## Fechas

Los cuatro conceptos no se sustituyen entre sí:

| Campo | Significado |
| --- | --- |
| `News.published_at` | publicación de Vis Lúdica |
| `News.effective_date` | fecha del acontecimiento, si es distinta y conocida |
| `Version.release_date` | salida o ventana comercial de la edición |
| `PriceSnapshot.observed_at` | instante del valor comercial conservado |

Las fechas parciales usan `day`, `month`, `quarter`, `year` o `unknown`. La
presentación omite una fecha `unknown` sin valor; no fabrica un día.

## Vista resuelta

`resolveNews(...)` proyecta ambas ramas a `ResolvedNews`:

```text
id, slug, title, summary, bodyMarkdown
publishedAt?, effectiveDate?, eventType, image?
productCount, contextGameTitles, groupPriceSnapshot?
products[] en orden:
  position, heading = Game.title
  Game, Version, Organizations
  players?, durationMinutes?, recommendedAgeMin?, credits?
  spanishPublisher?, releaseDate?, priceSnapshot?
```

La vista es calculada y no se persiste. Para multiproducto puede derivar un
Game padre común como contexto, pero eso no convierte ninguna Version en
principal.

## Imagen

La selección es total y determinista:

1. `News.image`, si existe;
2. `Version.cover`, solo si hay exactamente un producto;
3. ausencia de imagen.

Una News multiproducto nunca hereda el cover de `products[0]`.

## Proyección pública

NewsCard usa título, summary, publicación, categoría, imagen resuelta y
contexto/productCount. No enumera todos los SKU.

El detalle conserva título, summary, imagen y cuerpo, seguido de una ficha por
producto en orden editorial. Cada ficha se encabeza con `Game.title`. Los facts
se formatean desde números y enums; los ausentes no crean filas ni valores
`N/D`, `Desconocido` o equivalentes.

SEO conserva `News.title` y `News.summary` como fuentes principales.

## Fuera del contrato público

`Source`, `Evidence`, `Intake`, `IntakeDecision` y `SubjectHint` no pertenecen
a V2, no se resuelven y no se renderizan. Los `sources` V1 se conservan solo
por compatibilidad persistida y tampoco generan HTML público.
