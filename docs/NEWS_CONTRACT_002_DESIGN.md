# NEWS-CONTRACT-002 — Fixtures reales y evolución del contrato editorial público

**Fecha:** 4 de septiembre de 2026  
**Estado:** diseño congelado para implementación posterior  
**Ámbito:** Astro News Public Model V2, `CanonicalNewsBundleV2` y sus lectores futuros  
**No implementa:** schemas, compiler, Draft Store, migraciones, contenido público ni Telegram

Este documento parte del contrato y del código V1 reales, de la metodología
`WEB_NEWS_STYLE_V1_2` y de los casos editoriales que la originaron. Los datos
de catálogo de los fixtures son ejemplos reales; las identidades internas,
slugs, rutas de assets y horas de publicación son valores deterministas de
fixture, no afirmaciones de que esas piezas hayan sido publicadas por Vis
Ludica.

## 1. Resumen ejecutivo

Se elige la **alternativa C: relación explícita y ordenada de productos**, en
su forma mínima, sin roles:

```yaml
content_model_version: 2
products:
  - version: producto-a-es
    price_snapshot:  # opcional; precio histórico de este producto en esta News
      kind: pvpr
      amount_minor: 3999
      currency: EUR
      market: ES
      observed_at: 2026-08-28T10:00:00+02:00
  - version: producto-b-es
```

La lista significa «productos afectados por este acontecimiento editorial».
No significa producto principal más productos secundarios. Su orden es el
orden editorial de presentación, forma parte del contenido y cambia el hash.
`version` identifica la relación mediante un ID de Version ya existente en el
bundle; no se añade un ID de relación ni un `role` porque ningún fixture lo
necesita.

Se descarta **A, `versions[]`**, como forma final porque expresa bien la
coigualdad, pero no deja un lugar natural para el snapshot de precio propio de
cada producto. Obliga a crear mapas paralelos por ID o a evolucionar después
hacia objetos, que es precisamente la forma mínima de C.

Se descarta **B, `version + related_versions[]`**, porque en Legión, Crisis
Protocol, los Hero Packs y Heroes of Tamriel cualquier «principal» sería una
decisión técnica o visual, no una jerarquía del dominio. Mezclar
«principal real», «ancla de presentación» y «compatibilidad V1» en el mismo
campo dejaría una semántica imposible de validar.

La siguiente frontera canónica será `CanonicalNewsBundleV2`:

```text
schema_version: 2
astro_contract_version: 2
1..n Games, indexados por ID
1..n Versions, indexadas por ID
0..n Organizations, indexadas por ID
1 News
1..n relaciones News.products
```

Las colecciones canónicas serán objetos indexados por ID, no arrays. Así el
orden de transporte de entidades no tiene semántica, no produce hashes
espurios y un ID no puede aparecer dos veces en el modelo ya parseado. Solo
`News.products[]` y `Game.credits[]` conservan orden editorial.

Los facts estables viven tipados en `Game`: jugadores, duración, edad y
créditos. Idiomas, mercados, organizaciones, BGG Version ID, portada y fecha
de lanzamiento siguen en `Version`. No se añaden overrides de Version porque
ningún fixture demuestra una edición con jugadores, duración o edad distintos
de su Game. El PVPR no vive como valor mutable de Version: cada News conserva
el `price_snapshot` que comunicó para cada producto. Heroes of Tamriel prueba
además un precio conjunto —un depósito de reserva— y justifica
`News.group_price_snapshot`.

V1 permanece intacto. Las 11 News actuales siguen leyéndose con su parser V1,
su campo singular `version`, sus JSON y sus hashes originales. V2 no acepta
`version` como shorthand: usa siempre `products`, incluso con un único
elemento. Esto evita reinterpretar silenciosamente V1. Una conversión V1 → V2
es contenido nuevo, crea una nueva DraftVersion y exige otra aprobación.

`content_change` entra en el enum V2 sin subtipos. `reprint` no entra en el
enum V2: el parser V1 continúa aceptándolo como legado y la producción nueva
utiliza `restock` para una reimpresión ordinaria de la misma edición.

## 2. Fixtures utilizados

| Fixture | Acontecimiento | Productos | ¿Existe una Version principal real? | Hecho que tensa el modelo |
| --- | --- | ---: | --- | --- |
| King of Tokyo: Godzilla | `release` | 1 | **SÍ — existe jerarquía real del producto**: solo hay un producto | Control del camino normal, facts completos y PVPR |
| Star Wars: Legión, novedades del 28 de agosto | `release` | 5 | **NO — todos los productos son coiguales** | Cinco referencias, precios propios, imagen conjunta |
| Marvel: Crisis Protocol, novedades del 28 de agosto | `release` | 3 | **NO — todos los productos son coiguales** | Otra línea de miniaturas, tres packs y un mismo sistema |
| Marvel Champions: Jessica Jones + Luke Cage | `release` | 2 | **NO — todos los productos son coiguales** | Dos Hero Packs con identidad fuerte; B inventa un protagonista |
| Heroes of Tamriel | `preorder` | 6 | **NO — todos los productos son coiguales** | Unidad por proceso comercial, depósito conjunto y calendario condicionado |
| The Elder Scrolls: erratas de la edición española | `content_change` | 1 | **SÍ — existe jerarquía real del producto**: una edición afectada | Cambio material sin nueva edición, reposición ni anuncio general |

Los casos de catálogo se contrastaron con la noticia de Asmodee España del 28
de agosto de 2026 y sus fichas de producto, la información de IELLO/Devir para
King of Tokyo: Godzilla y las actualizaciones de Ediciones MasQueOca sobre The
Elder Scrolls. Los enlaces de contraste están al final de la sección 9; no
forman parte de los bundles públicos.

## 3. Resultados por fixture

### 3.1 Uniproducto — King of Tokyo: Godzilla

Un array de un elemento no añade una decisión editorial: la única Version es
el producto de la News. Los datos 2–6 jugadores, 30 minutos, 8+, Richard
Garfield, Devir, 49,99 € y fecha de lanzamiento se resuelven sin duplicación:

- jugadores, duración, edad y crédito: `Game`;
- idioma, mercado, organizaciones, portada y lanzamiento: `Version`;
- PVPR que conocía esa pieza: `News.products[0].price_snapshot`;
- fecha de publicación de Vis Ludica: `News.published_at`;
- cuerpo y resumen del acontecimiento: `News`.

A es algo más corta (`versions: [id]`) pero pierde el lugar del precio. B
funciona accidentalmente por cardinalidad uno, aunque conserva una semántica
que falla al pasar a los casos siguientes. C añade únicamente el contenedor
`{ version }`; el caso simple sigue siendo simple.

### 3.2 Star Wars: Legión

La oleada contiene Agents of the Empire, Galactic Bounty Hunters, Jedi
Council, Leaders of the Republic y Rebel AT-RT. Todos son expansiones del
mismo juego de miniaturas, pero ninguno gobierna a los demás. Cada uno tiene
Game y Version propios, título propio, portada propia y PVPR propio. Comparten
organizaciones y fecha.

A expresa la igualdad, pero necesitaría una tabla de precios paralela. B
convertiría arbitrariamente Agents of the Empire —o el primero que devolviera
el filesystem— en principal. C conserva igualdad y permite adjuntar cada
snapshot al producto correspondiente. La página genera cinco fichas con
encabezados derivados de `Game.title`. La imagen de cabecera pertenece a News;
no se toma la portada del primer producto.

### 3.3 Marvel: Crisis Protocol

Hard to Hit Character Pack, Uncanny Telepaths & Telekinetics y Winter Guard
Affiliation Pack comparten lanzamiento, editor original, distribuidor y facts
de juego, pero son tres expansiones independientes. Tampoco existe un Game
principal entre los tres; Marvel: Crisis Protocol es su Game padre, no uno de
los productos de la News.

Este fixture confirma que C no depende de una peculiaridad de Legión. La
relación `parents` ya expresa que cada pack requiere/pertenece al juego base;
no hace falta un `role` en `News.products`. Repetir organizaciones en cada
Version es la relación normalizada existente: el bundle contiene cada
Organization una sola vez y las Versions la referencian.

### 3.4 Packs de LCG — Jessica Jones y Luke Cage

Los dos Hero Packs de Marvel Champions salen dentro de la misma comunicación
y pueden agruparse, pero cada uno tiene identidad comercial, nombre, portada,
Game/Version y ficha propios. Su relación narrativa no crea jerarquía de
producto.

B no puede elegir principal de forma determinista sin convertir el orden de
presentación en una afirmación semántica. Elegir Jessica Jones por orden
alfabético, por posición en la fuente o por portada sería solo un ancla
técnica. Si mañana fueran tres packs, la ficción sería aún más visible. C
genera dos —o tres— fichas recorriendo el mismo array; no cambia de modelo.

