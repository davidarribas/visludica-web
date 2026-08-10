# Plan de mejoras — documento de continuidad

Estado del plan de mejoras visuales, de estructura y del Power Ranking surgido de la
revisión de diseño del 10 de agosto de 2026. Sirve para retomar el trabajo en cualquier
sesión futura sin releer aquella conversación.

- [Cómo se trabajó (y conviene seguir)](#cómo-se-trabajó-y-conviene-seguir)
- [Hecho](#hecho)
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
