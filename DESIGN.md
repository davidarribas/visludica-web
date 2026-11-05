---
name: Vis Lúdica
description: Medio en español sobre juegos de mesa modernos — dirección brutalista elegante (rediseño en curso)
colors:
  azul-vis: "#084A88"
  rosa-golpe: "#FF29DB"
  tinta: "#111111"
  blanco: "#FFFFFF"
  # crema: PENDIENTE — fondo de página, tono por decidir
typography:
  logo:
    fontFamily: "Caprasimo, serif"
  # headline: PENDIENTE — fuente de titulares sin decidir (Space Mono es candidata, no decidida)
rounded:
  none: "0px"
components:
  contenedor:
    backgroundColor: "{colors.blanco}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
---

# Design System: Vis Lúdica

> Estado: **dirección para el rediseño**, no descripción de la web actual. La
> web publicada todavía usa el sistema anterior (`src/styles/tokens.css`:
> naranja `#FF6B35`, Inter). El parche de la v2 en `.claude/design-preview/`
> no está aplicado.

## Overview

**Creative North Star: "Brutalismo elegante"**

Estructura visible, tinta franca y sombras duras, pero al servicio de la
lectura. Es un brutalismo contenido: decide con firmeza dónde va cada borde y
cada sombra, y por eso usa pocos. Nada agresivo; la página tiene que leerse
muy bien en móvil y en escritorio.

Descartado: la v1 (bordes negros de 3 px, bloque azul saturado, pie negro),
por «demasiado bestia».

**Key Characteristics:**
- Fondo crema, texto en tinta `#111111`.
- Bordes de tinta de 2 px solo en contenedores.
- Sombras duras y cortas, sin difuminado.
- Esquinas rectas.
- Etiquetas discretas.

## Colors

Paleta corta de marca: azul para acentos, rosa como golpe puntual, tinta y
blanco como base, sobre fondo crema.

### Primary
- **Azul Vis** (#084A88): acentos y texto destacado. Contraste ≈ 9:1 sobre
  blanco; válido para texto.

### Secondary
- **Rosa golpe** (#FF29DB): solo como golpe puntual (un detalle, un subrayado,
  un sello). Nunca superficie grande.

### Neutral
- **Tinta** (#111111): texto, bordes de contenedor y sombras duras.
- **Blanco** (#FFFFFF): superficies de contenedor.
- **Crema** (PENDIENTE): fondo de página; tono por decidir.

### Named Rules
**La regla del rosa.** El rosa es un golpe, no un fondo. **Nunca texto blanco
sobre rosa** (contraste ≈ 3,2:1). Si hay texto sobre rosa, es tinta.

**La regla de la tinta.** `#111111` es una decisión, no un error. No
sustituirla por grises suaves.

## Typography

**Logo:** Caprasimo — **solo** para el logo.
**Titulares:** PENDIENTE. Space Mono aparece en la v2 como candidata, sin
decidir.
**Texto:** PENDIENTE (hoy, Inter Variable).

### Named Rules
**La regla de Caprasimo.** Caprasimo no se usa fuera del logo.

## Elevation & Depth

Profundidad con sombras duras y cortas en tinta, desplazadas y sin
difuminado. No hay sombras ambientales ni difusas.

### Named Rules
**La regla de la sombra dura.** Las sombras duras son una decisión. No
convertirlas en sombras difuminadas ni suavizarlas. Valores exactos
pendientes de fijar en la implementación.

## Shapes

Esquinas rectas (radio 0). Borde de tinta de 2 px **solo en contenedores**
(tarjetas, bloques); no en cada elemento.

## Components

- **Contenedor / tarjeta:** fondo blanco sobre crema, borde de tinta 2 px,
  sombra dura corta, esquinas rectas.
- **Etiquetas:** discretas; no compiten con el titular.

## Do's and Don'ts

- **Do:** priorizar la legibilidad del texto largo en móvil y escritorio.
- **Do:** usar el azul para acentos y texto destacado.
- **Don't:** texto blanco sobre rosa.
- **Don't:** usar el rosa como superficie amplia.
- **Don't:** reemplazar la tinta o las sombras duras por grises suaves o
  sombras difuminadas.
- **Don't:** volver a la v1: bordes de 3 px, bloque azul saturado, pie negro.
- **Don't:** usar Caprasimo fuera del logo.