### 3.5 Heroes of Tamriel

El caso real agrupa Heroes of Tamriel, Elsweyr, Estivalia, Piel y Colmillo,
Sombras del Olvido y Adventurer's Cache. La unidad de News no es una oleada
homogénea de SKU: es el mismo cierre/proceso de reserva vinculante, una compra
conjunta y un calendario condicionado por recepción de archivos, traducción y
producción.

Ninguna de las seis expansiones es principal. Que «Heroes of Tamriel» dé
nombre coloquial al proceso no convierte su Version en padre comercial de las
demás; el Game padre real es The Elder Scrolls: Betrayal of the Second Era.
El depósito de 20 € se aplica al pack, no seis veces. Por ello vive una sola
vez en `News.group_price_snapshot`, mientras cada producto puede conservar en
el futuro su propio `price_snapshot` si existe un precio individual real.
Las condiciones y la cadena de incertidumbre siguen siendo contenido de News
(`summary` y `body_markdown`); no se crea una entidad Event ni una Version
ficticia para la reserva.

### 3.6 `content_change`

La edición española de The Elder Scrolls comunicó erratas significativas —por
ejemplo, sustituir «Maldito» por «Herido» en tres cartas—, soluciones
imprimibles y un futuro pack de correcciones. La Version afectada no cambia de
identidad y la disponibilidad no es el hecho principal.

`new_edition` afirmaría una edición nueva; `restock` hablaría de
disponibilidad; `announcement` ocultaría qué cambió. `content_change` describe
el acontecimiento con precisión suficiente. El detalle concreto y la forma de
obtener la corrección permanecen en el cuerpo; no se justifican enums
`errata_change`, `component_change` o `rules_change`.

## 4. Comparativa A/B/C

En las filas de calidad, **ALTO** significa mejor satisfacción del criterio.
En las filas de coste o impacto, **ALTO** significa mayor coste.

| Criterio | A. `versions[]` | B. `version + related_versions[]` | C. `products[]` |
| --- | --- | --- | --- |
| Semántica correcta | **MEDIO/ALTO** — expresa coigualdad, pero no la relación enriquecida | **BAJO** — mezcla principal, ancla y legado | **ALTO** — todos son productos afectados y nada más |
| No falsea jerarquía | **ALTO** | **BAJO** — falla en 4/4 fixtures multi | **ALTO** |
| Compatibilidad V1 | **BAJO** si sustituye `version`; **MEDIO** con lectores separados | **ALTO** en forma superficial | **MEDIO/ALTO** — V1 intacto y rama V2 explícita |
| Multiproducto coigual | **ALTO** | **BAJO** | **ALTO** |
| Simplicidad uniproducto | **ALTO** | **ALTO** | **ALTO** — un objeto `{ version }` |
| Facts/precio por producto | **BAJO** sin mapas paralelos | **MEDIO** — exige dos ubicaciones equivalentes | **ALTO** — atributo de la relación |
| Imagen principal determinista | **MEDIO** — necesita regla externa | **ALTO** técnicamente, pero el ancla puede mentir | **ALTO** — explícita en multi; cover solo en mono |
| Orden editorial | **ALTO** si se documenta | **MEDIO** — principal fuera del orden y secundarios dentro | **ALTO** — un único orden |
| SEO y NewsCard | Impacto **ALTO** | Impacto **MEDIO** | Impacto **MEDIO** |
| Resolución de Game | Impacto **ALTO** | Impacto **MEDIO** | Impacto **MEDIO** |
| Organizations | Impacto **MEDIO** | Impacto **MEDIO** | Impacto **MEDIO** |
| Compiler | Impacto **ALTO** | Impacto **MEDIO/ALTO**: el bundle ya debe ser plural | Impacto **ALTO**: plural y relaciones enriquecidas |
| Astro | Impacto **ALTO** | Impacto **MEDIO** | Impacto **MEDIO/ALTO** |
| Draft Store | Impacto **MEDIO** — despacho de schema | Impacto **MEDIO** | Impacto **MEDIO** |
| Hashes nuevos | Impacto **ALTO** si migra V1 | Impacto **BAJO** para histórico | Impacto **BAJO** para histórico; V2 usa hashes propios |
| Telegram | **MEDIO** — debe cruzar precios por ID | **MEDIO** — hereda una principal falsa | **ALTO** — consume productos ya resueltos |
| Migración histórica | **ALTO** si reemplaza `version` | **BAJO** | **BAJO** — ninguna News V1 se reescribe |
| Complejidad final | **MEDIO** | **MEDIO**, con deuda semántica permanente | **MEDIO** y explícita |

La compatibilidad aparente de B no compensa una semántica falsa. A y C tienen
un coste técnico parecido en el bundle y el compiler, porque ambos necesitan
múltiples Games y Versions. C resuelve además el precio por producto sin una
segunda estructura de joins. Se elige C.

## 5. Decisión multiproducto

### 5.1 Cardinalidad y relación

```text
CanonicalNewsBundleV2
  games:          1..n, mapa por ID
  versions:       1..n, mapa por ID
  organizations:  0..n, mapa por ID
  news:           exactamente 1

News.products:    1..n objetos { version, price_snapshot? }
```

Una News no existe sin producto en esta evolución. No se introduce todavía la
noticia puramente corporativa sin producto: ningún fixture de este ticket la
requiere.

### 5.2 Orden e identidad

- `products[]` conserva el orden editorial de fichas y de menciones de canal.
- Cambiar ese orden cambia el JSON canónico y el hash.
- `version` identifica el producto dentro de News; no hay otro ID de relación.
- La misma Version no puede aparecer dos veces en la misma News.
- Los mapas de Games, Versions y Organizations son colecciones sin orden
  editorial. El serializer canónico ordena sus claves; reordenarlas no cambia
  el hash.
- `languages`, `markets`, relaciones de Organization y relaciones entre Games
  se normalizan antes del hash porque son conjuntos: strings por orden
  lexicográfico y relaciones de Organization por `role` + `organization`.
  `credits[]` conserva el orden oficial/editorial y sí participa en el hash.

### 5.3 Principal y roles

No existe `primary_product`, `featured_version`, `anchor_version` ni `role`.
El único producto de una News uniproducto es, naturalmente, su objeto. En una
News multiproducto ninguno es principal salvo que un fixture futuro demuestre
una relación semántica distinta. Una necesidad de maquetación no basta para
añadir esa semántica.

### 5.4 Imagen

La regla es total y no depende del orden del filesystem ni de consultas:

1. si `News.image` existe, se usa;
2. si hay exactamente un producto y no hay `News.image`, se usa
   `Version.cover`;
3. si hay varios productos y no hay `News.image`, no hay imagen principal.

No se hereda la portada de `products[0]` en multiproducto. No se obliga a
inventar un collage: una News sin imagen sigue siendo válida. Legión y Heroes
of Tamriel usan imagen explícita porque sus comunicaciones reales tienen una
unidad visual conjunta.

### 5.5 Validaciones

El futuro parser V2 debe rechazar:

- mapas vacíos de Games o Versions;
- claves JSON duplicadas antes de construir los mapas; V2 no admite la
  semántica «último valor gana» del `JSON.parse` ordinario;
- IDs que no sean kebab-case seguro;
- una Version cuyo `game` no esté incluido en `games`;
- un producto cuya `version` no esté incluida en `versions`;
- Versions duplicadas en `News.products`;
- una Organization referenciada pero ausente del mapa;
- una relación `parents`/`reimplements` a un Game ausente del bundle;
- Games, Versions u Organizations huérfanos no alcanzables desde los
  productos y sus relaciones;
- `max < min`, enteros no positivos o rangos incompletos inválidos;
- precios con importe negativo, moneda/mercado inválidos o timestamp no ISO;
- un snapshot por producto cuyo `market` no figure en los `markets` de su
  Version, o un snapshot conjunto cuyo mercado no figure en todas ellas;
- `group_price_snapshot` con menos de dos productos;
- coexistencia de campos V1 (`version`) y V2 (`products`) en la misma News.

Esta autosuficiencia permite compilar el bundle sin investigar ni consultar
otra fuente. El checkout Astro sigue siendo el target contra el que se decide
`CREATE`, `REUSE`, `CONFLICT` o enriquecimiento; no completa entidades que
falten en el bundle.

## 6. Modelo de facts

### 6.1 Game facts

Se añaden campos tipados y opcionales directamente a Game, no una bolsa
genérica `reference_facts`:

