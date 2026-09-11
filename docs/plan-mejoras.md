# Plan de mejoras — documento de continuidad

Estado del plan de mejoras visuales, de estructura y del Power Ranking surgido de la
revisión de diseño del 10 de agosto de 2026. Sirve para retomar el trabajo en cualquier
sesión futura sin releer aquella conversación.

- [Cómo se trabajó (y conviene seguir)](#cómo-se-trabajó-y-conviene-seguir)
- [Hecho](#hecho)
- [Proyecto: buscadores independientes](#proyecto-buscadores-independientes)
- [Pendiente — código](#pendiente--código)
- [Pendiente — contenido (David)](#pendiente--contenido-david)
- [Detalles menores detectados y no resueltos](#detalles-menores-detectados-y-no-resueltos)

---

## Cómo se trabajó (y conviene seguir)

1. **Análisis y decisiones de diseño** con el modelo principal; **el picado de código lo
   hace un subagente Sonnet** con una especificación cerrada (archivos concretos, valores
   concretos, criterio de verificación). Ahorra tokens y ha funcionado bien en tres lotes.
2. El agente **no commitea**: verifica con `npm run build` e informa. La revisión del diff,
   la prueba en navegador (localhost:4321, `npm run dev`) y el commit los hace la sesión
   principal.
3. **Publicación caso a caso.** Hasta ahora, siempre commit directo a `main` (Cloudflare
   Pages despliega solo). Los commits van en español, estilo imperativo, con cuerpo
   explicativo.
4. `docs/power-ranking.md` es la **fuente de verdad** del pipeline del ranking: cualquier
   cambio de comportamiento debe reflejarse ahí en el mismo commit.
5. `.claude/` no se commitea. `dist/` está gitignorado.

## Hecho

| Commit | Lote |
|---|---|
| `bac6c9e` | Documentación del pipeline del Power Ranking (`docs/power-ranking.md`) |
| `d42783b` | Quick wins: bugs del ranking (mes hardcodeado, estado del selector de edición, búsqueda sin acentos), contraste AA del gris terciario (`#6D7480`), `/listen`→`/escuchar` + redirect 301, enlaces centralizados en `src/config.ts`, RSS alternate + theme-color, escala única del índice (×100), separador de millares, token `--header-height` |
| `859af03` | Buscador de episodios en `/podcast` (índice `indice.json` en build + filtrado cliente; se descartó Pagefind) y modo oscuro completo (tokens duplicados en media query + `[data-theme]`, toggle en header, `--ranking-on-accent` para contraste sobre acento) |
| `d5c3a5a` | Power Ranking: top 100 estático + `datos.json` bajo demanda (1,3 MB→383 KB), NEW→«Vuelve», movimientos numéricos silenciados con rank>50 en power/annual, sparklines SVG en el top 10. Reglas unificadas en `presentRow` (`src/lib/power-ranking.ts`) |

## Proyecto: buscadores independientes

Estado: implementado y verificado el 11 de septiembre de 2026. Pendiente de commit y
publicación.

### Objetivo

Disponer de dos buscadores locales y claramente separados:

- el buscador de `/podcast` consulta exclusivamente episodios;
- el buscador de `/noticias` consulta exclusivamente noticias.

Cada buscador vive en la portada de su archivo y busca en todo el contenido de esa
sección, incluidas las entradas que aparecen en páginas posteriores de la paginación. No
se añade búsqueda global al encabezado, no se mezclan resultados y no se crea un índice
combinado.

El sitio seguirá siendo estático. Los dos índices se generan durante el build y se cargan
en el navegador solo cuando el visitante utiliza el campo de búsqueda. No hacen falta
servicios externos ni nuevas dependencias.

### Alcance funcional

#### Podcast

Se conserva y se adapta el buscador ya existente en `/podcast`:

- origen único: `/podcast/indice.json`;
- campos buscables: título y resumen del RSS;
- resultados: fecha, título y resumen, siempre con enlaces `/podcast/<slug>`;
- orden: el del archivo, del episodio más reciente al más antiguo.

#### Noticias

Se incorpora un buscador equivalente en `/noticias`:

- origen único: `/noticias/indice.json`;
- campos buscables: título, resumen, cuerpo, etiquetas, productos, diseñadores,
  editoriales y distribuidoras;
- resultados: fecha, contexto del producto, título y resumen, siempre con enlaces
  `/noticias/<slug>`;
- orden: fecha de publicación descendente, igual que el archivo.

#### Comportamiento común

- búsqueda sin distinguir mayúsculas, minúsculas ni acentos;
- mínimo de dos caracteres;
- las palabras de una consulta pueden aparecer en distinto orden, pero deben aparecer
  todas;
- máximo de 50 resultados visibles;
- contador de coincidencias y mensaje de ausencia de resultados;
- mensaje específico si falla la carga del índice;
- el listado y la paginación originales se ocultan durante la búsqueda y reaparecen al
  vaciar el campo;
- sin JavaScript, los dos archivos y sus paginaciones continúan funcionando;
- el estado de resultados se anuncia con `aria-live="polite"` y todos los resultados son
  enlaces navegables con teclado.

### Diseño técnico

Se reutiliza la solución ligera que ya existe para el podcast, con una extracción pequeña
para no mantener dos copias del mismo comportamiento:

1. `src/lib/archive-search.mjs`: normalización y coincidencia, sin conocimiento de podcast
   ni de noticias y comprobable con tests unitarios.
2. `src/components/ArchiveSearch.astro`: campo, estados, carga diferida y renderizado del
   resultado. Cada instancia recibe su endpoint y sus textos; nunca conoce el otro índice.
3. `src/pages/podcast/indice.json.ts`: mantiene el índice exclusivo de episodios y lo
   adapta al contrato común del componente.
4. `src/pages/noticias/indice.json.ts`: genera el índice exclusivo de noticias a partir de
   `getCollection('news')`.
5. `src/pages/podcast/index.astro` y `src/pages/noticias/index.astro`: montan una instancia
   independiente del componente y señalan sus propios listado y paginación.

Contrato interno propuesto para ambos índices:

```ts
interface ArchiveSearchItem {
  title: string;
  href: string;
  date: string;
  description: string;
  meta?: string;
  searchText: string;
}
```

Compartir el componente y el contrato no mezcla los contenidos: la separación la fijan
el endpoint de cada página y los enlaces que contiene cada índice.

### Bloques de ejecución y reparto entre agentes

| Bloque | Responsable recomendado | Modelo y esfuerzo | Trabajo | Criterio de salida |
|---|---|---|---|---|
| 0. Contrato e integración | Agente principal | `gpt-6-astra`, `low` | Confirmar el contrato, crear la utilidad y el componente compartido, y fijar los selectores DOM que usarán las dos páginas. | API interna estable y componente compilable, sin tocar contenido editorial. |
| 1. Podcast | Subagente Podcast | `gpt-5.6-terra`, `medium` | Migrar la implementación existente al componente, adaptar `podcast/indice.json.ts` y preservar exactamente el alcance de episodios. | `/podcast` busca todo el archivo y ningún resultado puede salir de `/podcast/`. |
| 2. Noticias | Subagente Noticias | `gpt-5.6-terra`, `medium` | Crear `noticias/indice.json.ts`, preparar el texto buscable desde la colección y montar el componente en `/noticias`. | `/noticias` busca todos los campos acordados y ningún resultado puede salir de `/noticias/`. |
| 3. Pruebas y revisión cruzada | Subagente de verificación | `gpt-5.6-sol`, `high` | Añadir pruebas unitarias y de artefactos de build, revisar accesibilidad, separación de índices y regresiones de paginación. No modifica la implementación salvo correcciones acordadas con el agente principal. | Pruebas pertinentes, validación de contenido y build completos sin fallos. |
| 4. Cierre | Agente principal | `gpt-6-astra`, `medium` | Revisar el diff conjunto, resolver solapamientos, hacer prueba manual de ambos flujos y comprobar el estado Git. | Solo cambios del proyecto, informe final y ningún push sin autorización explícita. |

Los bloques 1 y 2 pueden ejecutarse en paralelo una vez cerrado el bloque 0. El bloque 3
empieza cuando ambos estén integrados. Esta división permite especialización sin que dos
agentes editen simultáneamente el componente compartido.

### Pruebas y criterios de aceptación

Las pruebas automatizadas deben demostrar al menos:

1. la normalización elimina diferencias de acentos y mayúsculas;
2. una consulta de varias palabras exige todas las palabras sin exigir su orden;
3. `dist/podcast/indice.json` solo contiene rutas `/podcast/`;
4. `dist/noticias/indice.json` solo contiene rutas `/noticias/`;
5. ambos índices contienen todas las entradas de su colección, no solo la primera página;
6. las portadas conservan listado y paginación en el HTML generado;
7. las páginas de detalle y las páginas numeradas no cambian sus URLs.

Validación final:

```sh
npm run content:validate
npm test
```

Además se hará una comprobación manual en escritorio y móvil de: búsqueda con acentos,
consulta sin resultados, borrado de consulta, navegación por teclado y fallo simulado del
índice.

### Fuera de alcance

- buscador global del sitio;
- resultados combinados de podcast y noticias;
- búsqueda en el Power Ranking;
- filtros, autocompletado, sugerencias o resaltado de términos;
- Pagefind, Algolia, base de datos o API de búsqueda;
- cambios en el contenido editorial o en las URLs públicas;
- publicación o push.

## Pendiente — código

Por orden de prioridad recomendado:

1. **Autodescubrir ediciones del ranking** — sustituir el registro manual del array
   `editions` en `src/lib/power-ranking.ts` por `import.meta.glob` sobre
   `src/data/power-ranking/*/`, ordenando por id descendente. Elimina el paso 3 del runbook
   mensual y la trampa «insertar al final deja la portada en un mes viejo». Actualizar
   `docs/power-ranking.md` al hacerlo.
2. **JSON-LD** — `PodcastSeries` en la home y `PodcastEpisode` en `/podcast/[slug]`
   (Google muestra player en resultados). Va en `BaseLayout` o en las páginas.
3. **Identidad tipográfica** — todo es Inter y queda anónimo. Decisión pendiente: familia
   display solo para H1/H2 (serif editorial o geométrica) o Inter con tracking negativo y
   pesos más extremos en títulos grandes. Requiere decisión de David con propuestas visuales.
4. **Tipado del pipeline del ranking** — hoy casi todo es `any`. Definir interfaces
   `Edition`/`Project`/`RankingRow`, y en build avisar si una clave de `notes` del editorial
   no casa con ningún slug del podio (la trampa más probable cada mes).
5. **Separar Vis Bélica a su propia ruta** (`/power-ranking/belica/…`) — reduce la página a
   la mitad. Tiene más sentido hacerlo cuando se monte visbelica.com (el repo se diseñó
   para clonarse: cambiar `tokens.css` y el feed en `src/lib/rss.ts`).
6. **Página por juego** (`/power-ranking/juego/[slug]`) — historial completo con enlace
   permanente, oro para compartir en Telegram. Los datos ya están en `games[id].history`.

## Pendiente — contenido (David)

Lo único que hoy hace parecer el sitio inacabado. Placeholders visibles en producción:

- `/sobre` — descripción del proyecto, presentación, filosofía.
- `/barton` — o contenido propio, o enlazar el menú directamente a campamentobarton.com y
  eliminar la página.
- `/aviso-legal` y `/privacidad`.
- Decidir la descripción canónica de Telegram (¿grupo o canal?) y las cifras oficiales
  (miembros, suscriptores): hoy la home y `/comunidad` dicen cosas distintas en las
  descripciones largas (los href/label ya están centralizados en `config.ts`; los textos
  descriptivos siguen inline en cada página, a propósito).

## Detalles menores detectados y no resueltos

- Tarjeta de episodio con tres enlaces al mismo destino; mejor enlace «estirado» y renombrar
  «Escuchar episodio →» (no reproduce, lleva a la página) a «Ver episodio».
- Pestañas del ranking sin `aria-controls`/ids de panel ni navegación con flechas.
- Unificar plantilla de paginación de `/podcast` (página 1 y página N tienen headers
  distintos).
- El hero de la home es plano (en móvil, solo texto sobre blanco); candidato a incrustar el
  último episodio o darle fondo de marca.
- Iconos SVG duplicados entre `escuchar.astro` y `CommunityCard.astro`; en `/comunidad` las
  plataformas usan icono genérico `link`.
- El editorial anual de julio cita «0,975» (escala acumulada del Palmarés, distinta del
  índice ×100); revisar cómo citar el Palmarés en prosa en próximas ediciones.
