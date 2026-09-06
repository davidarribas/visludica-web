# Cierre de la fase pública Astro News V1

## Estado

```text
Astro News Public Model V1
FROZEN
```

Se completan NEWS-ASTRO-001, NEWS-ASTRO-002, NEWS-ASTRO-003 y NEWS-ASTRO-004.
Astro ya representa el modelo relacional, valida referencias, genera rutas
estáticas, resuelve relaciones, renderiza el corpus editorial, hereda imágenes
cuando existen y admite fechas parciales y `editorial_input` sin URL.

## Inventario y limpieza

Antes de esta limpieza había 17 Games, 15 Versions, 2 Organizations y 16
News. Se detectaron como fixtures públicos de NEWS-ASTRO-001/002:

- Games: `game-a-base`, `game-b-expansion`, `game-c-reimplementation`.
- Organizations: `organization-a`, `organization-b`.
- Versions: `game-a-spanish-edition`, `game-b-spanish-announced`.
- News: `game-a-spanish-announcement`, `game-a-spanish-preorder`,
  `game-b-expansion-announcement`.

Se eliminaron de `src/content/`. Su cobertura técnica vive ahora en
`tests/fixtures/news-graph-v1.mjs`, que no es cargado por Astro: relaciones,
Organization, reimplementación, Version sin BGG ID, slugs, imágenes heredada /
propia / ausente y referencias rotas siguen verificándose sin crear páginas.
La colección pública `organizations` queda legítimamente vacía hasta que haya
una organización editorial confirmada; el validador conserva la comprobación
estricta si una Version llega a referenciarla.

También se retiraron temporalmente las News, Games y Versions de Deepvale y
Pack de mutaciones: V1 no puede asignarles `expansion` o `accessory` de forma
confirmada con los datos suministrados.

Inventario público final: 12 Games, 11 Versions, 0 Organizations y 11 News.
Fixtures técnicos públicos: **0**.

## Conteo de páginas

El build anterior de NEWS-ASTRO-003 produjo 321 páginas:

| Componente | Páginas |
| --- | ---: |
| Rutas anteriores al sistema de noticias | 304 |
| `/noticias` | 1 |
| Detalles News: 13 editoriales + 3 fixtures | 16 |
| Otras rutas generadas por noticias | 0 |
| **Total anterior** | **321** |

El total esperado tras la limpieza es 316:

| Componente | Páginas |
| --- | ---: |
| Rutas anteriores al sistema de noticias | 304 |
| `/noticias` | 1 |
| Detalles editoriales públicos | 11 |
| Otras rutas generadas por noticias | 0 |
| **Total esperado** | **316** |

## Pendientes editoriales

| Asunto | Estado | Decisión |
| --- | --- | --- |
| Fuentes, fechas, IDs y organizaciones originales | NEEDS_EDITORIAL_RESEARCH | Permanecen ausentes; no hay URL ni fecha ficticia. |
| Deepvale / Pack de mutaciones | NEEDS_EDITORIAL_RESEARCH | Retirados temporalmente del contenido público hasta confirmar identidad y relación comercial. |
| Expansión de TerrorScape | PARTIALLY_RESOLVED | La primera edición española del juego base sigue publicada; no se crea expansión sin nombre y acontecimiento confirmados. |
| Thunder Road: Vendetta — Extra Ammo | PARTIALLY_RESOLVED | La Version comercial y su reposición están confirmadas; la etiqueta pública REEDICIÓN frente a REPOSICIÓN requiere criterio editorial. |

## Contrato y próxima fase

[CONTENT_MODEL_V1.md](./CONTENT_MODEL_V1.md) es el contrato público
congelado. [NEWS_CORE_ASTRO_CONTRACT_V1.md](./NEWS_CORE_ASTRO_CONTRACT_V1.md)
define lo que deberá producir `visludica-news-core`; no se ha iniciado su
implementación.

## Deuda conocida

- El validador depende del almacén interno de Astro 6.3.3 y `devalue`.
- Política masiva de imágenes pendiente.
- Resiliencia de Captivate pendiente.
- CI/typecheck y despliegue siguen sin automatizar.