```yaml
players:
  min: 2
  max: 4
duration_minutes:
  min: 45
  max: 60
recommended_age_min: 14
credits:
  - name: Nombre Apellido
    role: designer
```

Reglas:

- exactamente 2 jugadores: `{ min: 2, max: 2 }`;
- 2–4 jugadores: `{ min: 2, max: 4 }`;
- 1–5 jugadores: `{ min: 1, max: 5 }`;
- `2+`, demostrado por Legión y Crisis Protocol: `{ min: 2 }`; la ausencia
  de `max` significa explícitamente «la fuente publica un mínimo abierto», no
  «no investigado»;
- si no hay datos suficientes sobre jugadores se omite `players` completo;
- 30 minutos: `{ min: 30, max: 30 }`;
- 45–60 minutos: `{ min: 45, max: 60 }`;
- 120 minutos: `{ min: 120, max: 120 }`;
- en duración, `min === max` significa un valor único/aproximado publicado;
  no se modelan distribuciones ni tiempos por jugador;
- `recommended_age_min` es entero positivo y no es una clasificación legal;
- `credits[].role` admite en V2 `designer`, `developer` y
  `system_designer`, los roles demostrados por la metodología;
- no se crea `Person`; `name` conserva el crédito oficial como texto;
- no hay herencia implícita de facts desde `parents`: una expansión puede
  confirmar facts propios o dejarlos ausentes.

### 6.2 Version facts

Se conservan sin duplicación los campos V1:

```text
game
name
bgg_version_id?
languages[]
markets[]
organizations[]
release_date?
cover?
```

No se añaden `spanish_publisher`, jugadores, duración ni edad como copias. La
editorial española se obtiene resolviendo la relación de Organization con
`role: spanish_publisher`; distribución y editorial original usan sus roles
actuales. Los roles existentes bastan para los seis fixtures. Si una Version
no tiene editorial española confirmada, la ficha omite el campo.

No se permiten overrides de jugadores/duración/edad en V2. Antes de añadirlos
deberá existir un caso real donde una edición comercial difiera del Game y esa
diferencia importe editorialmente.

### 6.3 News y facts del acontecimiento

News conserva título, summary, slug, cuerpo, `published_at`,
`effective_date`, `event_type` e imagen. No se crea una entidad Event. La
cadena condicionada de Heroes of Tamriel pertenece a `summary` y
`body_markdown`; convertir cada hito narrativo en campo no aporta reutilización
demostrada.

Las fechas mantienen significados distintos:

| Campo | Significado | Uso público |
| --- | --- | --- |
| `News.published_at` | instante de publicación de Vis Ludica | cronología, cabecera y card |
| `News.effective_date` | fecha del acontecimiento descrito cuando es distinta y conocida | callout del acontecimiento; nunca sustituye a publicación |
| `Version.release_date` | salida/ventana comercial de esa edición | ficha del producto |
| `PriceSnapshot.observed_at` | instante del valor comercial conservado | contexto histórico del precio |

En `release`, la ficha muestra `Version.release_date`; no se duplica en
`News.effective_date` si ambas fechas significan lo mismo. En una apertura o
cierre de reservas, `effective_date` se usa solo cuando la fecha exacta del
acontecimiento está confirmada. Nunca se usa `published_at` como sustituto de
una fecha comercial desconocida.

### 6.4 Commercial facts

El único fact comercial nuevo es `PriceSnapshot`, ubicado en la relación
News-producto o, para una oferta conjunta real, en News:

```yaml
kind: pvpr | reservation_deposit
amount_minor: 4999
currency: EUR
market: ES
observed_at: 2026-08-24T10:00:00+02:00
```

`amount_minor` es un entero de unidades mínimas de la moneda; 4999 EUR son
49,99 €. Evita floats y strings de presentación. `currency` usa ISO 4217 y
`market` el mismo código de mercado que Version. Los dos únicos `kind`
justificados son `pvpr` y `reservation_deposit`. No se añaden precio de
tienda, descuento, envío, tramo ni historial genérico.

`products[].price_snapshot` se aplica solo a esa Version.
`News.group_price_snapshot` se aplica una vez a la oferta conjunta de todas
las Versions de la News; Heroes of Tamriel demuestra esta segunda
cardinalidad. El precio final estimado de 180–200 € es provisional y permanece
en la narración, no se convierte en importe exacto.

Los datos específicos ya modelados se derivan: la necesidad de juego base se
obtiene de `Game.relations.parents`; el idioma, de Version; la editorial, de
Organization. Contenido incluido o compatibilidades excepcionales permanecen
en el cuerpo hasta que más de un caso demuestre necesidad estructurada.

## 7. Precio e historicidad

### 7.1 Alternativas

| Modelo | Precisión histórica | Coste | Resultado |
| --- | --- | --- | --- |
| A. Consultar siempre el precio actual de Version | **BAJA** — reescribe el contexto de la hemeroteca | **BAJO** | Rechazado |
| B. Snapshot tipado en la relación News-producto | **ALTA** para lo que afirmó la pieza | **BAJO/MEDIO** | Elegido |
| C. Historial temporal completo de commercial facts | **ALTA** y permite consultas por fecha | **ALTO** | No justificado todavía |

### 7.2 Decisión

Una News antigua muestra el precio que conocía y decidió publicar, no el
precio actual. Ese valor queda en su `price_snapshot` y forma parte de su hash.
Si el PVPR cambia, una News nueva puede conservar otro snapshot; la anterior
no cambia. Un catálogo futuro puede mantener precio actual o historial fuera
de este contrato, pero el renderer de hemeroteca no lo usa para reescribir
noticias.

No todas las News deben incluir precio. Si el valor no está confirmado o no
es editorialmente pertinente, `price_snapshot` se omite. La fuente y evidencia
que sostienen el valor siguen en NEWS-CORE-003, fuera del bundle público.

## 8. Modelo canónico propuesto

La forma conceptual completa que deben implementar los tickets posteriores
es la siguiente. Los campos con `?` se omiten cuando no existen; no usan
`null`, `N/D` ni objetos vacíos de relleno.

```ts
type Id = string; // kebab-case, 1..120

interface PartialDate {
  value?: string;
  precision: "day" | "month" | "quarter" | "year" | "unknown";
}

interface Players {
  min: number; // entero positivo
  max?: number; // >= min; ausencia = mínimo abierto ("2+")
}

interface DurationMinutes {
  min: number; // entero positivo
  max: number; // >= min; igualdad = valor único/aproximado publicado
}

interface Credit {
  name: string;
  role: "designer" | "developer" | "system_designer";
}

interface GameV2 {
  title: string;
  bgg_id?: number;
  type: "base_game" | "expansion" | "accessory";
  relations: { parents: Id[]; reimplements: Id[] };
  players?: Players;
  duration_minutes?: DurationMinutes;
  recommended_age_min?: number;
  credits?: Credit[];
}

interface VersionOrganizationV2 {
  organization: Id;
  role: "spanish_publisher" | "distributor" | "original_publisher";
}

interface VersionV2 {
  game: Id;
  name: string;
  bgg_version_id?: number;
  languages: string[];
  markets: string[];
  organizations: VersionOrganizationV2[];
  release_date?: PartialDate;
  cover?: string;
}

interface OrganizationV2 {
  name: string;
}

interface PriceSnapshotV2 {
  kind: "pvpr" | "reservation_deposit";
  amount_minor: number;
  currency: string; // ISO 4217
  market: string;
  observed_at: string; // ISO 8601 con zona
}

interface NewsProductV2 {
  version: Id;
  price_snapshot?: PriceSnapshotV2;
}

interface NewsV2 {
  id: Id;
  slug: string;
  title: string;
  summary: string;
  published_at?: string;
  effective_date?: PartialDate;
  event_type:
    | "announcement"
    | "preorder"
    | "release"
    | "restock"
    | "new_edition"
    | "crowdfunding"
    | "delay"
    | "cancellation"
    | "date_change"
    | "content_change";
  products: NewsProductV2[]; // 1..n, orden editorial
  group_price_snapshot?: PriceSnapshotV2;
  image?: string;
  body_markdown: string;
}

interface CanonicalNewsBundleV2 {
  schema_version: 2;
  astro_contract_version: 2;
  games: Record<Id, GameV2>;
  organizations: Record<Id, OrganizationV2>;
  versions: Record<Id, VersionV2>;
  news: NewsV2;
}
```

`schema_version` selecciona parser, serializer, hash y compiler en News Core.
`astro_contract_version` declara la forma de salida Astro y V2 exige el valor
2; no se admite `schema_version: 2` con contrato Astro 1.

