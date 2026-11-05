---
name: Vis Lúdica
description: Medio en español sobre juegos de mesa modernos — dirección brutalista elegante (v3, decisiones cerradas el 5 nov 2026)
colors:
  crema: "#F3EBD8"
  blanco: "#FFFFFF"
  tinta: "#111111"
  gris-meta: "#3D3D3D"
  azul-vis: "#084A88"
  rosa-golpe: "#FF29DB"
typography:
  logo:
    fontFamily: "Caprasimo, serif"
  headline:
    fontFamily: "Bricolage Grotesque Variable, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.03em"
    lineHeight: "1.0 (H1) · 1.1 (tarjetas)"
  body:
    fontFamily: "Literata Variable, serif"
    fontSize: "20px escritorio · 18px móvil"
    lineHeight: 1.6
    maxWidth: "66ch"
  label:
    fontFamily: "Space Mono, monospace"
    fontSize: "12-13px"
    textTransform: "uppercase (etiquetas)"
  ui:
    fontFamily: "Bricolage Grotesque Variable, sans-serif"
    fontWeight: "500-700"
rounded:
  none: "0px"
shadows:
  contenedor: "4px 4px 0 #111111"
  imagen-noticia: "6px 6px 0 #111111"
  boton: "3px 3px 0 #111111"
components:
  contenedor:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    border: "2px solid {colors.tinta}"
    shadow: "{shadows.contenedor}"
    rounded: "{rounded.none}"
  boton-principal:
    backgroundColor: "{colors.azul-vis}"
    textColor: "{colors.blanco}"
    border: "2px solid {colors.tinta}"
    shadow: "{shadows.boton}"
    minHeight: "44px"
  etiqueta:
    fontFamily: "{typography.label.fontFamily}"
    backgroundColor: "{colors.blanco}"
    border: "1.5px solid {colors.tinta}"
---

# Design System: Vis Lúdica

> Estado: **v3, decisiones cerradas el 5 de noviembre de 2026.** Este documento
> manda sobre cualquier herramienta de apoyo (Impeccable incluido).

## Overview

**Creative North Star: "Brutalismo elegante"**

Estructura visible, tinta franca y sombras duras, pero al servicio de la
lectura. Es un brutalismo contenido: decide con firmeza dónde va cada borde y
cada sombra, y por eso usa pocos. Nada agresivo; la página tiene que leerse
muy bien en móvil y en escritorio.

**Principio de color:** el crema es el neutro y la paleta de marca va solo en
acentos. Nunca toda la página en colores de marca.

Descartado: la v1 (bordes negros de 3 px, bloque azul saturado, pie negro),
por «demasiado bestia».

## Colors

| Token | Valor | Uso |
|---|---|---|
| Crema | `#F3EBD8` | Fondo de página. El neutro. |
| Blanco | `#FFFFFF` | Contenedores, sobre el crema. |
| Tinta | `#111111` | Texto, bordes y sombras duras. |
| Gris de metadatos | `#3D3D3D` | Fechas, créditos, datos secundarios. |
| Azul Vis | `#084A88` | Acentos, enlaces, botón principal. |
| Rosa golpe | `#FF29DB` | Solo los dos golpes descritos abajo. |

### Contrastes sobre crema

| Combinación | Ratio | Veredicto |
|---|---|---|
| Tinta sobre crema | 15,9:1 | Texto |
| `#3D3D3D` sobre crema | 9,2:1 | Texto |
| Azul sobre crema | 7,5:1 | Texto |
| Rosa sobre crema | 2,7:1 | **Nunca texto rosa** |
| Tinta sobre rosa | 5,9:1 | Válido |
| Blanco sobre rosa | — | **Prohibido** |

### Named Rules

**La regla del rosa.** El rosa solo da dos golpes: el subrayado de 4 px bajo la
sección activa del menú y un cuadrado de 14 px con borde de tinta delante de
los títulos de sección. Nunca texto rosa, nunca superficie amplia, nunca texto
blanco sobre rosa.

**La regla de la tinta.** `#111111` es una decisión, no un error. No
sustituirla por grises suaves. El único gris es `#3D3D3D`, para metadatos.

## Typography

| Papel | Fuente | Detalle |
|---|---|---|
| Logo | Caprasimo | **Solo** el logo, en azul. |
| Titulares | Bricolage Grotesque | Peso 800, `letter-spacing: -0.03em`, `line-height` ≈ 1,0 en H1 y ≈ 1,1 en tarjetas. |
| Texto largo | Literata (serif) | ≈ 20 px en escritorio y ≈ 18 px en móvil, `line-height` ≈ 1,6, medida máxima ≈ 66ch. |
| Etiquetas, fechas, datos de ficha | Space Mono | 12–13 px; mayúsculas en las etiquetas. |
| UI (navegación, botones) | Bricolage Grotesque | Pesos 500–700. |

Las fuentes se autoalojan (`@fontsource` / `@fontsource-variable`, subconjunto
latino, `font-display: swap`). Nada de Google Fonts en producción. Se precargan
solo Bricolage (titulares) y Literata regular.

### Named Rules

**La regla de Caprasimo.** Caprasimo no se usa fuera del logo.

## Elevation & Depth

Profundidad con sombras duras en tinta, desplazadas y sin difuminado:

- Contenedores: `4px 4px 0 #111`.
- Imagen principal de una noticia: `6px 6px 0 #111`.
- Botón principal: `3px 3px 0 #111`.

### Named Rules

**La regla de la sombra dura.** No convertirlas en sombras difuminadas ni
suavizarlas. No hay sombras ambientales.

## Shapes

Esquinas rectas (radio 0). Borde de tinta de 2 px **solo en contenedores**
(tarjetas, bloques); 1,5 px en etiquetas.

## Components

- **Contenedor / tarjeta:** fondo blanco sobre crema, borde de tinta 2 px,
  sombra `4px 4px 0 #111`, radio 0.
- **Botón principal:** fondo azul, texto blanco, borde de tinta 2 px, sombra de
  3 px, altura mínima de 44 px.
- **Etiquetas:** Space Mono sobre blanco, borde de tinta de 1,5 px, mayúsculas.
- **Cabecera:** blanca, con borde inferior de tinta. Sección activa del menú
  con subrayado rosa de 4 px.
- **Títulos de sección:** precedidos por un cuadrado rosa de 14 px con borde
  de tinta.
- **Pie:** sobre crema, con borde superior de tinta. **Nunca pie negro.**

## Modo oscuro

Sin paleta oscura decidida. Ver la solución provisional en el PR del
rediseño; la decisión está pendiente.

## Do's and Don'ts

- **Do:** priorizar la legibilidad del texto largo en móvil y escritorio.
- **Do:** dejar el crema como neutro y la marca en los acentos.
- **Do:** usar el azul para acentos, enlaces y el botón principal.
- **Don't:** texto rosa, texto blanco sobre rosa, rosa como superficie.
- **Don't:** pintar toda la página en colores de marca.
- **Don't:** reemplazar la tinta o las sombras duras por grises suaves o
  sombras difuminadas.
- **Don't:** volver a la v1: bordes de 3 px, bloque azul saturado, pie negro.
- **Don't:** usar Caprasimo fuera del logo.
