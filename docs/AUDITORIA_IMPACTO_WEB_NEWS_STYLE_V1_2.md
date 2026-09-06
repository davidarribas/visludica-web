# Auditoría técnica de impacto de `WEB_NEWS_STYLE_V1_2`

**Fecha:** 3 de septiembre de 2026  
**Ámbito:** `/Volumes/Dyson/Vibe/visludica` y `/Volumes/Dyson/Vibe/visludica-news-core`  
**Tipo:** auditoría técnica; no implementa cambios  
**Especificación editorial:** `/Volumes/Dyson/Descargas/Trabajo/WEB_NEWS_STYLE_V1_2.md`  
**Estado observado:** Astro News Public Model V1 y `CanonicalNewsBundleV1` implementados; NEWS-CORE-001 y NEWS-CORE-002 completados; captura, resolución, generación, publicación supervisada y Telegram todavía no implementados.

## 1. Resumen ejecutivo

V1 sigue siendo válido para su alcance original: una `News` sobre una sola `Version`, con `Game`, organizaciones, fechas parciales, cuerpo Markdown, fuentes simples, compilación determinista y Drafts inmutables aprobados por hash. La implementación y los 11 documentos públicos existentes son coherentes con ese modelo. Los 16 tests de News Core y el typecheck pasan en el estado auditado.

Hay dos ajustes demostrados que no requieren cambiar contratos:

1. dejar de renderizar automáticamente `News.sources` en la página pública; el dato puede seguir presente en V1, pero hoy `src/pages/noticias/[slug].astro:78-93` lo convierte expresamente en HTML público;
2. hacer que el futuro generador clasifique toda reimpresión ordinaria como `restock`; `reprint` puede permanecer aceptado por V1 como valor legado sin emitirse de nuevo.

Hay cuatro límites reales:

- **Multiproducto:** `News.version` y el bundle de cardinalidad exactamente uno impiden representar estructuradamente una oleada de productos coiguales. Mencionar otros productos en el cuerpo es posible, pero pierde identidad y relaciones; inventar una `Version` contenedora falsearía el modelo.
- **Datos de referencia:** V1 ya contiene idioma, mercado, organizaciones y fecha de lanzamiento de la edición, pero no jugadores, duración, edad, diseñadores ni precio. Los campos nuevos enviados hoy al bundle serían eliminados por el parser Zod y quedarían fuera del hash.
- **Evidencia privada:** `sources[]` solo conserva tipo y URL opcional; no conserva captura, fecha de la fuente, evidencia, hash ni decisión editorial. Además viaja al Markdown público. No puede sustituir a la capa de evidencia de NEWS-CORE-003.
- **Cambios de contenido:** `content_change` existe en la metodología, pero no en los enums implementados de Astro ni News Core. No puede publicarse con semántica correcta bajo V1.

La conclusión temporal es deliberadamente doble:

- **No hace falta crear `CanonicalNewsBundleV2` para iniciar NEWS-CORE-003.** Captura, evidencia, discovery y seguimiento no publicable son estado privado anterior al bundle.
- **Sí hará falta una evolución versionada del bundle antes de generar o publicar de extremo a extremo una News multiproducto coigual, facts estructurados nuevos o `content_change`.** No debe ampliarse silenciosamente el significado de `CanonicalNewsBundleV1`.

La evolución pública puede ser compatible con todos los Markdown existentes si conserva `News.version`, añade solo relaciones/campos opcionales y mantiene el lector V1. Esto no obliga a migrar URLs ni documentos ya publicados. Sin embargo, el transporte canónico debe versionarse porque V1 tiene `schema_version: 1`, `astro_contract_version: 1`, una sola entidad `game/version` y validadores que no reconocen los campos nuevos.

El siguiente ticket de implementación recomendado es un ajuste aislado de Astro para retirar la sección pública automática de fuentes, sin tocar frontmatter, bundles, hashes ni Drafts. Después debe ejecutarse NEWS-CORE-003 como capa privada; la decisión final de multiproducto y facts puede cerrarse con fixtures reales antes de implementar un nuevo contrato.

## 2. Alcance y evidencia inspeccionada

Se inspeccionaron los contratos y documentos indicados en el encargo, además de los consumidores, CLI, migración, tests, fixtures y contenido real relacionado. Referencias principales:

- Astro: `src/content.config.ts`, `src/lib/news.ts`, `src/components/NewsCard.astro`, `src/pages/noticias/index.astro`, `src/pages/noticias/[slug].astro`, `scripts/validate-content-relations.mjs`, `tests/fixtures/news-graph-v1.mjs`, `src/content/{games,versions,news}` y `docs/news/*V1.md`.
- News Core: `src/domain/canonical-bundle.ts`, `src/astro/compiler.ts`, `src/drafts/canonical-json.ts`, `src/drafts/store.ts`, `src/cli/{compile,news}.ts`, `migrations/001_initial.sql`, tests, fixtures y documentación V1.
- Editorial: `WEB_NEWS_STYLE_V1_2.md`, `IMPACTO_TECNICO_WEB_NEWS_STYLE_V1_1.md`, `FUENTES_DE_VERDAD_SISTEMA_NOTICIAS_VIS_LUDICA_CIERRE_2026-09-03.md`, `CONTINUIDAD_METODOLOGIA_WEB_VIS_LUDICA_CIERRE_2026-09-03.md` y `CONTINUIDAD_TECNICA_SISTEMA_NOTICIAS_VIS_LUDICA.md`.

Comprobaciones realizadas sin alterar código:

