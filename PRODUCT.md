# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Aficionados a los juegos de mesa modernos que hablan español. Llegan desde
redes, Telegram o el feed del podcast para tres cosas: leer noticias, escuchar
episodios y votar en el Power Ranking mensual. La tarea principal es **leer**:
la mayoría de las visitas son de lectura, muchas desde el móvil.

## Product Purpose

Vis Lúdica es un medio en español sobre juegos de mesa modernos. La web reúne
sus tres contenidos vivos —noticias, podcast y Power Ranking— y debe hacer que
leerlos sea cómodo y rápido tanto en móvil como en escritorio. El éxito es que
la gente lea, escuche y vuelva a votar cada mes.

## Positioning

Un medio con voz propia y comunidad: el Power Ranking lo vota la comunidad cada
mes y el podcast tiene un reparto coral. No es un agregador de notas de prensa.

## Operating Context

- **Noticias:** Markdown en `src/content/news/`, con portada en
  `public/images/news/`.
- **Podcast:** episodios del feed de Captivate, incorporados con
  `npm run podcast:refresh`.
- **Power Ranking:** votación mensual de la comunidad; los resultados se
  importan desde el repositorio del motor (`docs/power-ranking.md`).
- Publicación: un push a `main` despliega producción (GitHub Actions →
  Cloudflare).

## Capabilities and Constraints

- Sitio estático construido con Astro.
- El formulario de voto que se muestra lo decide
  `src/data/power-ranking/participation.mjs`; cambiarlo es una decisión
  editorial, no de diseño.
- Rediseño en curso: dirección brutalista elegante, v3 cerrada el 5 nov 2026
  (ver DESIGN.md).

## Brand Commitments

- Nombre: Vis Lúdica. Idioma: español.
- Logo compuesto en Caprasimo.
- Colores de marca: azul `#084A88`, rosa `#FF29DB`, tinta `#111111`, blanco.

## Evidence on Hand

- Noticias reales con portadas oficiales en `src/content/news/` y
  `public/images/news/`.
- Episodios reales del podcast en `src/data/podcast/`.
- Resultados reales del Power Ranking en `src/data/power-ranking/`.
- No inventar testimonios, cifras de audiencia ni portadas: las imágenes de
  noticias nunca se generan (AGENTS.md §9).

## Product Principles

1. Leer primero: el texto manda sobre la decoración.
2. Móvil y escritorio por igual; ninguno es secundario.
3. La personalidad está en los detalles, no en el ruido.
4. La votación es un hecho real en curso: claridad antes que estilo.

## Accessibility & Inclusion

Contraste suficiente para lectura larga (WCAG AA como mínimo en texto),
navegación por teclado y foco visible, imágenes con texto alternativo y
dimensiones declaradas.