La rama Astro nueva llevará `content_model_version: 2` en el frontmatter de
News. Su ausencia mantiene la rama V1. El campo singular V1 `version` no es un
alias de `products[0]`, y una News V2 no contiene `sources`: V2 transporta
contenido editorial público, no Evidence/Intake ni la proveniencia legada.
Una atribución pública futura requerirá un concepto explícito distinto; ningún
fixture de este ticket lo necesita.

## 9. Ejemplos JSON

Estos cuatro documentos son fixtures completos de diseño. No deben pasarse al
parser V1 ni publicarse en `src/content`; están preparados para convertirse en
fixtures de tests cuando exista el parser V2.

### 9.1 Uniproducto

```json
{
  "schema_version": 2,
  "astro_contract_version": 2,
  "games": {
    "king-of-tokyo-godzilla": {
      "title": "King of Tokyo: Godzilla",
      "bgg_id": 463297,
      "type": "base_game",
      "relations": {
        "parents": [],
        "reimplements": []
      },
      "players": {
        "min": 2,
        "max": 6
      },
      "duration_minutes": {
        "min": 30,
        "max": 30
      },
      "recommended_age_min": 8,
      "credits": [
        {
          "name": "Richard Garfield",
          "role": "designer"
        }
      ]
    }
  },
  "organizations": {
    "devir": {
      "name": "Devir"
    },
    "iello": {
      "name": "IELLO"
    }
  },
  "versions": {
    "king-of-tokyo-godzilla-es": {
      "game": "king-of-tokyo-godzilla",
      "name": "King of Tokyo: Godzilla — edición española",
      "languages": [
        "es"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "devir",
          "role": "spanish_publisher"
        },
        {
          "organization": "iello",
          "role": "original_publisher"
        }
      ],
      "release_date": {
        "value": "2026-08-24",
        "precision": "day"
      },
      "cover": "/images/versions/king-of-tokyo-godzilla-es.webp"
    }
  },
  "news": {
    "id": "king-of-tokyo-godzilla-release",
    "slug": "king-of-tokyo-godzilla-se-publica-en-espanol",
    "title": "King of Tokyo: Godzilla se publica en español",
    "summary": "La edición de Devir reúne a seis kaijus de Toho en una versión independiente del juego de Richard Garfield.",
    "published_at": "2026-08-24T10:00:00+02:00",
    "event_type": "release",
    "products": [
      {
        "version": "king-of-tokyo-godzilla-es",
        "price_snapshot": {
          "kind": "pvpr",
          "amount_minor": 4999,
          "currency": "EUR",
          "market": "ES",
          "observed_at": "2026-08-24T10:00:00+02:00"
        }
      }
    ],
    "body_markdown": "King of Tokyo: Godzilla ya cuenta con edición española publicada por Devir. La caja es independiente y conserva la base de dados y cartas de King of Tokyo, con seis monstruos de Toho y cartas de evolución."
  }
}
```

Este fixture produce exactamente una ficha encabezada por «King of Tokyo:
Godzilla». No necesita `News.image`: al existir un solo producto, el resolver
hereda la portada de la Version.

### 9.2 Multiproducto — Star Wars: Legión

```json
{
  "schema_version": 2,
  "astro_contract_version": 2,
  "games": {
    "star-wars-legion": {
      "title": "Star Wars: Legión",
      "type": "base_game",
      "relations": {
        "parents": [],
        "reimplements": []
      }
    },
    "star-wars-legion-agents-of-the-empire": {
      "title": "Star Wars: Legión — Agents of the Empire",
      "type": "expansion",
      "relations": {
        "parents": [
          "star-wars-legion"
        ],
        "reimplements": []
      },
      "players": {
        "min": 2
      },
      "duration_minutes": {
        "min": 60,
        "max": 120
      },
      "recommended_age_min": 14
    },
    "star-wars-legion-galactic-bounty-hunters": {
      "title": "Star Wars: Legión — Galactic Bounty Hunters",
      "type": "expansion",
      "relations": {
        "parents": [
          "star-wars-legion"
        ],
        "reimplements": []
      },
      "players": {
        "min": 2
      },
      "duration_minutes": {
        "min": 60,
        "max": 120
      },
      "recommended_age_min": 14
    },
    "star-wars-legion-jedi-council": {
      "title": "Star Wars: Legión — Jedi Council",
      "type": "expansion",
      "relations": {
        "parents": [
          "star-wars-legion"
        ],
        "reimplements": []
      },
      "players": {
        "min": 2
      },
      "duration_minutes": {
        "min": 60,
        "max": 120
      },
      "recommended_age_min": 14
    },
    "star-wars-legion-leaders-of-the-republic": {
      "title": "Star Wars: Legión — Leaders of the Republic",
      "type": "expansion",
      "relations": {
        "parents": [
          "star-wars-legion"
        ],
        "reimplements": []
      },
      "players": {
        "min": 2
      },
      "duration_minutes": {
        "min": 60,
        "max": 120
      },
      "recommended_age_min": 14
    },
    "star-wars-legion-rebel-at-rt": {
      "title": "Star Wars: Legión — Rebel AT-RT",
      "type": "expansion",
      "relations": {
        "parents": [
          "star-wars-legion"
        ],
        "reimplements": []
      },
      "players": {
        "min": 2
      },
      "duration_minutes": {
        "min": 60,
        "max": 120
      },
      "recommended_age_min": 14
    }
  },
  "organizations": {
    "asmodee-espana": {
      "name": "Asmodee España"
    },
    "atomic-mass-games": {
      "name": "Atomic Mass Games"
    }
  },
  "versions": {
    "star-wars-legion-agents-of-the-empire-es": {
      "game": "star-wars-legion-agents-of-the-empire",
      "name": "SW Legión: Agents of the Empire",
      "languages": [
        "de",
        "en",
        "es",
        "fr"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "asmodee-espana",
          "role": "distributor"
        },
        {
          "organization": "atomic-mass-games",
          "role": "original_publisher"
        }
      ],
      "release_date": {
        "value": "2026-08-28",
        "precision": "day"
      },
      "cover": "/images/versions/sw-legion-agents-of-the-empire.webp"
    },
    "star-wars-legion-galactic-bounty-hunters-es": {
      "game": "star-wars-legion-galactic-bounty-hunters",
      "name": "SW Legión: Galactic Bounty Hunters",
      "languages": [
        "de",
        "en",
        "es",
        "fr"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "asmodee-espana",
          "role": "distributor"
        },
        {
          "organization": "atomic-mass-games",
          "role": "original_publisher"
        }
      ],
      "release_date": {
        "value": "2026-08-28",
        "precision": "day"
      },
      "cover": "/images/versions/sw-legion-galactic-bounty-hunters.webp"
    },
    "star-wars-legion-jedi-council-es": {
      "game": "star-wars-legion-jedi-council",
      "name": "SW Legión: Jedi Council",
      "languages": [
        "de",
        "en",
        "es",
        "fr"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "asmodee-espana",
          "role": "distributor"
        },
        {
          "organization": "atomic-mass-games",
          "role": "original_publisher"
        }
      ],
      "release_date": {
        "value": "2026-08-28",
        "precision": "day"
      },
      "cover": "/images/versions/sw-legion-jedi-council.webp"
    },
    "star-wars-legion-leaders-of-the-republic-es": {
      "game": "star-wars-legion-leaders-of-the-republic",
      "name": "SW Legión: Leaders of the Republic",
      "languages": [
        "de",
        "en",
        "es",
        "fr"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "asmodee-espana",
          "role": "distributor"
        },
        {
          "organization": "atomic-mass-games",
          "role": "original_publisher"
        }
      ],
      "release_date": {
        "value": "2026-08-28",
        "precision": "day"
      },
      "cover": "/images/versions/sw-legion-leaders-of-the-republic.webp"
    },
    "star-wars-legion-rebel-at-rt-es": {
      "game": "star-wars-legion-rebel-at-rt",
      "name": "SW Legión: Rebel AT-RT",
      "languages": [
        "de",
        "en",
        "es",
        "fr"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "asmodee-espana",
          "role": "distributor"
        },
        {
          "organization": "atomic-mass-games",
          "role": "original_publisher"
        }
      ],
      "release_date": {
        "value": "2026-08-28",
        "precision": "day"
      },
      "cover": "/images/versions/sw-legion-rebel-at-rt.webp"
    }
  },
  "news": {
    "id": "star-wars-legion-wave-2026-08-28",
    "slug": "cinco-expansiones-star-wars-legion-agosto-2026",
    "title": "Cinco expansiones de Star Wars: Legión llegan en la misma oleada",
    "summary": "Agents of the Empire, Galactic Bounty Hunters, Jedi Council, Leaders of the Republic y Rebel AT-RT forman la oleada distribuida en España a finales de agosto.",
    "published_at": "2026-08-28T10:00:00+02:00",
    "event_type": "release",
    "products": [
      {
        "version": "star-wars-legion-agents-of-the-empire-es",
        "price_snapshot": {
          "kind": "pvpr",
          "amount_minor": 3999,
          "currency": "EUR",
          "market": "ES",
          "observed_at": "2026-08-28T10:00:00+02:00"
        }
      },
      {
        "version": "star-wars-legion-galactic-bounty-hunters-es",
        "price_snapshot": {
          "kind": "pvpr",
          "amount_minor": 4199,
          "currency": "EUR",
          "market": "ES",
          "observed_at": "2026-08-28T10:00:00+02:00"
        }
      },
      {
        "version": "star-wars-legion-jedi-council-es",
        "price_snapshot": {
          "kind": "pvpr",
          "amount_minor": 4999,
          "currency": "EUR",
          "market": "ES",
          "observed_at": "2026-08-28T10:00:00+02:00"
        }
      },
      {
        "version": "star-wars-legion-leaders-of-the-republic-es",
        "price_snapshot": {
          "kind": "pvpr",
          "amount_minor": 2999,
          "currency": "EUR",
          "market": "ES",
          "observed_at": "2026-08-28T10:00:00+02:00"
        }
      },
      {
        "version": "star-wars-legion-rebel-at-rt-es",
        "price_snapshot": {
          "kind": "pvpr",
          "amount_minor": 2499,
          "currency": "EUR",
          "market": "ES",
          "observed_at": "2026-08-28T10:00:00+02:00"
        }
      }
    ],
    "image": "/images/news/star-wars-legion-wave-2026-08-28.webp",
    "body_markdown": "La oleada reúne cinco cajas para distintas facciones de Star Wars: Legión. Cada referencia mantiene su identidad y su contenido; la agrupación responde al lanzamiento conjunto, no a una jerarquía entre productos."
  }
}
```