- `npm test -- --run`: 2 ficheros, 16 tests, todos correctos.
- `npm run typecheck`: correcto.
- Corpus Astro: 12 Games, 11 Versions, 0 Organizations y 11 News.
- Eventos persistidos en Markdown: 7 `announcement`, 2 `preorder`, 2 `restock`; ninguno `reprint` ni `content_change`.
- Fuentes persistidas en Markdown: 11 `editorial_input`, todas sin URL.
- No existe `data/news.sqlite` en el checkout de News Core y `VISLUDICA_NEWS_DB` no estaba definida. Por tanto, no había una base operativa real disponible para auditar; la conclusión sobre datos persistidos se limita al repositorio, el entorno configurado y sus fixtures.
- El `dist` existente confirma que la sección «Fuentes» forma parte del HTML generado, además de estar inequívocamente presente en el renderer.

El repositorio Astro ya contenía cambios y archivos no versionados ajenos a esta auditoría. No se modificó ninguno.

## 3. Mapa de arquitectura actual

### 3.1 Flujo realmente implementado

No existe todavía captura ni resolución automática. El punto de entrada real es un JSON manual con IDs ya resueltos.

```text
JSON manual
    ↓
parseCanonicalNewsBundleV1
    ├───────────────────────────────────────────────┐
    │                                               │
    ↓                                               ↓
CLI compile                                  CLI draft create/update
    ↓                                               ↓
AstroContentCompilerV1                       Draft Store SQLite
    ↓                                               ↓
dry-run o --write                            versiones + SHA-256
    ↓                                               ↓
Markdown Astro                               aprobación del hash actual
    ↓                                               ↓
content:validate + build                     preview → compiler solo dry-run
    ↓
Content Collections
    ↓
resolveNews
    ↓
/noticias y /noticias/[slug]
```

Hay dos diferencias importantes respecto de la cadena conceptual de continuidad:

1. el comando de compilación directa puede escribir Markdown con `--write` sin pasar por Draft Store ni comprobar una aprobación (`../visludica-news-core/src/cli/compile.ts:55-63`);
2. el camino de Draft aprobado no dispone todavía de una operación de publicación: `DraftStore.preview` siempre llama al compiler sin `write` (`../visludica-news-core/src/drafts/store.ts:359-361`; `src/cli/news.ts:122-125`).

Esto no invalida NEWS-CORE-001/002, pero significa que «aprobación → escritura» aún es arquitectura prevista, no un flujo forzado por código.

### 3.2 Dominio y bundle

`CanonicalNewsBundleV1` contiene exactamente:

```text
1 Game
1 Version
0..n Organizations
1 News
```

Las invariantes fuerzan `version.game === game.id` y `news.version === version.id` (`../visludica-news-core/src/domain/canonical-bundle.ts:109-132`). El bundle no puede transportar un segundo Game o Version.

### 3.3 Draft Store y aprobación

El store valida siempre el input como V1, genera JSON canónico, calcula SHA-256 y guarda una fila inmutable en `draft_versions` (`../visludica-news-core/src/drafts/store.ts:214-229`). Una actualización distinta crea una versión nueva y devuelve el Draft a `needs_review` (`:283-300`). Una aprobación solo es válida para el hash de la versión actual (`:303-329`).

SQLite almacena el bundle completo como texto JSON y no descompone Game, Version, News o sources en columnas (`../visludica-news-core/migrations/001_initial.sql:14-36`). Esto facilita conservar bundles V1 históricos, siempre que un lector futuro despache por `schema_version` en vez de intentar parsearlos todos como la versión nueva.

### 3.4 Compiler y Markdown

El compiler serializa organizaciones y exactamente un Game, una Version y una News (`../visludica-news-core/src/astro/compiler.ts:160-185`). Para entidades existentes solo crea o reutiliza; la adición compatible de información opcional produce `UPDATE_CANDIDATE` y bloquea escritura hasta que exista una política explícita (`:236-252`, `:315-324`).

Las fuentes se copian literalmente al frontmatter de News (`:85-96`). El Markdown/Git resultante es archivo público, no almacén privado de investigación.

### 3.5 Astro y renderer

Astro valida una sola referencia `News.version` (`src/content.config.ts:96-121`). `resolveNews` resuelve una cadena singular `News → Version → Game`, las organizaciones de esa Version y una sola imagen heredada (`src/lib/news.ts:27-50`).

La lista usa un único `gameTitle` (`src/lib/news.ts:61-81`; `src/components/NewsCard.astro:25-37`). El detalle muestra un único Game/tipo, organizaciones de una sola Version y todas las sources como lista pública (`src/pages/noticias/[slug].astro:50-93`). No existen páginas públicas de Game, Version u Organization; las noticias solo generan `/noticias` y `/noticias/[slug]`.

## 4. Matriz de impacto

| Requisito | Realidad V1 | Clasificación | Justificación y límite |
| --- | --- | --- | --- |
| News multiproducto | Una News, una referencia `version`; bundle con un Game y una Version | **REQUIERE NUEVA VERSIÓN DE CONTRATO** | V1 puede mencionar productos secundarios solo como prosa. Una agrupación coigual estructurada exige cardinalidad y transporte nuevos. Puede diseñarse de forma compatible con los Markdown antiguos, pero no debe llamarse V1. |
| Reference facts | Idioma, mercado, organizaciones y `release_date` ya estructurados; jugadores, duración, edad, diseñadores y precio ausentes | **EXTENSIÓN COMPATIBLE** | Campos opcionales tipados no invalidan datos públicos existentes. Para cruzar la frontera canónica sí requieren bundle/versionado y compiler nuevos; V1 elimina claves desconocidas. |
| Fuentes/evidencias | `sources[]` se guarda en bundle, hash, frontmatter y HTML; no existe evidencia completa | **CAMBIO DE LÓGICA SIN CAMBIO DE CONTRATO** para dejar de renderizar; **PERTENECE A NEWS-CORE-003 / CAPA FUTURA** para evidencia privada | Ocultar la lista no altera V1. Discovery, capturas, hashes y trazabilidad rica no deben entrar en el contrato público. |
| Seguimiento no publicable | Solo puede guardarse un Draft después de validar una News completa; `discarded` sigue conteniendo bundle/News | **PERTENECE A NEWS-CORE-003 / CAPA FUTURA** | Requiere estado privado anterior a Draft, no un nuevo `event_type` público. |
| `reprint` / `restock` | Ambos aceptados; solo hay `restock` en datos reales | **CAMBIO DE LÓGICA SIN CAMBIO DE CONTRATO** | El futuro generador puede no emitir `reprint`. Deprecarlo o retirarlo puede esperar; no hay migración demostrada. |
| `content_change` | La metodología lo necesita; los dos enums V1 lo rechazan | **EXTENSIÓN COMPATIBLE** | Añadir un valor mantiene válidos los datos existentes, pero lectores V1 no aceptan contenido nuevo. Debe hacerse de forma coordinada y versionada antes del primer caso publicable. |
| Discovery source | No existe concepto de input/capture | **PERTENECE A NEWS-CORE-003 / CAPA FUTURA** | Es procedencia y proceso de investigación, no presentación pública. |
| Granularidad editorial | No hay input ni capture; cada bundle/Draft contiene una News. El llamador podría crear cero o varios Drafts, pero no existe trazabilidad de esa decisión | **PERTENECE A NEWS-CORE-003 / CAPA FUTURA** | Capture/resolution debe permitir `n referencias → 0..n News`; solo la salida agrupada multiproducto alcanza el contrato público. |

