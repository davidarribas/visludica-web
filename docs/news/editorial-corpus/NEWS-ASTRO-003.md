# Corpus editorial de validación — NEWS-ASTRO-003

## Alcance y procedencia

Este corpus reproduce exclusivamente los hechos presentes en el encargo de
NEWS-ASTRO-003. El encargo identifica productos y clases de acontecimiento,
pero no aporta URLs, editoriales, distribuidores, BGG IDs, precios, EAN ni
fechas concretas. Esos datos no se han inferido. Las entradas usan una fuente
`editorial_input` sin URL y, cuando falta la fecha de Vis Ludica, no incluyen
`published_at`.

La ausencia no afirma que el dato no exista: indica que no se suministró para
esta validación. Los datos que condicionan la identidad comercial se señalan
como `NEEDS_EDITORIAL_RESEARCH` cuando el enunciado no basta para decidirlos.

## Caso 1 — Quartermaster General: 1914

```yaml
case: quartermaster-general-1914-preorder
input_type: editorial_input
source_count: 1
game: Quartermaster General: 1914 (base_game)
version: Edición comercial comunicada; sin nombre, editorial ni ID suministrados
organizations: []
news: preorder
represented_with_v0: awkward
problems:
  - published_at no representa la apertura de preventa ni una salida posterior.
  - la fecha comercial de lanzamiento no debe repetirse en cada News de la Version.
proposed_change:
  - News.effective_date opcional para el momento de la preventa.
  - Version.release_date opcional para la salida comercial prevista o confirmada.
decision: La preventa es News.event_type=preorder. No se inventan las fechas.
```

## Caso 2 — Zombie Princess

```yaml
case: zombie-princess-preorder
input_type: editorial_input
source_count: 1
game: Zombie Princess (base_game)
version: Edición comercial comunicada; detalles comerciales no suministrados
organizations: []
news: preorder
represented_with_v0: awkward
problems:
  - separa preventa y una fecha posterior de lanzamiento.
  - el incentivo limitado solo aparece como información puntual.
proposed_change:
  - News.effective_date y Version.release_date, por la misma razón que el caso 1.
decision: El incentivo queda en Markdown; no hay evidencia para una entidad o campo de promoción.
```

## Caso 3 — Thunder Road: Vendetta — Extra Ammo

```yaml
case: thunder-road-vendetta-extra-ammo-restock
input_type: editorial_input
source_count: 1
game: Thunder Road: Vendetta (base_game)
version: Thunder Road: Vendetta — Extra Ammo
organizations: []
news: restock
represented_with_v0: yes
problems: []
proposed_change: []
decision: Extra Ammo es una Version por ser la edición comercial nombrada con contenido incluido. La reposición es News.event_type=restock y no crea otra Version.
```

## Caso 4 — Leviathan Wilds

```yaml
case: leviathan-wilds-source-multiple
input_type: editorial_input
source_count: 1
game: Leviathan Wilds, Deepvale y Pack de mutaciones de Leviathan Wilds
version: Una Version por producto comercial comunicado
organizations: []
news:
  - Deepvale: announcement
  - Pack de mutaciones: announcement
  - Leviathan Wilds: restock
represented_with_v0: awkward
problems:
  - una fuente puede describir varios productos y acontecimientos sin ser una noticia agregada.
  - V0 no representa accesorios como producto si se necesita una News propia.
proposed_change:
  - Game.type=accessory para el Pack de mutaciones.
decision: La reposición de Leviathan Wilds se conserva como News pública. Deepvale y el Pack de mutaciones se retiraron del corpus público durante NEWS-ASTRO-004: el enunciado no confirma su identidad comercial ni permite asignar expansion o accessory sin inferirlo. No se añade source_batch_id: sería un vínculo operativo privado.
```

## Caso 5 — BEAST

```yaml
case: beast-products-source-multiple
input_type: editorial_input
source_count: 1
game: BEAST, Shattered Isles, The Great Hunt y complementos de BEAST
version: Una Version por producto comunicado
organizations: []
news: announcement para cada producto identificado
represented_with_v0: awkward
problems:
  - miniaturas, monedas metálicas y tokens acrílicos son productos, no acontecimientos.
  - base_game y expansion no bastan para asignarles una News sin confundir su tipo.
proposed_change:
  - Game.type=accessory.
decision: Shattered Isles y The Great Hunt son expansiones; los tres complementos identificados son accessory. No se añade component_upgrade: el corpus no demuestra una consulta o comportamiento distinto de accessory. Los «otros complementos» sin identidad no se convierten en una entidad inventada.
```

## Caso 6 — TerrorScape

```yaml
case: terrorscape-first-spanish-edition
input_type: editorial_input
source_count: 1
game: TerrorScape (base_game)
version: Primera edición española comunicada
organizations: []
news: announcement
represented_with_v0: yes
problems:
  - el encargo menciona una expansión asociada, sin nombre ni hecho editorial separados.
proposed_change: []
decision: La primera edición española es una Version del Game base. La expansión sería otro Game de tipo expansion y otra Version, nunca un subtipo de Version; no se crea hasta identificarla.
```

## Caso 7 — Revenge of the Seven Dwarfs

```yaml
case: revenge-of-the-seven-dwarfs-announcement
input_type: editorial_input
source_count: 1
game: Revenge of the Seven Dwarfs (base_game)
version: Edición comunicada; datos comerciales no suministrados
organizations: []
news: announcement
represented_with_v0: yes
problems: []
proposed_change: []
decision: La información sobre Essen permanece en el cuerpo editorial contextual. No se crea Event ni Fair.
```

## Caso 8 — Reposición sencilla

```yaml
case: leviathan-wilds-simple-restock
input_type: editorial_input
source_count: 1
game: Leviathan Wilds (base_game)
version: Misma Version existente en el caso 4
organizations: []
news: restock
represented_with_v0: yes
problems: []
proposed_change: []
decision: El subcaso de reposición de Leviathan Wilds satisface el control: misma Version + News.event_type=restock, sin Version nueva. El encargo no proporciona otro producto para una segunda reposición independiente.
```

## Decisiones transversales

- `editorial_input` es suficiente para conservar una fuente aportada directamente, pero exigirle URL era una fricción: se relaja solo para ese tipo.
- No se añaden roles de Organization: el corpus no suministra ninguna organización ni necesita un rol nuevo.
- No se añaden `pvp`, `ean` ni `product_code`: ningún caso los requiere para identificar una Version.
- No se añaden promociones estructuradas, `source_batch_id`, Event/Fair, retailer, platform ni manufacturer.
- Los fixtures técnicos de NEWS-ASTRO-001/002 se retiraron de `src/content/` durante NEWS-ASTRO-004. Sus pruebas viven en `tests/fixtures/` y no generan páginas.

## NEEDS_EDITORIAL_RESEARCH

- Confirmar la identidad comercial, editorial y fechas de todos los casos cuando se disponga de las fuentes originales.
- Confirmar la naturaleza comercial y relación con Leviathan Wilds de Deepvale y del Pack de mutaciones.
- Identificar la expansión asociada a TerrorScape y comprobar si tuvo un acontecimiento editorial independiente.
- Determinar si Extra Ammo es una reedición en sentido editorial, además de una Version comercial con contenido específico.