El objeto `star-wars-legion` se incluye porque es padre de los cinco Games,
pero no aparece en `News.products`: no es una sexta referencia lanzada en la
oleada.

### 9.3 Multiproducto — Heroes of Tamriel

```json
{
  "schema_version": 2,
  "astro_contract_version": 2,
  "games": {
    "tes-betrayal-second-era": {
      "title": "The Elder Scrolls: La traición de la Segunda Era",
      "type": "base_game",
      "relations": {
        "parents": [],
        "reimplements": []
      }
    },
    "tes-adventurers-cache": {
      "title": "The Elder Scrolls: Adventurer's Cache",
      "type": "accessory",
      "relations": {
        "parents": [
          "tes-betrayal-second-era"
        ],
        "reimplements": []
      }
    },
    "tes-elsweyr": {
      "title": "The Elder Scrolls: Elsweyr",
      "type": "expansion",
      "relations": {
        "parents": [
          "tes-betrayal-second-era"
        ],
        "reimplements": []
      }
    },
    "tes-estivalia": {
      "title": "The Elder Scrolls: Estivalia",
      "type": "expansion",
      "relations": {
        "parents": [
          "tes-betrayal-second-era"
        ],
        "reimplements": []
      }
    },
    "tes-heroes-de-tamriel": {
      "title": "The Elder Scrolls: Héroes de Tamriel",
      "bgg_id": 456402,
      "type": "expansion",
      "relations": {
        "parents": [
          "tes-betrayal-second-era"
        ],
        "reimplements": []
      },
      "players": {
        "min": 1,
        "max": 4
      },
      "duration_minutes": {
        "min": 120,
        "max": 240
      },
      "recommended_age_min": 14
    },
    "tes-piel-y-colmillo": {
      "title": "The Elder Scrolls: Piel y Colmillo",
      "type": "expansion",
      "relations": {
        "parents": [
          "tes-betrayal-second-era"
        ],
        "reimplements": []
      }
    },
    "tes-sombras-del-olvido": {
      "title": "The Elder Scrolls: Sombras del Olvido",
      "type": "expansion",
      "relations": {
        "parents": [
          "tes-betrayal-second-era"
        ],
        "reimplements": []
      }
    }
  },
  "organizations": {
    "chip-theory-games": {
      "name": "Chip Theory Games"
    },
    "ediciones-masqueoca": {
      "name": "Ediciones MasQueOca"
    }
  },
  "versions": {
    "tes-adventurers-cache-es": {
      "game": "tes-adventurers-cache",
      "name": "The Elder Scrolls: Adventurer's Cache — edición española",
      "languages": [
        "es"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "chip-theory-games",
          "role": "original_publisher"
        },
        {
          "organization": "ediciones-masqueoca",
          "role": "spanish_publisher"
        }
      ],
      "release_date": {
        "value": "2027-Q1",
        "precision": "quarter"
      }
    },
    "tes-elsweyr-es": {
      "game": "tes-elsweyr",
      "name": "The Elder Scrolls: Elsweyr — edición española",
      "languages": [
        "es"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "chip-theory-games",
          "role": "original_publisher"
        },
        {
          "organization": "ediciones-masqueoca",
          "role": "spanish_publisher"
        }
      ],
      "release_date": {
        "value": "2027-Q1",
        "precision": "quarter"
      }
    },
    "tes-estivalia-es": {
      "game": "tes-estivalia",
      "name": "The Elder Scrolls: Estivalia — edición española",
      "languages": [
        "es"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "chip-theory-games",
          "role": "original_publisher"
        },
        {
          "organization": "ediciones-masqueoca",
          "role": "spanish_publisher"
        }
      ],
      "release_date": {
        "value": "2027-Q1",
        "precision": "quarter"
      }
    },
    "tes-heroes-de-tamriel-es": {
      "game": "tes-heroes-de-tamriel",
      "name": "The Elder Scrolls: Héroes de Tamriel — edición española",
      "languages": [
        "es"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "chip-theory-games",
          "role": "original_publisher"
        },
        {
          "organization": "ediciones-masqueoca",
          "role": "spanish_publisher"
        }
      ],
      "release_date": {
        "value": "2027-Q1",
        "precision": "quarter"
      },
      "cover": "/images/versions/tes-heroes-de-tamriel-es.webp"
    },
    "tes-piel-y-colmillo-es": {
      "game": "tes-piel-y-colmillo",
      "name": "The Elder Scrolls: Piel y Colmillo — edición española",
      "languages": [
        "es"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "chip-theory-games",
          "role": "original_publisher"
        },
        {
          "organization": "ediciones-masqueoca",
          "role": "spanish_publisher"
        }
      ],
      "release_date": {
        "value": "2027-Q1",
        "precision": "quarter"
      }
    },
    "tes-sombras-del-olvido-es": {
      "game": "tes-sombras-del-olvido",
      "name": "The Elder Scrolls: Sombras del Olvido — edición española",
      "languages": [
        "es"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "chip-theory-games",
          "role": "original_publisher"
        },
        {
          "organization": "ediciones-masqueoca",
          "role": "spanish_publisher"
        }
      ],
      "release_date": {
        "value": "2027-Q1",
        "precision": "quarter"
      }
    }
  },
  "news": {
    "id": "tes-heroes-tamriel-reservation-process",
    "slug": "heroes-tamriel-cierra-reservas-y-prepara-compras",
    "title": "Los productos de Héroes de Tamriel cierran reservas antes de abrir su compra",
    "summary": "El proceso conjunto afecta a seis productos en español: el depósito de 20 € se descuenta de la compra posterior, cuyos plazos dependen de los archivos y de la producción.",
    "published_at": "2026-07-16T10:00:00+02:00",
    "event_type": "preorder",
    "products": [
      {
        "version": "tes-heroes-de-tamriel-es"
      },
      {
        "version": "tes-elsweyr-es"
      },
      {
        "version": "tes-estivalia-es"
      },
      {
        "version": "tes-piel-y-colmillo-es"
      },
      {
        "version": "tes-sombras-del-olvido-es"
      },
      {
        "version": "tes-adventurers-cache-es"
      }
    ],
    "group_price_snapshot": {
      "kind": "reservation_deposit",
      "amount_minor": 2000,
      "currency": "EUR",
      "market": "ES",
      "observed_at": "2026-07-16T10:00:00+02:00"
    },
    "image": "/images/news/tes-heroes-tamriel-reservations.webp",
    "body_markdown": "La reserva vinculante da acceso prioritario a la compra posterior y su depósito se descuenta del total. Los productos dependientes del idioma se venderán juntos. La apertura del proceso de compra estaba prevista para la primera quincena de agosto, mientras que el trabajo en los archivos se planteaba desde septiembre si el material llegaba a tiempo; la edición española se situaba de forma condicionada en 2027."
  }
}
```

