# Restricciones de integración para una futura sección de noticias

## Restricción 01 — Renderizado estático

**CONFIRMADO.** Astro genera el sitio estáticamente y publica `dist/` como assets Cloudflare.

La sección debe generar listados y detalles en build. No introducir SSR, base de datos ni CMS.

## Restricción 02 — Rutas y slugs

**CONFIRMADO.** Rutas dinámicas con `getStaticPaths`; podcast usa `/podcast/[slug]`.

La nueva implementación debe usar `/noticias/[slug]` y `/noticias`. Slugs editoriales explícitos, únicos y estables, no recalculados desde fuente externa.

## Restricción 03 — Layout y SEO

**CONFIRMADO.** `BaseLayout.astro` recibe `title`, `description`, `image` y `type`; genera canonical y sociales.

Cada noticia debe usarlo; detalle con `type="article"`. No duplicar sus metadatos.

## Restricción 04 — Navegación y visual

**CONFIRMADO.** Header/Footer entran por `BaseLayout`; navegación, responsive y modo oscuro están resueltos.

Añadir Noticias al arreglo de Header. Usar `.container`, `.section`, `.label`, `.btn`, `.prose`, CSS scoped y `var(--*)`. No añadir Tailwind/tokens paralelos.

## Restricción 05 — Componentes

**CONFIRMADO.** No hay componente de noticia; `EpisodeCard.astro` y el detalle podcast son los patrones cercanos.

**RECOMENDADO.** Crear tarjeta de noticia tipada, no forzar `Episode`. Cuerpo rico con `.prose`.

## Restricción 06 — Imágenes

**CONFIRMADO.** Assets locales en `public/`; no `astro:assets` ni optimización.

**RECOMENDADO.** Mientras siga el patrón actual, portadas en `public/images/versions/` por ID estable. News referencia la portada Version sin copiarla.

**PENDIENTE.** Política de volumen, caché y posible almacenamiento/optimización antes de carga masiva.

## Restricción 07 — Colecciones y relaciones

**CONFIRMADO.** No hay Content Collections; Astro 6 expone `defineCollection`.

**RECOMENDADO.** Crear `games`, `versions`, `organizations` y `news` con esquema validado único. Separar ID estable del slug. Guardar relaciones por ID/referencia y resolver en build, sin entidades completas anidadas. N↔N con rol como `{ organization, role }`.

**PENDIENTE.** Fijar/probar API exacto de referencias de Astro 6.3.3 antes de datos reales.

## Restricción 08 — BoardGameGeek

**CONFIRMADO.** No existe BGG ni patrón que condicione IDs.

**RECOMENDADO.** `bgg_id` en Game y `bgg_version_id` en Version son campos de dominio, no slugs/ficheros. Expansiones y reimplementaciones son relaciones Game.

## Restricción 09 — RSS y build

**CONFIRMADO.** Home y podcast dependen de Captivate durante build.

No aumentar dependencia de red. Publicador futuro valida build completo y contempla fallo RSS.

## Restricción 10 — Validación y publicación

**CONFIRMADO.** Sin lint/tests/typecheck; `astro check` pide `@astrojs/check` y TypeScript. Rama `main`, sin CI/preview en repo.

**RECOMENDADO.** Añadir validación reproducible en ticket específico. Publicador: datos/activos en rama, build, PR y merge revisado.

**PENDIENTE.** Confirmar trigger de producción, producto Cloudflare, staging, healthchecks y rollback.