## 5. Análisis multiproducto

### 5.1 Respuestas directas

1. **¿V1 impide realmente una News multiproducto?** Impide representarla de forma estructurada y completa. No impide escribir un artículo que mencione varios productos, pero solo uno puede ser el objeto relacionado de la News.
2. **¿Puede representarse sin falsear la semántica existente?** Solo cuando existe de verdad un producto principal y los demás son contexto secundario que no necesita navegación, facts ni reutilización. No en una oleada coigual.
3. **¿Qué rompería convertir `version` en colección?** Esquema Astro, referencias y validador; tipos generados; `resolveNews`; imagen heredada; `gameTitle` de tarjetas; bloque de contexto; compiler/serializer/comparador; invariant del bundle; CLI/listados; tests/fixtures; JSON canónico, hashes y aprobaciones de cualquier Draft migrado.
4. **¿Hay una opción compatible mejor que `versions[]`?** Sí: conservar `version` y añadir una relación opcional ordenada de Versions relacionadas. Es la alternativa de menor migración, condicionada a definir `version` como ancla de presentación de manera explícita en un contrato nuevo.
5. **¿Debe existir siempre Version principal?** No por necesidad editorial. Puede ser útil como decisión de presentación, imagen y etiquetado, pero no debe fingir jerarquía en una oleada coigual.
6. **¿Conviene una relación adicional?** Es la hipótesis provisional con mejor relación coste/compatibilidad. Debe validarse con fixtures de Legión, Crisis Protocol, Hero Packs y Heroes of Tamriel.
7. **¿Hay un concepto actual que ya lo modele?** No. `Game.relations.parents/reimplements` describe relaciones de producto, no pertenencia a una noticia; Organization tampoco; una Version sintética de «oleada» violaría la definición de edición comercial.

### 5.2 Alternativa A — sustituir `version` por `versions[]`

**Modelo**

```yaml
versions:
  - product-a-es
  - product-b-es
```

**Ventajas**

- expresa igualdad entre productos;
- relación simple y directa;
- evita la noción artificial de principal.

**Inconvenientes**

- es incompatible con cada News V1;
- necesita una regla adicional para imagen, título corto, Game de tarjeta y orden;
- obliga a migrar los 11 Markdown existentes a arrays de un elemento si se elimina `version`;
- el bundle debe pasar de una entidad singular a colecciones de Games/Versions.

**Impactos**

- Compiler: alto; cambia serialización, referencias, comparación, orden determinista y creación de varias entidades.
- Astro: alto; cambian schema, resolver, view models, renderer y tests.
- Histórico: alto si se elimina el campo viejo; cambian frontmatters y cualquier Draft convertido.
- Complejidad: media en el modelo final, alta en migración.

### 5.3 Alternativa B — `version` principal + `related_versions[]`

**Modelo**

```yaml
version: product-a-es
related_versions:
  - product-b-es
  - product-c-es
```

**Ventajas**

- todos los documentos V1 siguen siendo válidos sin tocarse;
- mantiene una regla determinista de imagen, tarjeta y etiqueta;
- permite introducir el soporte de manera aditiva;
- conserva el camino simple y barato para la mayoría uniproducto.

**Inconvenientes**

- puede imponer una jerarquía editorial inexistente;
- exige definir orden, duplicados y si la principal puede repetirse;
- un bundle nuevo debe transportar o poder resolver todas las entidades relacionadas;
- un lector V1 ignoraría o eliminaría la relación adicional, por lo que no hay compatibilidad funcional hacia atrás.

**Impactos**

- Compiler: medio; mantiene la News V1 pero añade múltiples entidades y referencias.
- Astro: medio; el resolver y el detalle pasan a resolver una lista, mientras lista/SEO pueden mantener el ancla.
- Histórico: bajo; no requiere migrar News existentes ni cambiar slugs.
- Complejidad: media.

### 5.4 Alternativa C — relación de productos explícita

**Modelo**

```yaml
products:
  - version: product-a-es
    role: featured
  - version: product-b-es
    role: included
```

El modelo puede ser un array de objetos embebidos en News; no requiere necesariamente una nueva colección Astro ni una entidad `Event` global.

**Ventajas**

- representa coigualdad, orden y rol de presentación sin fingir que la oleada es una Version;
- permite asociar facts comerciales o encabezados a cada producto;
- deja abierta una proyección explícita a una tarjeta principal.

**Inconvenientes**