`group_price_snapshot` evita afirmar que cada expansión cuesta 20 €. El
calendario condicionado no se reduce a una fecha falsa: la ventana comercial
confirmada vive en Version y las dependencias se conservan en la narración.

### 9.4 `content_change`

```json
{
  "schema_version": 2,
  "astro_contract_version": 2,
  "games": {
    "tes-betrayal-second-era": {
      "title": "The Elder Scrolls: La traición de la Segunda Era",
      "type": "base_game",
      "relations": {
        "parents": [],
        "reimplements": []
      },
      "players": {
        "min": 1,
        "max": 4
      },
      "duration_minutes": {
        "min": 120,
        "max": 240
      },
      "recommended_age_min": 14
    }
  },
  "organizations": {
    "chip-theory-games": {
      "name": "Chip Theory Games"
    },
    "ediciones-masqueoca": {
      "name": "Ediciones MasQueOca"
    }
  },
  "versions": {
    "tes-betrayal-second-era-es-first": {
      "game": "tes-betrayal-second-era",
      "name": "The Elder Scrolls: La traición de la Segunda Era — primera edición española",
      "languages": [
        "es"
      ],
      "markets": [
        "ES"
      ],
      "organizations": [
        {
          "organization": "chip-theory-games",
          "role": "original_publisher"
        },
        {
          "organization": "ediciones-masqueoca",
          "role": "spanish_publisher"
        }
      ],
      "cover": "/images/versions/tes-betrayal-second-era-es-first.webp"
    }
  },
  "news": {
    "id": "tes-spanish-first-edition-errata-corrections",
    "slug": "elder-scrolls-edicion-espanola-correcciones-erratas",
    "title": "La edición española de The Elder Scrolls detalla sus primeras correcciones",
    "summary": "Ediciones MasQueOca ha reunido erratas significativas de cartas y prepara material imprimible y un pack de correcciones para propietarios de la primera edición.",
    "published_at": "2026-04-22T10:00:00+02:00",
    "event_type": "content_change",
    "products": [
      {
        "version": "tes-betrayal-second-era-es-first"
      }
    ],
    "body_markdown": "La relación inicial incluye la sustitución de «Maldito» por «Herido» en tres cartas de Objetos Legendarios. La editorial planteó una hoja organizada, archivos al tamaño de impresión y un pack de componentes corregidos para los propietarios. La Version afectada sigue siendo la primera edición española: el acontecimiento es la corrección de su contenido."
  }
}
```

La página puede usar el cover de la única Version. La tarjeta obtiene la
categoría «CAMBIO DE CONTENIDO» del enum; no necesita un subtipo de errata.

### 9.5 Forma de los otros dos fixtures

Los ejemplos completos anteriores prueban el transporte. Crisis Protocol y
los Hero Packs usan exactamente la misma forma, sin campos adicionales:

```json
{
  "event_type": "release",
  "products": [
    { "version": "mcp-hard-to-hit-es", "price_snapshot": { "kind": "pvpr", "amount_minor": 5999, "currency": "EUR", "market": "ES", "observed_at": "2026-08-28T10:00:00+02:00" } },
    { "version": "mcp-uncanny-telepaths-es", "price_snapshot": { "kind": "pvpr", "amount_minor": 5999, "currency": "EUR", "market": "ES", "observed_at": "2026-08-28T10:00:00+02:00" } },
    { "version": "mcp-winter-guard-es", "price_snapshot": { "kind": "pvpr", "amount_minor": 5999, "currency": "EUR", "market": "ES", "observed_at": "2026-08-28T10:00:00+02:00" } }
  ]
}
```

Cada Game de Crisis Protocol tiene `players: { min: 2 }`,
`duration_minutes: { min: 90, max: 90 }`, `recommended_age_min: 14` y parent
`marvel-crisis-protocol`. Las tres Versions comparten Atomic Mass Games y
Asmodee España.

```json
{
  "event_type": "release",
  "products": [
    { "version": "marvel-champions-jessica-jones-es", "price_snapshot": { "kind": "pvpr", "amount_minor": 1699, "currency": "EUR", "market": "ES", "observed_at": "2026-08-28T10:00:00+02:00" } },
    { "version": "marvel-champions-luke-cage-es", "price_snapshot": { "kind": "pvpr", "amount_minor": 1699, "currency": "EUR", "market": "ES", "observed_at": "2026-08-28T10:00:00+02:00" } }
  ]
}
```

Cada Hero Pack tiene `players: { min: 1, max: 4 }`,
`duration_minutes: { min: 45, max: 90 }`, `recommended_age_min: 14` y parent
`marvel-champions`. Sus fichas son independientes aunque ambos packs se
publiquen en una sola News.

### 9.6 Fuentes de contraste de los fixtures

Estas fuentes justifican los datos de diseño, pero quedan fuera del bundle y
de la proyección pública:

