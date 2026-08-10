# Power Ranking

Todo lo necesario para publicar una edición mensual del Power Ranking en visludica.com sin
tener que releer el código.

- [Dónde encaja este repo](#dónde-encaja-este-repo)
- [Runbook mensual](#runbook-mensual)
- [Qué exigen los Excel](#qué-exigen-los-excel)
- [Esquema de `data.json`](#esquema-de-datajson)
- [Fórmulas](#fórmulas)
- [Campos de `editorial.ts`](#campos-de-editorialts)
- [La web publicada](#la-web-publicada)
- [Trampas conocidas](#trampas-conocidas)

---

## Dónde encaja este repo

```
CSV del formulario → [skill power-ranking-mensual] → Excel → npm run ranking:import
                                                              ↓
                                         data.json + editorial.ts → npm run build
```

El skill `power-ranking-mensual` (vive fuera de este repo, en la configuración de Claude)
procesa el CSV del formulario de Google, resuelve alias con la tabla maestra y produce los
dos libros de Excel:

- `power_ranking_<mes>_<año>.xlsx` — Vis Lúdica
- `power_ranking_vis_belica_<mes>_<año>.xlsx` — Vis Bélica

**Este repo empieza ahí.** No toca votos ni CSV: importa los Excel, genera los datos de la
web y renderiza la página. Lo único que se escribe a mano aquí es el texto editorial.

---

## Runbook mensual

### 1. Importar los Excel

```sh
npm run ranking:import -- \
  --main /ruta/power_ranking_julio_2026.xlsx \
  --belica /ruta/power_ranking_vis_belica_julio_2026.xlsx \
  --year 2026 \
  --month 7
```

Genera `src/data/power-ranking/2026-07/data.json`. Ese archivo **no se edita a mano**: se
regenera entero en cada importación.

Argumentos:

| Argumento | Obligatorio | Qué hace |
|---|---|---|
| `--main` | sí | Ruta al Excel de Vis Lúdica |
| `--belica` | sí | Ruta al Excel de Vis Bélica |
| `--year` | sí | Año de la edición (entero) |
| `--month` | sí | Mes de la edición, 1–12 |
| `--output` | no | Ruta alternativa de salida. Por defecto `src/data/power-ranking/<año>-<mes>/data.json` |

Al terminar imprime un resumen por proyecto (líder del Power, líder del mes y número de
votantes). Conviene mirarlo: si no coincide con lo que dicen los Excel, algo no ha casado.

### 2. Escribir el editorial

Crear `src/data/power-ranking/YYYY-MM/editorial.ts`. Lo práctico es copiar el del mes
anterior y reescribir los textos.

Dos ejemplares de referencia en el repo:

- `src/data/power-ranking/2026-07/editorial.ts` — completo, con `chronicle`.
- `src/data/power-ranking/2026-06/editorial.ts` — mínimo, sin `chronicle` y con `quotes`.

Los campos están detallados en [Campos de `editorial.ts`](#campos-de-editorialts).

### 3. Registrar la edición

En [`src/lib/power-ranking.ts`](../src/lib/power-ranking.ts), importar los dos archivos y
**añadir la entrada al principio** del array `editions`:

```ts
import august2026 from '../data/power-ranking/2026-08/data.json';
import { editorial as augustEditorial } from '../data/power-ranking/2026-08/editorial';

export const editions = [
  { ...august2026, editorial: augustEditorial },   // ← la nueva, arriba
  { ...july2026, editorial: julyEditorial },
  { ...june2026, editorial: juneEditorial },
];
```

El orden importa: `latestEdition = editions[0]` es lo que sirve `/power-ranking/`.

### 4. Construir y comprobar

```sh
npm run build
```

Debe aparecer la ruta nueva (`/power-ranking/2026/08/`) y `/power-ranking/` debe mostrar ya
la edición nueva. Después, commit y push: Cloudflare Pages despliega solo.

### Errores del importador

El script valida los datos antes de escribir nada
([`validateProject`](../scripts/import-power-ranking.mjs)). Si falla, no se genera el
`data.json` y el mensaje indica el proyecto afectado.

| Mensaje | Causa | Arreglo |
|---|---|---|
| `No se encontró una hoja que coincida con /…/` | El nombre de una hoja del Excel no casa con el patrón esperado | Renombrar la hoja siguiendo [Qué exigen los Excel](#qué-exigen-los-excel) |
| `No se encontró la cabecera Pos, Juego, … en <hoja>` | Falta una columna obligatoria, o la fila de cabecera está por debajo de la fila 15 | Revisar los títulos de columna y subir la cabecera |
| `Posiciones no consecutivas en <proyecto> / <vista>` | La columna `Pos` tiene huecos, repeticiones o filas intercaladas | Recalcular las posiciones en el Excel (1, 2, 3… sin saltos) |
| `No hay resultados para <proyecto>` | La hoja existe pero no ha salido ninguna fila válida | Comprobar que hay datos bajo la cabecera y que `Pos` es numérico |
| `Los puntos de <proyecto> no cuadran: X frente a Y` | La suma de la columna `Pts` no coincide con el «Puntos totales» de la cabecera de la hoja mensual | Corregir el bloque de estadísticas o revisar filas perdidas |
| `El número de votantes no es válido` | Falta «Votantes» en la cabecera (Vis Lúdica) o la fila `Votos de guerra` del histórico no tiene valor para ese mes (Vis Bélica) | Rellenar el dato en el Excel |
| `Falta --main` / `Año o mes no válidos` | Argumento ausente o mal formado | Revisar el comando |

---

## Qué exigen los Excel

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
| Histórico | `Juego`, `POWER`, `PALMARÉS` | `Ene`, `Feb`, `Mar`, `Abr`, `May`, `Jun`, `Jul`, `Ago`, `Sep`, `Oct`, `Nov`, `Dic` |

La columna `Var.` admite `NEW`, `=`, `+3`, `-7` y similares. Un `=` o un `0` se guardan
como `0`; `NEW` se guarda como la cadena `"NEW"`.

### Filas especiales

- **Histórico** — las filas cuyo nombre de juego sea `Votantes` o `Votos de guerra` no se
  tratan como juegos: alimentan `voterHistory`, la evolución de participación mes a mes (y
  las barras que se ven en Vis Bélica). Cualquiera de las dos etiquetas vale en cualquiera
  de los dos libros; por convención se usa `Votantes` en Vis Lúdica y `Votos de guerra` en
  Vis Bélica.
- **Hoja mensual de Vis Lúdica** — en las **5 primeras filas** debe haber un bloque de
  pares etiqueta/valor con `Votantes`, `Juegos distintos` y `Puntos totales`. De ahí salen
  las tres tarjetas de estadísticas de la web. En Vis Bélica no hace falta: se calculan
  desde el histórico y el propio ranking.

---

## Esquema de `data.json`

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

### `rankings.annual` (Palmarés)

```jsonc
{ "id": "the-elder-scrolls-…", "rank": 1, "score": 1.053, "movement": 0, "months": 5 }
```

`score` es la suma de los normalizados del año, sin decaimiento. `months` es el número de
meses en los que el juego ha puntuado.

### Notas transversales

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

## Fórmulas

**POWER** — combina el mes actual con los tres anteriores, para premiar la forma reciente
sin borrar la inercia:

```
POWER = 0,7 × mes actual + 0,3 × (0,5 × mes−1 + 0,3 × mes−2 + 0,2 × mes−3)
```

En el repo esta fórmula solo se usa como *fallback* (cuando falta la hoja Power del mes
anterior): el valor publicado viene de la columna `Score` del Excel, que la calcula el
skill. La página la muestra en el desplegable «Cómo se calcula».

**Palmarés** — suma de los valores normalizados de todos los meses del año, sin
decaimiento. Este sí se calcula aquí, a partir del histórico.

**Presentación** — la web multiplica el índice por 100 y lo muestra con un decimal
([`formatIndex`](../src/lib/power-ranking.ts)). Un `score` de `0,1855` en los datos se lee
`18,6` en la tabla.

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
| `annual` | sí | Vista Palmarés |
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

### Podio y tiras de meses

- El podio son las tres primeras filas de la vista activa.
- En Power y Palmarés, cada tarjeta lleva una tira con los **cuatro últimos meses**
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