- introduce roles cuya necesidad exacta aún no está congelada;
- si sustituye `version`, hereda la migración de la alternativa A; si convive con ella, duplica relación;
- es la alternativa con mayor superficie de validación y renderer.

**Impactos**

- Compiler: alto.
- Astro: medio/alto.
- Histórico: bajo si se añade manteniendo `version`; alto si lo sustituye.
- Complejidad: alta.

### 5.5 Opción descartada — Game/Version sintética de oleada

Crear «Oleada de septiembre» como Game o Version permitiría pasar V1 sin modificar código, pero falsearía identidad, BGG, relaciones, organizaciones y facts. También impediría relacionar correctamente cada ficha de producto. No es una alternativa aceptable.

### 5.6 Recomendación provisional

Probar primero la alternativa B con cuatro fixtures reales. Es la opción de menor impacto y conserva la ruta uniproducto. Debe descartarse si la selección de una ancla de presentación obliga a mentir sobre la unidad editorial; en ese caso, la alternativa C es preferible a reemplazar directamente el campo por un array desnudo.

No se recomienda decidir el nombre final ni implementar la relación durante NEWS-CORE-003. Sí conviene que la capa de evidencia permita relacionar una captura con varios productos, para no cerrar prematuramente esa decisión.

## 6. Análisis de reference facts

### 6.1 Lo que ya existe

| Dato | Ubicación V1 | Adecuación |
| --- | --- | --- |
| Título, tipo, BGG ID, parents/reimplements | Game | Adecuada para identidad y relaciones de obra/producto. |
| Idiomas, mercados, BGG Version ID | Version | Adecuada para edición comercial. |
| Editorial española, distribuidor, editorial original | `Version.organizations[]` + Organization | Ya normalizado; no debe duplicarse como texto en `reference_facts`. |
| Fecha/ventana de lanzamiento | `Version.release_date` | Ya existe, con precisión parcial. |
| Fecha del acontecimiento | `News.effective_date` | Ya existe. |
| Jugadores, duración, edad | — | Ausentes. |
| Diseñadores/créditos | — | Ausentes. |
| PVPR/precio | — | Ausente. |

### 6.2 Propiedad conceptual

**Game facts relativamente estables**

- rango de jugadores;
- duración o rango de duración;
- edad mínima recomendada;
- créditos de diseño/autoria con rol explícito.

Una expansión ya es un Game V1 propio, por lo que puede tener facts distintos sin heredarlos del juego base. No se recomienda crear una entidad `Person` mientras no exista necesidad de desambiguación, páginas de autor o consultas cruzadas: una lista tipada de nombres y roles es suficiente para el requisito actual.

**Version facts**

- idioma, mercado, editorial/distribución y `release_date`, ya existentes;
- hechos que realmente varíen por edición, como compatibilidad o contenido incluido, solo cuando un caso demuestre la necesidad de consulta estructurada;
- overrides de jugadores/duración/edad únicamente si una edición concreta difiere de la obra/producto y el caso está confirmado. No debe existir duplicación sistemática Game/Version.

**News/event facts**

- `published_at` y `effective_date`, ya existentes;
- apertura/cierre de reservas, cambio de precio, condición promocional o valor anterior/nuevo cuando sean parte del acontecimiento;
- un snapshot comercial que deba permanecer históricamente como se conocía al publicar.

**Commercial facts**

El PVPR no es un escalar estable de Game. Debe incluir al menos importe, moneda, mercado y fecha/instante de vigencia u observación. Guardarlo como `Version.price: 94.99` sin contexto haría que un cambio posterior alterase o contradijese noticias históricas. Hay dos opciones válidas que debe cerrar el diseño:

1. dato comercial temporal relacionado con Version y seleccionado por fecha;
2. snapshot tipado dentro de la relación News-producto cuando el precio publicado sea parte de esa pieza.

La evidencia y fuente del precio permanecen privadas; el valor público no necesita exponer su URL.

### 6.3 Estructura mínima justificada

Sin fijar nombres de contrato, los casos actuales justifican como mínimo:

```text
Game
  players: min/max?
  duration_minutes: min/max?
  recommended_age_min?
  credits[]: name + role   # al menos designer; developer cuando proceda

Version
  # reutilizar languages, markets, organizations, release_date
  version-specific facts? # solo si un caso difiere de Game

Commercial fact o News-product snapshot
  price_kind              # pvpr u otro término confirmado
  amount
  currency
  market?
  observed_at/effective_at
```

Todos los bloques y campos deben ser opcionales; no se necesitan `null`, `N/D` ni objetos vacíos. Los rangos evitan strings de presentación como `"2–4"` y permiten que web y Telegram apliquen su propio formato.

No está justificada una entidad genérica clave/valor `reference_facts`. Una estructura tipada en Game/Version y un objeto comercial temporal cubren la evidencia demostrada, conservan validación y evitan metadatos arbitrarios.

### 6.4 Impacto técnico

- **Canonical bundle:** V1 elimina claves desconocidas; los facts no entrarían en el JSON canónico ni en el hash. Deben formar parte de un schema versionado.
- **Compiler:** hay que serializarlos, compararlos y definir qué ocurre al enriquecer un Game/Version existente. Hoy esa adición debe bloquearse como `UPDATE_CANDIDATE`, no escribirse silenciosamente.
- **Astro:** el schema debe validar rangos y omisiones; el resolver puede obtener facts desde Game/Version; el detalle debe renderizar un bloque por producto con título del producto, omitiendo campos ausentes.
- **Histórico:** campos opcionales mantienen válidos los Markdown existentes. No hace falta una migración masiva; se enriquecen solo entradas con hechos confirmados y política explícita.
- **Telegram:** debe consumir el mismo modelo resuelto/tipado que el renderer web, no volver a extraer datos del cuerpo ni del HTML. La adaptación decide formato y selección, no una segunda fuente de verdad.

## 7. Fuentes y evidencias