- [IELLO — King of Tokyo Godzilla](https://iellogames.com/games/king-of-tokyo-godzilla/)
- [BGG — King of Tokyo Godzilla](https://boardgamegeek.com/boardgame/463297/king-of-tokyo-godzilla)
- [Asmodee España — novedades del 28 de agosto](https://www.asmodee.es/novedades-del-28-de-agosto/)
- [Asmodee España — Agents of the Empire](https://www.asmodee.es/product/sw-legion-agents-of-the-empire/)
- [Asmodee España — Galactic Bounty Hunters](https://www.asmodee.es/product/sw-legion-galactic-bounty-hunters/)
- [Asmodee España — Jedi Council](https://www.asmodee.es/product/sw-legion-jedi-council/)
- [Asmodee España — Leaders of the Republic](https://www.asmodee.es/product/sw-legion-leaders-of-the-republic/)
- [Asmodee España — Rebel AT-RT](https://www.asmodee.es/product/sw-legion-rebel-at-rt/)
- [Asmodee España — Hard to Hit Character Pack](https://www.asmodee.es/product/mcp-hard-to-hit-character-pack/)
- [Asmodee España — Uncanny Telepaths & Telekinetics](https://www.asmodee.es/product/mcp-uncanny-telepaths-telekinetics/)
- [Asmodee España — Winter Guard Affiliation Pack](https://www.asmodee.es/product/mcp-winter-guard-affiliation-pack/)
- [MasQueOca — pack de expansiones Heroes de Tamriel](https://www.masqueoca.com/Tienda/producto.asp?item=10780)
- [MasQueOca — cierre de reservas y calendario condicionado](https://edicionesmasqueoca.com/diarios/2026/07/16/parte-de-esto-es-muy-importante-y-algo-de-lo-que-aqui-cuente-te-va-a-interesar-seguro/)
- [MasQueOca — erratas y soluciones de The Elder Scrolls](https://edicionesmasqueoca.com/diarios/2026/04/22/por-favor-leed-balance-de-la-primera-fase-y-proximos-pasos-listado-de-erratas-hasta-la-fecha/)

Los PVPR usados por los fixtures se contrastaron con precios base publicados
en comercios españoles. En una implementación real, NEWS-CORE debe conservar
la evidencia privada exacta y aplicar la prioridad de Asmodee B2B cuando
corresponda; estos enlaces no sustituyen esa futura evidencia.

## 10. Proyección Astro

### 10.1 Archivos/colecciones por fixture

La tabla cuenta entidades del bundle. En un target real el compiler puede
marcarlas `REUSE` en vez de `CREATE`, pero nunca debe duplicarlas.

| Fixture | Games creados/reutilizados | Versions | Organizations | News | Histórico conservado en News |
| --- | ---: | ---: | ---: | ---: | --- |
| King of Tokyo: Godzilla | 1 | 1 | 2 | 1 | PVPR 49,99 € |
| Star Wars: Legión | 6: base padre + 5 expansiones | 5 | 2 | 1 | cinco PVPR y orden de fichas |
| Marvel: Crisis Protocol | 4: base padre + 3 expansiones | 3 | 2 | 1 | tres PVPR y orden de fichas |
| Jessica Jones + Luke Cage | 3: base padre + 2 expansiones | 2 | 2 | 1 | dos PVPR y orden de fichas |
| Heroes of Tamriel | 7: base padre + 6 productos | 6 | 2 | 1 | depósito conjunto, productos y orden |
| `content_change` | 1 | 1 | 2 | 1 | Version afectada y texto del cambio |

La proyección no crea ficheros de «oleada», «reserva» o «evento». Por ejemplo,
el fixture de Legión produciría conceptualmente:

```text
src/content/games/star-wars-legion.md
src/content/games/star-wars-legion-agents-of-the-empire.md
src/content/games/star-wars-legion-galactic-bounty-hunters.md
src/content/games/star-wars-legion-jedi-council.md
src/content/games/star-wars-legion-leaders-of-the-republic.md
src/content/games/star-wars-legion-rebel-at-rt.md
src/content/versions/<cinco Versions>.md
src/content/organizations/asmodee-espana.md
src/content/organizations/atomic-mass-games.md
src/content/news/star-wars-legion-wave-2026-08-28.md
```

El frontmatter V2 de la News conserva la relación y el precio histórico:

```yaml
content_model_version: 2
title: Cinco expansiones de Star Wars: Legión llegan en la misma oleada
summary: ...
slug: cinco-expansiones-star-wars-legion-agosto-2026
published_at: 2026-08-28T10:00:00+02:00
event_type: release
products:
  - version: star-wars-legion-agents-of-the-empire-es
    price_snapshot:
      kind: pvpr
      amount_minor: 3999
      currency: EUR
      market: ES
      observed_at: 2026-08-28T10:00:00+02:00
  - version: star-wars-legion-galactic-bounty-hunters-es
    price_snapshot:
      kind: pvpr
      amount_minor: 4199
      currency: EUR
      market: ES
      observed_at: 2026-08-28T10:00:00+02:00
  # tres productos más
image: /images/news/star-wars-legion-wave-2026-08-28.webp
```

V2 no escribe `sources` en esta News. Los Markdown V1 existentes conservan su
campo porque no se migran.

### 10.2 Resolver y view model

Astro debe separar colección persistida y vista resuelta:

```text
News V1 ─→ adapter V1 ─┐
                       ├─→ ResolvedNewsView ─→ web / Telegram
News V2 ─→ resolver V2 ┘
             │
             ├─ products[] en orden
             ├─ Version por producto
             ├─ Game y relaciones por producto
             ├─ Organizations por Version
             ├─ facts de Game
             ├─ price snapshot de la relación
             └─ imagen según regla explícita
```

La vista compartida mínima será equivalente a:

```ts
interface ResolvedNewsView {
  id: string;
  slug: string;
  title: string;
  summary: string;
  publishedAt?: Date;
  effectiveDate?: PartialDate;
  eventType: EventTypeV2 | EventTypeV1;
  image?: string;
  bodyMarkdown: string;
  productCount: number;
  contextGameTitles: string[];
  products: Array<{
    position: number;
    heading: string; // Game.title
    game: ResolvedGame;
    version: ResolvedVersion;
    organizations: ResolvedOrganizationRelation[];
    facts: {
      players?: Players;
      durationMinutes?: DurationMinutes;
      recommendedAgeMin?: number;
      credits?: Credit[];
      spanishPublisher?: string;
      releaseDate?: PartialDate;
      priceSnapshot?: PriceSnapshotV2;
    };
  }>;
  groupPriceSnapshot?: PriceSnapshotV2;
}
```

`ResolvedNewsView` es una salida calculada, no otro objeto persistido. El
encabezado de ficha es `Game.title`; `Version.name` queda disponible para
aclarar la edición cuando haga falta. No se introduce `display_title` en la
relación porque ninguno de los fixtures lo necesita.

### 10.3 NewsCard, SEO y detalle

La tarjeta necesita solo título y summary editoriales, categoría derivada del
evento, fecha de publicación, imagen resuelta, `productCount` y títulos de
contexto. No enumera cinco SKU. Cuando todos los productos comparten un Game
padre, el resolver puede producir «Star Wars: Legión · 5 productos» o «Marvel
Champions · 2 productos» a partir del grafo, sin guardar una etiqueta nueva.

SEO usa `News.title`, `News.summary` y la imagen resuelta. Una News
multiproducto puede proyectar sus productos como varios valores `about`, pero
ninguno sustituye al título editorial ni se convierte en principal.

El detalle presenta:

```text
title
summary
imagen, si existe
contexto común derivable
body Markdown
productos relacionados, en News.products order
  ### Game.title
  facts resueltos y presentes
```

Cada ficha obtiene jugadores, duración, edad y créditos de Game; idioma,
editorial, distribución y lanzamiento de Version/Organizations; precio de la
relación News-producto. Los valores ausentes no generan filas. Facts y precios
no se insertan manualmente en `body_markdown`.

## 11. Proyección Telegram

El futuro adapter recibe `ResolvedNewsView`, la misma vista tipada que la web.
Puede acortar `summary` para el canal, pero no investiga otra vez ni parsea el
Markdown o el HTML. La adaptación de copy es salida de canal, no una segunda
fuente de hechos.

| Fixture | Categoría | Productos que recibe | Facts disponibles | Precio que recibe |
| --- | --- | --- | --- | --- |
| King of Tokyo: Godzilla | lanzamiento/novedad | 1 | 2–6, 30 min, 8+, Richard Garfield, Devir, fecha | PVPR 49,99 € |
| Legión | lanzamiento/oleada | 5 ordenados | 2+, 60–120 min, 14+, organización y fecha por producto | cinco PVPR individuales |
| Crisis Protocol | lanzamiento/oleada | 3 ordenados | 2+, 90 min, 14+, organización y fecha | tres PVPR individuales |
| Hero Packs | lanzamiento/LCG | 2 ordenados | 1–4, 45–90 min, 14+, organizaciones y fecha | dos PVPR individuales |
| Heroes of Tamriel | preventa/reservas | 6 ordenados | facts presentes por expansión, editorial y Q1 2027 | un depósito conjunto de 20 € |
| `content_change` | cambio de contenido | 1 | identidad de la edición, 1–4, 120–240 min, 14+, editorial | ninguno |

Telegram decide cuántos facts caben y cómo formatear `2–4`, `14+` o
`49,99 €`, pero trabaja con números y enums. No consulta HTML, no extrae tablas
del cuerpo y no mantiene otra copia de precio, jugadores o duración.

## 12. Compatibilidad V1

### 12.1 Lectores

News Core debe despachar antes de parsear:

```text
schema_version === 1
  → parseCanonicalNewsBundleV1
  → canonicalJsonV1 / contentHashV1
  → AstroContentCompilerV1

schema_version === 2
  → parseCanonicalNewsBundleV2
  → canonicalJsonV2 / contentHashV2
  → AstroContentCompilerV2
```

Un schema desconocido se rechaza; nunca se intenta con el parser «más
reciente». El parser V1 conserva su comportamiento exacto, incluido
`reprint`, `sources`, la cardinalidad singular y el hash. El parser V2 es
estricto para que un campo mal escrito no desaparezca silenciosamente.

Astro acepta dos ramas discriminadas:

```text
sin content_model_version → News V1: version + sources
content_model_version: 2  → News V2: products, sin version ni sources
```

El adapter V1 resuelve la relación singular existente y la proyecta como una
vista con un producto. Esto es adaptación en memoria, no migración ni cambio
del significado persistido.

### 12.2 Histórico y migración

- No se modifica ninguno de los 11 Markdown V1.
- No cambian sus IDs, slugs, rutas, frontmatter ni cuerpo.
- No se añade `products` a una News V1 ni se convierte `version` en array.
- No se recalcula ningún JSON/hash V1 con el serializer V2.
- Una News V1 puede seguir renderizándose aunque su Game no tenga los facts
  nuevos; la ficha simplemente omite esos datos.
- Enriquecer en el futuro un Game/Version compartido es una actualización
  explícita del catálogo y necesita política de compiler; no es migración
  masiva de News.

### 12.3 Draft Store y aprobaciones

La forma SQL actual puede alojar ambos bundles porque guarda JSON canónico
completo. El impacto mínimo es de lectura y tipos, no exige reescribir tablas:

- `DraftVersion.bundle` pasa a una unión V1 | V2;
- list/show obtienen títulos mediante helpers versionados;
- preview selecciona compiler por `schema_version`;
- canonical JSON y hash conservan implementación versionada;
- una actualización de contenido V1 a V2 inserta otra DraftVersion y fuerza
  `needs_review`;
- una aprobación ligada a hash V1 nunca autoriza el hash V2.

La coexistencia no autoriza actualizaciones silenciosas del catálogo. Para
una entidad existente, el compiler V2 conserva la política de seguridad V1:
datos equivalentes o información extra ya presente en el target producen
`REUSE`; un valor contradictorio produce `CONFLICT`; y facts compatibles que
solo aporta el bundle producen `UPDATE_CANDIDATE`, bloqueante. Aplicarlos
requiere una actualización editorial explícita del fichero de catálogo. V2
no convierte ese candidato en escritura automática.

No se modifica Draft Store en este ticket. Antes de implementar V2 debe
probarse la apertura de una DB V1 real, conservando `canonical_json`, hash,
versiones y aprobaciones byte a byte.

## 13. Impacto técnico futuro

### Astro — `ASTRO-NEWS-006`

- crear documentación `CONTENT_MODEL_V2` y contrato de coexistencia V1/V2;
- ampliar `src/content.config.ts` con Game facts y rama News V2 estricta;
- ampliar `scripts/validate-content-relations.mjs` para products, duplicados,
  facts, precios y cierre referencial;
- convertir `src/lib/news.ts` en resolvers V1/V2 más view model común;
- adaptar `src/components/NewsCard.astro` al contexto multiproducto;
- adaptar `src/pages/noticias/index.astro` y
  `src/pages/noticias/[slug].astro` a fichas por producto;
- añadir fixtures técnicos no públicos para mono, multi y
  `content_change`;
- mantener el test que impide renderizar sources/evidence.

### News Core — ticket posterior

- añadir dominio/parser V2 sin editar `CanonicalNewsBundleV1`;
- añadir serializer/compiler V2 y dispatcher;
- conservar para Game/Version existente la política congelada
  `REUSE`/`CONFLICT`/`UPDATE_CANDIDATE` bloqueante, sin autoenriquecimiento;
- versionar canonical JSON/hash sin tocar resultados V1;
- hacer Draft Store multiversión y seleccionar compiler en preview;
- actualizar CLI/listados para múltiples productos;
- añadir tests con los cuatro JSON de esta sección, además de conservar todos
  los fixtures y tests V1.

### Sin impacto en este diseño

- NEWS-CORE-003, Source, Evidence, Intake y SubjectHint;
- migraciones existentes;
- contenido público V1;
- scraper/investigación;
- publicación autónoma;
- implementación de Telegram.

## 14. Riesgos demostrados por los fixtures

1. **Jerarquía falsa:** cuatro familias multiproducto carecen de principal; B
   convertiría una decisión visual en dominio.
2. **Precio atribuido al objeto incorrecto:** los cinco productos de Legión
   tienen PVPR distintos y Heroes of Tamriel tiene un único depósito conjunto.
3. **Deriva histórica:** consultar un precio mutable de Version cambiaría el
   sentido económico de una News antigua.
4. **Imagen accidental:** heredar `products[0].cover` convertiría el orden de
   ficha en elección de portada sin decisión editorial.
5. **Hash ruidoso:** tratar mapas de entidades como arrays ordenados generaría
   versiones por reordenación sin cambio de contenido.
6. **Pérdida silenciosa:** el parser V1 elimina campos nuevos desconocidos;
   enviar V2 a V1 podría perder products/facts antes de hashear.
7. **Herencia incorrecta de facts:** las expansiones pueden tener rangos
   distintos del juego base; `parents` no debe copiar facts automáticamente.
8. **Fecha falseada:** Heroes of Tamriel contiene condiciones encadenadas y no
   permite reducir todo a un día de lanzamiento firme.
9. **Card de catálogo:** enumerar cinco SKU en el listado reproduciría la
   granularidad de la distribuidora y degradaría la unidad editorial.

No se añaden riesgos hipotéticos de personas, equipos, divisas exóticas,
modos alternativos o entidades Event porque los fixtures no los demuestran.

## 15. Decisiones congeladas

**DECISIÓN 1.** La relación multiproducto V2 es `News.products[]`, array de
objetos con `version` y `price_snapshot?`.

**DECISIÓN 2.** `products[]` admite de 1 a n elementos y es la única forma V2;
`version` no es shorthand V2.

**DECISIÓN 3.** No existe producto principal, ancla, featured product ni role
en el contrato V2.

**DECISIÓN 4.** El orden de `products[]` es editorial, determina las fichas y
cambia el hash.

**DECISIÓN 5.** Una Version solo puede aparecer una vez en la misma News y su
ID identifica la relación.

**DECISIÓN 6.** Games, Versions y Organizations se transportan como mapas por
ID sin orden semántico; sus claves se canonicalizan para el hash.

**DECISIÓN 7.** El bundle contiene todos los Games, Versions y Organizations
referenciados, incluidas relaciones de Game necesarias; no contiene entidades
huérfanas ni duplicadas. La lectura de JSON debe detectar claves repetidas
antes del parseo del schema, sin aceptar «último valor gana».

**DECISIÓN 8.** La imagen se resuelve `News.image` → cover de la única Version
→ ausencia. Nunca se usa el primer cover en multiproducto.

**DECISIÓN 9.** `players`, `duration_minutes`, `recommended_age_min` y
`credits` viven en Game como campos tipados opcionales.

**DECISIÓN 10.** Los jugadores usan min/max numéricos; min sin max representa
un mínimo abierto publicado (`2+`). La duración siempre usa min y max en
minutos; valores iguales representan una duración única/aproximada publicada.

**DECISIÓN 11.** Los créditos son `{ name, role }` con `designer`, `developer`
y `system_designer`; no se crea Person.

**DECISIÓN 12.** V2 no incluye overrides de facts en Version.

**DECISIÓN 13.** Idiomas, mercados, organizaciones, BGG Version ID, portada y
`release_date` permanecen en Version. La editorial española se resuelve con
el rol `spanish_publisher` existente.

**DECISIÓN 14.** El PVPR histórico vive en
`News.products[].price_snapshot`, con kind, importe en unidades menores,
moneda, mercado e instante observado.

**DECISIÓN 15.** Una oferta conjunta real usa
`News.group_price_snapshot`; no se duplica su importe en cada producto.

**DECISIÓN 16.** Los únicos tipos de precio V2 son `pvpr` y
`reservation_deposit`, demostrados por los fixtures.

**DECISIÓN 17.** Una News antigua siempre muestra su snapshot; no consulta el
precio actual de Version. No se implementa un historial temporal completo.

**DECISIÓN 18.** `published_at`, `effective_date`, `release_date` y
`observed_at` conservan significados separados y no se infieren entre sí.

**DECISIÓN 19.** `content_change` entra en el enum V2 sin subtipo.

**DECISIÓN 20.** `reprint` queda solo en V1 como valor legado; V2 lo excluye y
la reimpresión ordinaria nueva se genera como `restock`.

**DECISIÓN 21.** `CanonicalNewsBundleV2` usa `schema_version: 2` y
`astro_contract_version: 2`. Los readers despachan antes de parsear.

**DECISIÓN 22.** Astro distingue News V2 mediante
`content_model_version: 2`; su ausencia conserva la rama V1.

**DECISIÓN 23.** Las 11 News V1 no se migran, reescriben ni rehashean. Una
conversión futura exige nueva DraftVersion y aprobación.

**DECISIÓN 24.** V2 no transporta Evidence, Intake ni `sources` de
investigación. Una atribución pública futura sería otro concepto explícito.

**DECISIÓN 25.** Web y Telegram consumen el mismo `ResolvedNewsView`; Telegram
no parsea Markdown/HTML ni mantiene facts duplicados.

**DECISIÓN 26.** No se crea entidad oleada/Event ni Game/Version artificial.
News es el acontecimiento editorial y products son sus objetos afectados.

**DECISIÓN 27.** El compiler V2 no autoenriquece entidades existentes:
información nueva compatible produce `UPDATE_CANDIDATE` bloqueante; igualdad
o datos extra ya presentes producen `REUSE`; contradicción produce
`CONFLICT`.

## 16. Preguntas abiertas

No queda ninguna pregunta arquitectónica que bloquee la implementación de
Astro V2, Canonical Bundle V2, compiler V2 o Draft Store multiversión.

La selección y producción de los assets reales de cabecera, la confirmación
editorial final de cada PVPR y el enriquecimiento gradual de IDs/facts son
tareas de contenido e investigación, no decisiones del contrato. Los campos
opcionales permiten omitirlos sin inventar datos.

## 17. Siguiente ticket recomendado

El siguiente ticket debe ser **ASTRO-NEWS-006 — coexistencia del modelo
público V1/V2 y resolved view multiproducto**.

Alcance mínimo:

1. documentar `CONTENT_MODEL_V2` sin editar documentación V1 congelada;
2. implementar la rama Astro `content_model_version: 2` y Game facts;
3. implementar `products[]`, price snapshots, `content_change` y validación
   referencial;
4. construir `ResolvedNewsView` y adaptar NewsCard/detalle;
5. probar uniproducto, multiproducto, imagen explícita/ausente y
   `content_change` con fixtures no públicos;
6. demostrar que las 11 News V1 mantienen slugs y salida compatible;
7. ejecutar `content:validate`, tests y build.

Después deben seguir, en este orden, el bundle/compiler V2 de News Core y el
Draft Store multiversión. No conviene implementar primero el productor: Astro
debe congelar y probar la frontera que recibirá.
