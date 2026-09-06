# Contrato News Core → Astro V2

> **Estado: frontera Astro congelada.** Este documento describe lo que un
> productor V2 futuro deberá escribir. ASTRO-NEWS-006 implementa únicamente el
> consumidor; no implementa `CanonicalNewsBundleV2`, compiler, Draft Store ni
> cambios en News Core.

## Colecciones de destino

El productor futuro escribirá Markdown público en las colecciones existentes:

```text
src/content/games/
src/content/versions/
src/content/organizations/
src/content/news/
```

No creará colecciones Event, Person, Source, Evidence ni Intake. Los IDs siguen
siendo los nombres de fichero relativos, sin extensión, y deben ser kebab-case
seguros de 1 a 120 caracteres. `News.slug` es explícito, único y estable.

## Escritura V2 de News

Toda News nueva del contrato V2 contiene `content_model_version: 2` y
`products` con al menos un elemento:

```yaml
content_model_version: 2
title: Dos productos coiguales llegan juntos
summary: Resumen editorial del acontecimiento.
slug: dos-productos-coiguales
published_at: 2026-09-04T10:00:00+02:00
event_type: release
products:
  - version: product-a-es
    price_snapshot:
      kind: pvpr
      amount_minor: 3999
      currency: EUR
      market: ES
      observed_at: 2026-09-04T10:00:00+02:00
  - version: product-b-es
image: /images/news/joint-release.webp
---

Markdown editorial.
```

Una News V2 no contiene `version`, `sources`, producto principal, role de
producto ni listas de secundarios. `products[]` conserva el orden editorial;
una Version solo aparece una vez.

## Entidades que deben estar resueltas

Antes de escribir News, el productor debe crear o reutilizar:

- cada Version referenciada por `products[]`;
- el Game de cada Version;
- los Games referenciados por `parents` o `reimplements` que sean necesarios;
- cada Organization referenciada por una Version.

Game puede contener `players`, `duration_minutes`, `recommended_age_min` y
`credits` tipados según `CONTENT_MODEL_V2.md`. Version conserva idiomas,
mercados, organizaciones, `release_date`, BGG Version ID y cover. No admite
overrides de facts estables de Game.

## Precio y mercado

Un `price_snapshot` de producto se asocia únicamente a la Version del mismo
objeto. `market` debe figurar en `Version.markets`. El valor queda congelado en
la News y no se reemplaza por un precio actual posterior.

`group_price_snapshot` se usa solo para una oferta conjunta real, requiere dos
o más productos y un mercado compartido por todas las Versions. El productor
no debe copiar el depósito conjunto a cada producto.

## Eventos y compatibilidad

V2 admite `content_change` y no admite `reprint`. La reimpresión ordinaria de
la misma edición se produce como `restock`.

Los 11 documentos V1 existentes permanecen en su rama histórica:

```text
sin content_model_version
version singular
sources conservadas
reprint admitido
```

El productor V2 no los reescribe, no los convierte a `products`, no cambia sus
slugs y no los rehashea como V2. Una conversión futura sería contenido nuevo y
requeriría revisión/aprobación explícita en News Core.

## Resolución que ofrece Astro

Astro valida estructura y relaciones, y después adapta V1/V2 a una única vista
`ResolvedNews`. Los consumidores obtienen todos los productos en orden con su
Game, Version, Organizations, facts y snapshot correspondiente.

La imagen se resuelve así:

```text
News.image → cover de la única Version → ausencia
```

En multiproducto nunca se toma el cover del primer elemento. Las cards no
enumeran los SKU; el detalle genera una ficha por producto encabezada por
`Game.title` y omite facts desconocidos.

## Validación de una entrega futura

Una escritura no se considera aceptable hasta pasar:

```text
npm run content:validate
npm test
npm run build
```

La validación rechaza, entre otros casos:

- `products` vacío o Version duplicada;
- Version, Game u Organization inexistente;
- referencias repetidas;
- rangos de facts inválidos;
- créditos vacíos o roles no admitidos;
- snapshot mal formado o mercado incompatible;
- depósito conjunto con menos de dos productos;
- mezcla de campos V1 y V2;
- slug duplicado.

## Límite público/privado

El contrato público no contiene ni publica URLs de investigación, Evidence,
Intake, decisiones operativas, hashes, aprobaciones, credenciales o logs. News
Core conservará esa trazabilidad en su dominio privado y proyectará solo los
datos públicos confirmados.