### 7.1 Significado y exposición actual de `sources`

En V1, una source es únicamente:

```text
primary | secondary | community → URL obligatoria
editorial_input                 → URL opcional
```

El campo es obligatorio como array, aunque puede estar vacío (`src/content.config.ts:42-53,119`; `../visludica-news-core/src/domain/canonical-bundle.ts:35-44,104`). Forma parte del bundle, del JSON canónico y del hash; el compiler lo serializa en el frontmatter (`../visludica-news-core/src/astro/compiler.ts:85-96`).

Por tanto, hoy es simultáneamente:

- dato editorial/canónico usado para una trazabilidad mínima;
- dato almacenado en el archivo público Markdown/Git;
- dato de presentación pública, porque el renderer crea una sección y enlaces externos (`src/pages/noticias/[slug].astro:78-93`).

El corpus actual no contiene URLs: sus 11 News usan `editorial_input` sin URL. Aun así, ya publica la etiqueta «Información editorial suministrada», y la primera source con URL se expondrá automáticamente.

### 7.2 Riesgo de API pública accidental

No hay actualmente un endpoint JSON de noticias, pero el frontmatter pertenece al modelo público y el renderer lo expone. Cualquier uso futuro de Content Collections, feed o API podría tratar `sources` como campo público por inercia. Además, el Markdown/Git nunca debe recibir snapshots, notas privadas, tokens, datos de acceso o evidencia sensible.

Dejar de renderizar resuelve la política de presentación sin cambiar V1, pero **no convierte el frontmatter en almacenamiento privado**. Es una corrección necesaria, no la solución completa de trazabilidad.

### 7.3 Separación futura aconsejada

| Concepto | Propósito | Ubicación recomendada |
| --- | --- | --- |
| Discovery source | Cómo se detectó el posible hecho | NEWS-CORE-003, privada |
| Evidence source | Fuente capturada que sostiene hechos concretos | NEWS-CORE-003, privada, con snapshot/hash/fechas |
| Public attribution | Atribución o enlace que una decisión editorial quiere mostrar excepcionalmente | Campo público explícito futuro o prosa deliberada; nunca automático |
| `News.sources` V1 | Proveniencia pública/legada mínima del contrato congelado | Conservar para leer histórico; no ampliar ni reutilizar como almacén de evidencia |

La evidencia completa debe conservarse en SQLite y/o un almacén privado de snapshots gestionado por News Core, con metadatos y hashes. No debe copiarse al bundle público. Una futura relación Draft-evidence puede vivir fuera de `canonical_json`; así la aprobación sigue acreditando contenido editorial exacto y la auditoría de investigación mantiene su propio historial.

## 8. Seguimiento no publicable, discovery y granularidad

### 8.1 Limitación actual

`DraftStore.create` y `update` llaman siempre a `parseCanonicalNewsBundleV1` antes de escribir (`../visludica-news-core/src/drafts/store.ts:214-217,283-286`). Incluso un Draft `discarded` nació como News completa y conserva esa News. `editorial_note` es una nota de versión del Draft, no un registro de fuente, producto o evidencia.

En consecuencia, el sistema no puede guardar correctamente un prototipo, foto, demo o avance de producción sin fabricar antes Game, Version, News, título, slug, evento, summary y cuerpo. Hacerlo contaminaría la cola publicable y falsearía el contrato.

### 8.2 Responsabilidad de NEWS-CORE-003

Esta capacidad pertenece a la capa privada de captura/evidencia y no requiere cambiar Astro ni añadir `production_update` al enum público. La unidad mínima debe conservar:

```text
id estable
fuente original y URL normalizada, cuando exista
captured_at y fecha de publicación/observación, cuando se conozca
contenido/snapshot o referencia privada a él
hash de evidencia
productos candidatos o resolución pendiente (0..n)
tipo de relación: discovery / evidence
decisión editorial: unreviewed / follow_up / candidate_news / closed_no_news
nota o razón editorial opcional
```

Los nombres de estados son orientativos; el requisito importante es no usar `Draft.state` para una decisión previa a la existencia de News.

La relación debe admitir:

```text
1 source/evidence → 0..n productos
1 producto        → 0..n evidencias
1..n evidencias   → 0..n candidatos/Drafts futuros
```

Así pueden resolverse los dos flujos demostrados:

```text
varias referencias → decisión editorial → una o varias News
una referencia     → seguimiento        → ninguna News
```

La parte de decisión y resolución puede completarse en NEWS-CORE-004/005; NEWS-CORE-003 debe evitar una cardinalidad que la impida.

### 8.3 Capas afectadas por la granularidad

| Capa | Impacto real |
| --- | --- |
| Capture | Debe aceptar una entrada con varias referencias y conservar una entrada que no llegue a News. No existe hoy. |
| Resolution | Debe resolver cada referencia a 0..n Games/Versions y registrar la decisión de separar, agrupar o no publicar. No existe hoy. |
| Canonical Bundle | No impone que un input produzca una sola News porque no conoce inputs; sí impone una sola Version dentro de cada News/bundle. Solo se afecta cuando la salida editorial es multiproducto. |
| Draft Store | Cada Draft contiene exactamente un bundle/News, pero el llamador puede crear varios Drafts. No hay relación con evidencias ni registro de por qué una entrada produjo cero, uno o varios Drafts. |
| Astro | Solo se afecta si una News publicada relaciona varios productos. Cero o varias News independientes no requieren cambiar Astro. |

## 9. `reprint`, `restock` y `content_change`

### 9.1 `reprint` frente a `restock`

