# Power Ranking

Todo lo necesario para publicar una edición mensual del Power Ranking en visludica.com sin
tener que releer el código.

- [Dónde encaja este repo](#dónde-encaja-este-repo)
- [Runbook mensual (`public-results-v1`)](#runbook-mensual-public-results-v1)
- [Ruta legacy de Excel](#ruta-legacy-de-excel)
- [Esquema legacy de `data.json`](#esquema-legacy-de-datajson)
- [Fórmulas y presentación](#fórmulas-y-presentación)
- [Campos de `editorial.ts`](#campos-de-editorialts)
- [La web publicada](#la-web-publicada)
- [Participación actual](#participación-actual)
- [Trampas conocidas](#trampas-conocidas)

---

## Dónde encaja este repo

```
motor Python → public-results.json → repositorio web → validación → Astro
                                                     ↓
                                              editorial.ts → npm run build
```

Para las nuevas ediciones, el motor Python es la autoridad de cálculo. Su
`public-results.json` con `schema_version: "public-results-v1"` ya contiene posiciones,
desempates, Power, Acumulado, movimientos, histórico y estadísticas. Astro valida el
contrato y sólo adapta nombres, formatos y coordenadas visuales: no recalcula ni reordena.

`src/data/power-ranking/2026-08/public-results.json` es el primer artefacto incorporado de
esta forma y se conserva prácticamente intacto. No se copian `publication.json`, paquetes
de revisión, snapshots, respuestas ni XLSX como fuente de datos para Astro.

El texto editorial sí se mantiene en este repositorio, separado del contrato matemático.

---

## Runbook mensual (`public-results-v1`)

### 1. Obtener el artefacto del motor

Obtener el `public-results.json` validado que genera el motor Python para el periodo. No
reconstruirlo desde los Excel ni editar sus números en el repo web. Guardarlo como:

```text
src/data/power-ranking/YYYY-MM/public-results.json
```

La validación de importación está en
[`public-results-v1.mjs`](../src/lib/public-results-v1.mjs). Rechaza una versión
desconocida, campos/tipos contractuales incorrectos, posiciones ausentes, IDs no `vlg_*` y
decimales que no lleguen como strings. Si falla, el build falla: nunca se deriva un fallback
desde XLSX.

### 2. Escribir el editorial

Crear `src/data/power-ranking/YYYY-MM/editorial.ts`. Lo práctico es copiar el del mes
anterior y reescribir los textos.

Dos ejemplares de referencia en el repo:

- `src/data/power-ranking/2026-07/editorial.ts` — completo, con `chronicle`.
- `src/data/power-ranking/2026-06/editorial.ts` — mínimo, sin `chronicle` y con `quotes`.

Los campos están detallados en [Campos de `editorial.ts`](#campos-de-editorialts).

### 3. Registrar la edición y activar el loader autoritativo

En [`src/lib/power-ranking.ts`](../src/lib/power-ranking.ts), importar los dos archivos y
**añadir la entrada al principio** del array `editions`:

```ts
import september2026Contract from '../data/power-ranking/2026-09/public-results.json';
import { editorial as septemberEditorial } from '../data/power-ranking/2026-09/editorial';
import { loadPublicResultsV1 } from './public-results-v1.mjs';

export const editions = [
  { ...loadPublicResultsV1(september2026Contract), editorial: septemberEditorial }, // ← la nueva, arriba
  { ...july2026, editorial: julyEditorial },
  { ...june2026, editorial: juneEditorial },
];
```

El orden importa: `latestEdition = editions[0]` es lo que sirve `/power-ranking/`.

El adaptador conserva los IDs estables `vlg_*`, orden y posiciones del contrato. Puede
convertir un decimal a `Number` sólo para texto o un gráfico SVG; no suma histórico, decide
empates, calcula movimientos ni deduce `NEW`/`RETURNS`.

Las ediciones anteriores que importan `data.json` permanecen en la vía legacy. La selección
es explícita por edición, no automática.

### 4. Construir y comprobar

```sh
npm run build
```

Debe aparecer la ruta nueva (`/power-ranking/2026/08/`) y `/power-ranking/` debe mostrar ya
la edición nueva. Después, commit y push: Cloudflare Pages despliega solo.

## Ruta legacy de Excel

`npm run ranking:import` y [`scripts/import-power-ranking.mjs`](../scripts/import-power-ranking.mjs)
se conservan exclusivamente para las ediciones históricas que ya dependen de
`data.json`. No son el procedimiento de publicación de una nueva edición con
`public-results-v1`.

### Errores del importador legacy

El script valida los datos antes de escribir nada
([`validateProject`](../scripts/import-power-ranking.mjs)). Si falla, no se genera el
`data.json` y el mensaje indica el proyecto afectado.

| Mensaje | Causa | Arreglo |
|---|---|---|
| `No se encontró una hoja que coincida con /…/` | El nombre de una hoja del Excel no casa con el patrón esperado | Renombrar la hoja siguiendo [Qué exigen los Excel](#qué-exigen-los-excel) |
| `No se encontró la cabecera Pos, Juego, … en <hoja>` | Falta una columna obligatoria, o la fila de cabecera está por debajo de la fila 15 | Revisar los títulos de columna y subir la cabecera |
| `No se encontró la cabecera Palmarés o Acumulado en <hoja>` | El histórico no contiene la columna anual | Añadir `Acumulado <año>`; los libros antiguos con `PALMARÉS` siguen siendo compatibles |
| `Posiciones no consecutivas en <proyecto> / <vista>` | La columna `Pos` tiene huecos, repeticiones o filas intercaladas | Recalcular las posiciones en el Excel (1, 2, 3… sin saltos) |
| `No hay resultados para <proyecto>` | La hoja existe pero no ha salido ninguna fila válida | Comprobar que hay datos bajo la cabecera y que `Pos` es numérico |
| `Los puntos de <proyecto> no cuadran: X frente a Y` | La suma de la columna `Pts` no coincide con el «Puntos totales» de la cabecera de la hoja mensual | Corregir el bloque de estadísticas o revisar filas perdidas |
| `El número de votantes no es válido` | Falta «Votantes» en la cabecera (Vis Lúdica) o la fila `Votos de guerra` del histórico no tiene valor para ese mes (Vis Bélica) | Rellenar el dato en el Excel |
| `Falta --main` / `Año o mes no válidos` | Argumento ausente o mal formado | Revisar el comando |

---

## Qué exigen los Excel (legacy)

Es la parte más frágil del pipeline: el importador localiza las hojas por su **nombre**,
usando expresiones regulares con el mes en español y sin distinguir mayúsculas.

### Nombres de hoja

|  | Vis Lúdica (`--main`) | Vis Bélica (`--belica`) |
|---|---|---|
| Mensual | `Ranking <mes> <año>` | `Ranking Vis Bélica <mes>` |
| Power | `Power Ranking <mes>` | `Power Ranking Vis Bélica <mes>` |
| Histórico | `Histórico <año>` | `Histórico Vis Bélica` |

Ejemplos reales de julio 2026: `Ranking julio 2026`, `Power Ranking julio`,
`Histórico 2026`, `Ranking Vis Bélica julio`, `Power Ranking Vis Bélica julio`,
`Histórico Vis Bélica`.

El libro debe conservar además la hoja Power del **mes anterior** (`Power Ranking junio`),
que es de donde salen los movimientos. Si no está, el importador recalcula las posiciones
del mes anterior con la fórmula POWER; el resultado es aproximado, no idéntico.

### Cabeceras obligatorias

Se buscan en las **15 primeras filas** de cada hoja, sin distinguir mayúsculas ni acentos
del propio texto de la celda.

| Hoja | Columnas que deben existir | Columnas opcionales que se leen si están |
|---|---|---|
| Mensual | `Pos`, `Juego` | `Pts`, `Norm.` (o `Norm`), `Nº1`, `Nº2`, `Nº3`, `Votos`, `Var.` |
| Power | `Pos`, `Juego`, `Score` | — |
| Histórico | `Juego`, `POWER`, `Acumulado <año>` (o `PALMARÉS` en libros antiguos) | `Ene`, `Feb`, `Mar`, `Abr`, `May`, `Jun`, `Jul`, `Ago`, `Sep`, `Oct`, `Nov`, `Dic`, `Meses` |

La columna `Var.` admite `NEW`, `=`, `+3`, `-7` y similares. Un `=` o un `0` se guardan
como `0`; `NEW` se guarda como la cadena `"NEW"`.

### Filas especiales

- **Histórico** — las filas cuyo nombre de juego sea `Votantes`, `Votos de guerra` o `Votantes con wargame` no se
  tratan como juegos: alimentan `voterHistory`, la evolución de participación mes a mes (y
  las barras que se ven en Vis Bélica). Las tres etiquetas son compatibles; por convención
  se usa `Votantes` en Vis Lúdica y `Votantes con wargame` en Vis Bélica.
- **Hoja mensual de Vis Lúdica** — en las **5 primeras filas** debe haber un bloque de
  pares etiqueta/valor con `Votantes`, `Juegos distintos` y `Puntos totales`. De ahí salen
  las tres tarjetas de estadísticas de la web. En Vis Bélica no hace falta: se calculan
  desde el histórico y el propio ranking.

---

## Esquema legacy de `data.json`

```jsonc
{
  "id": "2026-07",
  "year": 2026,
  "month": 7,
  "monthName": "Julio",
  "sourceFiles": {
    "vis-ludica": "power_ranking_julio_2026.xlsx",
    "vis-belica": "power_ranking_vis_belica_julio_2026.xlsx"
  },
  "projects": {
    "vis-ludica": { /* ver abajo */ },
    "vis-belica": { /* misma forma */ }
  }
}
```

Cada proyecto:

```jsonc
{
  "id": "vis-ludica",
  "stats": { "voters": 170, "distinctGames": 330, "totalPoints": 1014 },
  "voterHistory": [ { "month": 7, "label": "Jul", "value": 170 } ],
  "games": {
    "the-elder-scrolls-la-traicion-de-la-segunda-era": {
      "id": "the-elder-scrolls-la-traicion-de-la-segunda-era",
      "title": "The Elder Scrolls: La Traición de la Segunda Era",
      // 12 posiciones, enero a diciembre; null = mes sin datos
      "history": [null, null, 0.083, 0.346, 0.272, 0.193, 0.159, null, null, null, null, null]
    }
  },
  "rankings": { "power": [], "monthly": [], "annual": [] }
}
```

### `rankings.power`

```jsonc
{ "id": "the-elder-scrolls-…", "rank": 1, "score": 0.1855, "movement": 0 }
```

`score` se **copia tal cual** de la columna `Score` de la hoja Power del Excel; el script no
lo recalcula. `movement` se deriva comparando con la hoja Power del mes anterior.

### `rankings.monthly`

```jsonc
{
  "id": "the-elder-scrolls-…",
  "title": "The Elder Scrolls: La Traición de la Segunda Era",
  "rank": 1, "points": 27, "normalized": 0.159,
  "firstVotes": 7, "secondVotes": 3, "thirdVotes": 0, "votes": 10,
  "movement": 1
}
```

Es el único ranking que conserva su propio `title`; los otros dos resuelven el nombre contra
`games[id].title`.

### `rankings.annual` (Acumulado anual)

```jsonc
{ "id": "the-elder-scrolls-…", "rank": 1, "score": 1.053, "movement": 0, "months": 5 }
```

`score` es la suma de los normalizados del año, sin decaimiento. `months` es el número de
meses en los que el juego ha puntuado.

### Notas transversales (legacy)

- `movement` puede ser un número (positivo = sube, negativo = baja), `0` (se mantiene) o la
  cadena `"NEW"` (no estaba el mes anterior). **`NEW` no significa novedad editorial**:
  significa que no puntuó el mes pasado. Esto es así en `data.json`; en la web, `presentRow`
  reinterpreta la presentación (ver más abajo) sin tocar el dato original.
- Los ids son *slugs*: minúsculas sin acentos, con guiones. `games` está indexado por slug.
- Las listas de `power` y `annual` incluyen todos los juegos con puntuación acumulada (en
  julio 2026, 863 y 860 entradas), no solo los del mes.
- **La web distingue `NEW` de `Vuelve` y silencia el ruido de la cola** — solo en
  presentación, `data.json` no cambia. Lo resuelve `presentRow`/`resolveMovement` en
  [`power-ranking.ts`](../src/lib/power-ranking.ts):
  - Un `movement` `"NEW"` se muestra como **`Vuelve`** (mismo pill, tono `new`) si el juego
    tiene algún valor no nulo en `history` en algún mes anterior al de la edición; si no hay
    historia previa, se queda como `NEW`.
  - En las vistas `power` y `annual` (no en `monthly`), las filas con `rank > 50` y
    movimiento **numérico** se muestran como `—` (tono `same`): con decenas de empates a
    pocos puntos, un solo voto mueve un juego cien posiciones y el número es ruido. `NEW` y
    `Vuelve` se siguen mostrando a cualquier profundidad.

---

## Fórmulas y presentación

**POWER** — combina el mes actual con los tres anteriores, para premiar la forma reciente
sin borrar la inercia:

```
POWER = 0,7 × mes actual + 0,3 × (0,5 × mes−1 + 0,3 × mes−2 + 0,2 × mes−3)
```

En una edición `public-results-v1`, este cálculo ya lo hace el motor Python: la web recibe
el decimal autoritativo y no vuelve a aplicar la fórmula. En la vía legacy, el valor
publicado viene de la columna `Score` del Excel. La página muestra la fórmula en el
desplegable «Cómo se calcula».

**Acumulado anual** — en `public-results-v1` llega ya calculado por el motor. La vía legacy
usa el valor publicado en la columna `Acumulado <año>` del histórico (o `PALMARÉS` en libros
antiguos), sin decaimiento. En 2026 empieza en febrero.

**Presentación** — la web multiplica solo el índice POWER por 100 y lo muestra con un decimal
([`formatIndex`](../src/lib/power-ranking.ts)). Un `score` de `0,1855` en los datos se lee
`18,6` en esa tabla. El Acumulado conserva su escala y muestra tres o cuatro decimales.

---

## Campos de `editorial.ts`

El archivo exporta `editorial` con una clave por proyecto (`'vis-ludica'` y
`'vis-belica'`), y termina en `as const`.

### Comunes a los dos proyectos

| Campo | Obligatorio | Dónde sale |
|---|---|---|
| `name` | sí | Título de la sección: «Vis Lúdica · Julio 2026» |
| `eyebrow` | sí | Etiqueta pequeña sobre el título |
| `intro` | sí | Párrafo de entrada, junto a las tres tarjetas de estadísticas |
| `methodology` | sí | Texto del desplegable «Cómo se calcula» |
| `power` | sí | Vista Power Ranking |
| `monthly` | sí | Vista Ranking mensual |
| `annual` | sí | Vista Acumulado anual |
| `quotes` | sí (puede ir `[]`) | Bloque «La grada», **solo en la vista mensual** |
| `chronicle` | no | Pestaña Análisis |
| `voterGrowth` | no | Barras de evolución, **solo se renderiza en Vis Bélica** |

### Bloques de vista

```ts
power: {
  headline: '…',           // obligatorio
  deck: '…',               // obligatorio
  notes: {                 // opcional: nota bajo cada tarjeta del podio
    '<slug-del-juego>': '…',
  },
  afterword: '…',          // opcional: bloque «Zona noble» bajo el podio
},
monthly: { headline, deck, notes?, afterword? },
annual:  { headline, deck, notes?, afterword? },
```

Las tres vistas admiten los mismos campos; lo que cambia es el uso habitual. En las
ediciones publicadas, `notes` se escribe en `power` y `monthly`, y `afterword` solo en
`power`.

Las claves de `notes` son **slugs**, no títulos. Si el slug no existe en el podio, la nota
simplemente no aparece.

### `chronicle` (opcional)

Si falta, la pestaña Análisis muestra «La crónica de esta edición está en preparación» —así
está junio 2026. Si está, deben estar **todos** sus campos:

```ts
chronicle: {
  eyebrow: '…',
  headline: '…',
  deck: '…',
  intro: ['párrafo', 'párrafo'],
  sections: [{ title: '…', paragraphs: ['…', '…'] }],
  sidebar: [{ title: '…', text: '…' }],
  voices: [{ text: '…', attribution: '…' }],
  discussion: { headline: '…', text: '…', label: '…', url: 'https://t.me/…' },
},
```

### `voterGrowth` (opcional, solo Vis Bélica)

```ts
voterGrowth: { label: '…', headline: '…', deck: '…' },
```

Si falta, se usan textos por defecto. En Vis Lúdica se ignora aunque se escriba.

### `quotes`

```ts
quotes: [{ label: '…', text: '…', attribution: '…' }],
```

Se renderizan **solo en la vista mensual**. En julio 2026 va vacío porque las citas se
movieron a `chronicle.voices`.

---

## La web publicada

### Rutas

| Ruta | Qué muestra |
|---|---|
| `/power-ranking/` | `latestEdition`, es decir `editions[0]` |
| `/power-ranking/YYYY/MM/` | Una edición concreta; se generan todas las de `editions` con `getStaticPaths` |

El mes va con dos dígitos: `/power-ranking/2026/07/`. El selector de edición de la cabecera
navega entre ellas.

### Parámetros de URL

El estado de proyecto y vista se refleja en la URL con `history.replaceState`, así que los
enlaces son compartibles:

- `?proyecto=vis-belica` — cambia de proyecto. `vis-ludica` es el valor por defecto y se
  omite de la URL.
- `?vista=monthly` · `?vista=analysis` · `?vista=annual` — cambia de pestaña. `power` es el
  valor por defecto y se omite.

Ejemplo: `/power-ranking/2026/07/?proyecto=vis-belica&vista=analysis`.

### Comportamiento de las tablas

- Se muestran **25 filas** y el botón «Mostrar 25 más» va ampliando de 25 en 25.
- El HTML estático solo pinta las **primeras 100 filas** de cada vista (`power`, `monthly`,
  `annual` pueden tener hasta ~860 juegos). El resto se pide bajo demanda a
  `/power-ranking/<año>/<mes>/datos.json` la primera vez que hace falta: cuando el usuario
  escribe en el buscador, o cuando «Mostrar más» va a revelar una fila más allá de las
  presentes en el DOM. La petición es única por tabla (promesa memorizada en
  `ensureFullData`) y, si falla, la tabla sigue funcionando solo con las 100 primeras filas
  (aviso en consola, sin romper la interfaz).
- `datos.json` devuelve, por proyecto y vista, todas las filas **ya formateadas para
  pintar** (índice ×100, movimiento con su `label`/`tone`) usando
  [`presentRow`](../src/lib/power-ranking.ts) — la misma función que usa el componente
  Astro para las filas estáticas, así que ambas rutas aplican exactamente las mismas reglas
  de presentación. El cliente solo inserta el texto recibido (`createElement` +
  `textContent`, nunca `innerHTML` con datos externos).
- El buscador filtra en cliente sobre el título del juego, y al escribir reinicia el límite
  a 25. El contador («X de Y juegos») usa siempre el total real de la vista
  (`data-total-count` en `[data-table-shell]`), no el número de filas presentes en el DOM en
  ese momento — así no miente mientras `datos.json` todavía no se ha cargado.

## Participación actual

El componente reutilizable `PowerRankingParticipation.astro` aparece en la portada y en
`/power-ranking/`, separado visualmente de los resultados ya publicados. Como la web usa
`output: static`, consulta en el navegador la API pública de participación:

- `GET /api/power-ranking/v1/campaign` para conocer la campaña abierta;
- `GET /api/power-ranking/v1/campaigns/{id}/summary` para el agregado público.

Si la campaña está abierta, ofrece el enlace a `/power-ranking/votar/` y, cuando está
disponible, muestra `X papeletas recibidas en la web`. `received_ballots` cuenta solo
papeletas nativas activas con al menos una selección: no son personas, votos únicos ni el
denominador de los resultados publicados. Un fallo del resumen oculta solo la cifra; un
fallo de campaña conserva un enlace neutro. El componente no crea sesiones ni consulta
papeletas, y no muestra clasificaciones provisionales.

La página de voto vuelve a consultar `summary` después de una confirmación real de creación
o edición. No calcula incrementos en el navegador. La ruta remota de esta API todavía no
está desplegada; hasta entonces los fallbacks no alteran los resultados estáticos.

### Podio y tiras de meses

- El podio son las tres primeras filas de la vista activa.
- En Power y Acumulado, cada tarjeta lleva una tira con los **cuatro últimos meses**
  incluido el actual ([`monthsForGame`](../src/lib/power-ranking.ts)); en la vista mensual
  se sustituye por el desglose `1º–2º–3º · votantes`.
- En la tabla, el **top 10** de las vistas no mensuales lleva una sparkline SVG generada en
  build (`sparklineSvg` en el frontmatter de `PowerRankingExperience.astro`), con los meses
  `0..editionMonth-1` del juego normalizados a su propio mínimo/máximo; los meses sin datos
  cortan la línea en varios `<polyline>` en vez de interpolar el hueco. El contenedor
  conserva la clase `table-history` (la regla que lo oculta en móvil sigue aplicando) y
  lleva `role="img"` con el mismo texto accesible que antes se imprimía como texto plano
  («Abr 34,6 · May 27,2 · …», los cuatro últimos meses). Solo existe para las 100 filas
  estáticas — nunca se genera para filas cargadas desde `datos.json`.
- Los movimientos se colorean por tono: `up`, `down`, `same` (`—`) y `new`.

---

## Trampas conocidas

- **Las notas del podio se enlazan por slug.** Si en el Excel cambia el título de un juego,
  cambia el slug y la nota correspondiente **desaparece en silencio**: no hay error de
  build. Después de importar, conviene mirar el podio de cada vista.
- **Los juegos con título numérico generan ids numéricos** (`504`, `1825`, `1830`, `1846`,
  `1882`). Son válidos, pero al escribirlos como clave en `notes` hay que citarlos:
  `'1830': '…'`.
- **El histórico agrupa duplicados quedándose con el máximo.** Si el mismo juego aparece dos
  veces con distinta grafía, para cada mes se conserva el valor **mayor**, no la suma. Si
  los dos registros tienen datos reales, se pierde información: mejor unificar el nombre en
  el Excel.
- **`editions` va de más reciente a más antigua.** Insertar la edición nueva al final deja
  `/power-ranking/` mostrando un mes viejo, sin ningún aviso.
- **Cuidado al citar el índice en la prosa.** Julio 2026 escribe «un índice de 0,1855»
  mientras la tabla de al lado muestra `18,6`: son el mismo número en escalas distintas.
  Conviene elegir una y mantenerla.
- **`NEW` no quiere decir novedad.** Quiere decir «no puntuó el mes pasado». En un mes con
  mucha rotación puede haber cientos de `NEW` que llevan años publicados. En `data.json` no
  hay distinción, pero la web sí: si el juego tiene historia en algún mes anterior al de la
  edición, se presenta como `Vuelve` en vez de `NEW`. Para el texto editorial, sigue sin
  haber garantía de que un `NEW`/`Vuelve` sea relevante; conviene mirar el histórico del
  juego antes de llamarlo novedad.
- **Los movimientos de la cola no significan nada.** Con decenas de empates a uno o dos
  puntos, un solo voto mueve un juego cien posiciones. Para el texto editorial solo son
  relevantes los movimientos cerca de la cabeza. La web ya lo refleja: en las vistas `power`
  y `annual`, un movimiento numérico en `rank > 50` se pinta como `—` (no en `monthly`); el
  dato crudo de `data.json` no cambia, solo la presentación.