1. **¿Existe `reprint` en V1?** Sí, tanto en Astro (`src/content.config.ts:106-117`) como en Canonical Bundle (`../visludica-news-core/src/domain/canonical-bundle.ts:92-103`).
2. **¿Está utilizado?** No en los 11 Markdown, tests o fixtures. Las únicas apariciones ejecutables están en ambos enums.
3. **¿Hay datos persistidos con ese valor?** No en el contenido público ni fixtures auditados. No había SQLite real disponible en la ruta configurada, por lo que no puede afirmarse nada sobre una base externa no suministrada.
4. **¿Puede el generador dejar de emitirlo sin cambiar contrato?** Sí. Para nueva producción debe mapear una reimpresión ordinaria a `restock` antes de crear el bundle.
5. **¿Conviene deprecarlo?** Sí, en la próxima documentación/versionado de contrato, como valor legado aceptado pero no generado. Puede retirarse solo en una futura versión incompatible y únicamente si una inspección de la DB real confirma ausencia.
6. **¿Hay razón para eliminarlo ahora?** No. Eliminarlo aporta poco, abre compatibilidad innecesaria y no corrige datos existentes.

### 9.2 Cambios de contenido y erratas

`content_change` es semánticamente suficiente para correcciones relevantes, componentes sustituidos o cambios de reglas. No se justifica un evento más específico.

El problema es que **no existe en V1 implementado**. Codificar estos casos como `announcement`, `new_edition` o `restock` falsearía el acontecimiento cuando no hay anuncio general, edición nueva ni simple disponibilidad. La mínima evolución es añadir `content_change` al enum coordinado de dominio y Astro, con tests de compiler y renderer. Los datos antiguos permanecen válidos y no necesitan migración, pero un productor nuevo no debe enviar ese valor a un consumidor V1.

La metodología también enumera `price_change`; no hay un caso ni requisito específico suficiente en este ticket para ordenar su implementación. Conviene resolverlo solo cuando el modelo de commercial facts y un caso publicable definan su semántica.

## 10. Compatibilidad hacia atrás, Draft Store y hashes

### 10.1 Efectos por cambio

| Cambio posible | Canonical JSON / hash | Drafts y aprobaciones | DB/migración | Markdown/Astro | URLs |
| --- | --- | --- | --- | --- | --- |
| No renderizar `sources` | Sin cambio | Sin cambio; aprobaciones válidas | No | Solo cambia HTML tras rebuild | Sin cambio |
| No emitir `reprint` en el futuro | Sin cambio en histórico | Sin cambio | No | Solo nuevos bundles usan `restock` | Sin cambio |
| Captura/evidencia privada | No debe entrar en el bundle | Sin cambio si la relación evidence-Draft queda fuera del contenido aprobado | Sí, migración interna nueva | Ninguno | Ninguno |
| Añadir optional reference facts | Cambia hash de todo bundle que los contenga | Enriquecer un Draft crea versión nueva y exige aprobación nueva | No necesariamente en Draft Store; sí puede requerir tablas privadas comerciales | Existing Markdown sigue válido; entradas enriquecidas cambian | Sin cambio |
| Añadir `content_change` | Solo nuevos bundles | Aprobación normal de su hash | No para Drafts | Schema/compiler coordinados | Sin cambio |
| `version` + relaciones adicionales | Cambia hash solo en News nuevas/actualizadas | Nueva versión y aprobación si se añade a un Draft existente | No necesariamente | Existing Markdown válido; resolver/renderer nuevos | Sin cambio si se conserva slug |
| Sustituir `version` por `versions[]` | Cambia todos los bundles migrados | Ninguna aprobación antigua autoriza el JSON migrado | Posible migración de datos, no de tablas | Migra todos los frontmatters y consumidores | Slugs pueden conservarse, pero el riesgo de regresión es alto |
| Mover URLs de `sources` fuera de News existentes | Cambia bundle/hash si se reescribe | Exige nueva DraftVersion/aprobación | Evidencia privada sí necesita migración | Cambia frontmatter histórico | Sin cambio |

### 10.2 Regla para conservar V1

Los registros históricos deben conservar exactamente `canonical_json`, `content_hash`, `draft_version_id` y aprobación. No se deben recalcular hashes con un serializer nuevo ni «actualizar» filas V1 a V2.

El lector futuro debe hacer:

```text
schema_version 1 → parseCanonicalNewsBundleV1
schema_version N → parser N
```

Hoy `toVersion` intenta parsear todo como V1 (`../visludica-news-core/src/drafts/store.ts:111-125`). Antes de almacenar un segundo schema necesita despacho versionado. La estructura SQL de blob JSON puede alojarlo sin alterar filas; una columna de versión duplicada no es imprescindible porque ya existe `schema_version` dentro del JSON.

Una versión V2 derivada de un Draft V1 es contenido diferente: debe insertarse como nueva DraftVersion, volver a `needs_review` y recibir una aprobación nueva. La aprobación V1 permanece válida como hecho histórico, no como autorización del nuevo contenido.

### 10.3 Orden y determinismo

Los arrays conservan orden editorial en el JSON canónico (`../visludica-news-core/src/drafts/canonical-json.ts:4-20`). Si el orden multiproducto determina presentación, es correcto que alterarlo cambie el hash. El contrato debe definirlo expresamente. Si una colección se declara sin significado de orden, debe normalizarse antes de hashear para evitar versiones espurias.

### 10.4 Superficie de tests de una evolución

Una evolución de contrato debe añadir, sin sustituir la cobertura V1:

- parsing y round-trip separado de bundles V1 y nuevos;
- rechazo de duplicados y referencias inexistentes en relaciones multiproducto;
- orden determinista de entidades, productos y facts;
- serialización/omisión de cada fact opcional y ausencia de placeholders;
- `CREATE`, `REUSE`, `CONFLICT` y enriquecimiento explícito de Game/Version;
- lectura de una DB V1 sin cambiar `canonical_json`, hashes ni aprobaciones;
- nueva aprobación obligatoria al evolucionar un Draft;
- compatibilidad de los 11 Markdown existentes y conservación de sus slugs;
- renderer uniproducto/multiproducto, elección de imagen y una ficha por producto;
- ausencia de fuentes/evidencia interna en el HTML;
- integración compiler → `content:validate` con `content_change` y facts.

## 11. Riesgos concretos

### 11.1 Riesgos actuales

1. **Exposición pública de procedencia.** El renderer publica `sources`, en conflicto directo con `WEB_NEWS_STYLE_V1_2:695-703,1079-1090`. Hoy revela al menos la etiqueta de input editorial; una URL futura se convertirá en enlace público automáticamente.
2. **Trazabilidad insuficiente.** `sources[]` no conserva fecha, captura, contenido, hash, redirects, evidencia por afirmación ni decisión editorial. Perder una página externa dejaría solo su URL.
3. **Escritura que elude aprobación.** `compile --write` acepta un JSON manual validado y escribe sin consultar Draft Store. Es un riesgo de integración si se presenta como ruta de publicación supervisada; actualmente la documentación dice que publicación aún no existe.
4. **Pérdida silenciosa de campos nuevos.** Los `z.object` V1 no son estrictos: una prueba de auditoría confirmó que `related_versions` y `reference_facts` se eliminan al parsear. No entran en hash ni compiler, lo que puede dar una falsa sensación de soporte.

### 11.2 Riesgos de evolución

1. **Jerarquía multiproducto falsa.** Convertir siempre un producto en «principal» puede distorsionar oleadas coiguales.
2. **Duplicación y deriva de facts.** Copiar jugadores, precio o editorial en cada News permite contradicciones; leer siempre el valor actual de Version puede, a la inversa, reescribir el contexto histórico de noticias antiguas.
3. **Readers descoordinados.** Un bundle con `content_change` o relaciones nuevas falla o pierde información en Astro/News Core V1; productor y consumidor deben desplegarse coordinadamente.
4. **Enriquecimiento bloqueado.** El compiler actual no actualiza entidades. Añadir facts confirmados a un Game/Version ya publicado necesita una política explícita y pruebas, no reutilizar `CREATE/REUSE` como si nada cambiara.

### 11.3 Riesgos de migración

1. **Invalidar la evidencia de aprobación.** Reescribir JSON canónico o sustituir el campo `version` cambia hashes; una aprobación antigua no puede trasladarse al contenido transformado.
2. **Reescritura masiva innecesaria.** Migrar los 11 Markdown a arrays sin necesidad aumenta diff y superficie de regresión pese a que una extensión opcional puede conservarlos intactos.
3. **Presentación ambigua.** Una migración multiproducto sin reglas de orden, imagen y etiqueta puede cambiar tarjetas, alt text o contexto aunque conserve el slug.
4. **Inventario incompleto de DB.** No había base operativa disponible; antes de retirar valores o migrar Drafts debe inspeccionarse la ruta real de producción y sus WAL/SHM.

## 12. Propuesta de siguiente secuencia de tickets

### Ticket 1 — ASTRO-NEWS-005: retirar la lista automática de fuentes públicas

- **Objetivo:** alinear inmediatamente el renderer con `WEB_NEWS_STYLE_V1_2` sin cambiar contratos ni datos.
- **Alcance:** detalle de News y test de salida; conservar `sources` en schema/frontmatter; no migrar Markdown.
- **Dependencias:** ninguna.
- **Contratos afectados:** ninguno.
- **Necesidad de migración:** no.
- **Criterio de aceptación:** ninguna News genera `<section class="news-sources">`, enlaces o etiqueta de fuente por defecto; `content:validate` y build pasan; frontmatter, hashes, slugs y corpus no cambian.

### Ticket 2 — NEWS-CORE-003: captura, evidencia privada y triage no publicable

- **Objetivo:** conservar una fuente/evidencia aunque produzca cero News y distinguir discovery de evidencia.
- **Alcance:** URL/entrada editorial normalizada, fechas, captura/snapshot privado, hash, estado editorial, producto(s) candidato(s), deduplicación y seguridad de captura. No redactar ni publicar.
- **Dependencias:** contrato interno de Source/Evidence y política de almacenamiento privado/backup.
- **Contratos afectados:** ninguno público; nuevo contrato interno versionado.
- **Necesidad de migración:** sí, nueva migración SQLite para estado privado; no tocar tablas/filas históricas salvo añadir relaciones explícitas.
- **Criterio de aceptación:** se puede guardar y recuperar una evidencia con `closed_no_news` o `follow_up` sin crear Draft; una fuente puede relacionarse con varios productos candidatos; discovery y evidence no se confunden; no se escribe Astro.

### Ticket 3 — NEWS-CONTRACT-002: fixtures y decisión de evolución pública

- **Objetivo:** decidir la forma mínima de multiproducto y facts antes de crear código V2.
- **Alcance:** cuatro fixtures multiproducto reales, un caso uniproducto, facts por producto, precio temporal, imagen/orden/título y `content_change`; comparar alternativas B/C.
- **Dependencias:** metodología V1.2 y modelo privado de productos/evidencia de NEWS-CORE-003.
- **Contratos afectados:** propuesta de siguiente contrato; V1 permanece congelado.
- **Necesidad de migración:** no en este ticket.
- **Criterio de aceptación:** cada fixture tiene representación no ambigua; se documentan cardinalidades, omisión, orden, compatibilidad y proyección a web/Telegram; decisión explícita sobre ancla principal.

### Ticket 4 — ASTRO-NEWS-006: extensión pública compatible

- **Objetivo:** aceptar y renderizar la forma decidida manteniendo todo el corpus V1.
- **Alcance:** schema Astro, validación relacional, resolver, fichas por producto, `content_change`, tarjetas/imágenes y tests; sin modificar Markdown existente salvo fixtures no públicos.
- **Dependencias:** NEWS-CONTRACT-002.
- **Contratos afectados:** nuevo `CONTENT_MODEL`/contrato Astro versionado.
- **Necesidad de migración:** no para el corpus existente; solo se requerirá enriquecimiento selectivo futuro.
- **Criterio de aceptación:** las 11 News V1 conservan slug y salida; una News fixture multiproducto resuelve todos sus productos; unknown facts se omiten; `content_change` valida; no se renderizan sources internas.

### Ticket 5 — NEWS-CORE-004A: bundle y compiler versionados

- **Objetivo:** transportar y compilar el nuevo contrato sin reinterpretar V1.
- **Alcance:** parser nuevo, arrays/relaciones decididas, facts tipados, `content_change`, serialización determinista, comparación y validación de múltiples entidades; conservar compiler V1.
- **Dependencias:** ASTRO-NEWS-006 y contrato congelado del ticket 3.
- **Contratos afectados:** nuevo Canonical Bundle y compiler correspondiente.
- **Necesidad de migración:** no automática.
- **Criterio de aceptación:** fixtures V1 siguen produciendo exactamente el mismo Markdown/hash; fixtures nuevos compilan contra Astro; campos desconocidos no se pierden silenciosamente; orden y duplicados están probados.

### Ticket 6 — NEWS-CORE-004B: Draft Store multiversión y límite de aprobación

- **Objetivo:** leer bundles V1 y nuevos, preservar hashes/aprobaciones históricas y preparar una publicación que solo acepte el hash aprobado.
- **Alcance:** despacho por `schema_version`, list/show compatibles, preview por compiler correcto y especificación del gate aprobación-escritura.
- **Dependencias:** NEWS-CORE-004A.
- **Contratos afectados:** API interna del Draft Store; no cambia semántica V1.
- **Necesidad de migración:** no para blobs actuales; solo si se añade relación Draft-evidence o metadata operativa.
- **Criterio de aceptación:** una DB V1 se abre sin reescribir filas; sus hashes coinciden byte a byte; un Draft nuevo requiere aprobación propia; ningún hash V1 autoriza un bundle transformado.

### Ticket 7 — NEWS-CORE-004/005: resolución y granularidad editorial

- **Objetivo:** transformar evidencias en cero, uno o varios candidatos, incluyendo una News con varios productos cuando proceda.
- **Alcance:** resolución Game/Version/Organization, deduplicación, agrupación editorial y producción del modelo canónico; sin publicación autónoma.
- **Dependencias:** tickets 2, 3, 5 y 6.
- **Contratos afectados:** capa de resolución y bundle nuevo.
- **Necesidad de migración:** no adicional si NEWS-CORE-003 dejó cardinalidades adecuadas.
- **Criterio de aceptación:** pruebas de `n referencias → 0 News`, `1 → varias News` y `n → 1 News`; cada decisión conserva evidencia; no se fabrican placeholders ni relaciones.

Telegram debe abordarse después y consumir el mismo producto/facts resuelto, sin duplicar investigación ni leer HTML.

## 13. Conclusión obligatoria

### 1. ¿Necesitamos `CanonicalNewsBundleV2` ahora?

**No para iniciar NEWS-CORE-003 ni para corregir la exposición pública de fuentes.** Sí se necesitará un bundle nuevo —V2 o el nombre versionado que se congele— antes de transportar multiproducto estructurado, reference facts nuevos o `content_change`. V1 no debe mutarse silenciosamente.

### 2. ¿Necesitamos cambiar el modelo público Astro V1 ahora?

**No para el corpus actual, `restock`, discovery, seguimiento o evidencia privada.** La retirada de la sección de fuentes es lógica de presentación, no modelo. El modelo público debe evolucionar antes de la primera News multiproducto/ficha estructurada/`content_change`, pero puede hacerlo de forma aditiva sin migrar las News V1 existentes.

### 3. ¿Qué cambios son imprescindibles antes de NEWS-CORE-003?

Como dependencia técnica, **ningún cambio de Canonical Bundle ni Astro**. El ticket de NEWS-CORE-003 sí debe fijar desde el principio que la evidencia es privada, puede terminar sin Draft, distingue discovery/evidence y admite varios productos. Operativamente conviene resolver antes el ticket aislado que deja de renderizar `sources`, porque el sitio actual contradice la política ya congelada.

### 4. ¿Qué cambios pueden esperar hasta NEWS-CORE-003?

La forma definitiva multiproducto, reference facts públicos, `content_change`, deprecación formal de `reprint`, adapter de Telegram, enriquecimiento de Markdown existentes y bundle/compiler nuevos. NEWS-CORE-003 solo debe evitar bloquearlos con cardinalidades demasiado estrechas.

### 5. ¿Qué decisiones de `WEB_NEWS_STYLE_V1_2` no requieren ningún cambio técnico?

- umbral de publicabilidad y decisión de no crear News;
- tono, neutralidad, titular, summary, lead, contexto y tratamiento de incertidumbre;
- prioridad y criterio de parada de investigación;
- no usar la fuente de descubrimiento como acontecimiento;
- omitir datos desconocidos y placeholders;
- mapear nuevas reimpresiones ordinarias a `restock` en la lógica editorial;
- conservar promociones menores en la prosa cuando proceda, sin entidad pública propia;
- utilizar el cuerpo Markdown existente para explicación y antecedentes.

Las decisiones de «no crear News» y discovery sí necesitan NEWS-CORE-003 para conservar seguimiento, pero no cambian el contrato público.

### 6. ¿Cuál debe ser el siguiente ticket de implementación?

**ASTRO-NEWS-005: retirar la lista automática de fuentes públicas conservando intacto `News.sources`.** Es el único conflicto actual visible, tiene alcance mínimo, no requiere migración y no afecta hashes ni aprobaciones. Inmediatamente después debe implementarse **NEWS-CORE-003: captura/evidencia privada y seguimiento sin News**. La evolución de contrato debe comenzar con fixtures y decisión explícita, no con una modificación directa de V1.
