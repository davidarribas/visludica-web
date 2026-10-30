# STATUS — Sistema de noticias de Vis Ludica

**Fecha:** 9 de septiembre de 2026  
**Estado:** piloto editorial completado; sistema Work-first validado en uso real y en fase de estabilización ligera

---

# 1. Resumen ejecutivo

La reconducción Work-first se considera validada.

El sistema ha superado el piloto inicial previsto de aproximadamente 10–20 noticias y ya acumula más de 20 piezas reales publicadas.

La conclusión principal del piloto es:

> **No han aparecido problemas que justifiquen reintroducir arquitectura editorial compleja. Las fricciones detectadas son de criterio editorial y convenciones del flujo actual.**

Se mantiene la arquitectura:

```text
ChatGPT Work
→ investigación y redacción
→ WEB + TELEGRAM
→ revisión de David
→ Codex
→ Markdown + YAML + imagen
→ Astro
→ validación/tests/build
→ Git
→ Cloudflare
```

---

# 2. Arquitectura vigente

El sistema editorial anterior basado en News Core sigue fuera del flujo operativo.

## ChatGPT Work

Responsable de:

- evaluar si existe una News;
- investigar;
- aplicar `WEB_NEWS_STYLE_V1_3`;
- redactar la pieza web;
- proponer datos estructurados;
- generar la adaptación específica para Telegram;
- aplicar correcciones editoriales.

## Codex

Responsable de:

- trabajar sobre el repositorio local Astro;
- adaptar el frontmatter al schema real;
- normalizar datos estructurados;
- crear o modificar Markdown;
- incorporar la imagen;
- validar;
- ejecutar tests y build;
- trabajar con Git;
- publicar únicamente bajo instrucción expresa.

## David

Responsable de:

- aportar candidatos, contexto e imágenes;
- corregir el enfoque editorial;
- aprobar el contenido;
- autorizar publicación web;
- publicar manualmente Telegram.

---

# 3. News Core

Repositorio:

```text
/Volumes/Dyson/Vibe/visludica-news-core
```

Estado:

```text
ARCHIVADO
FUERA DEL FLUJO OPERATIVO
```

Tag:

```text
archive/pre-work-first
```

No reactivar para resolver fricciones editoriales del piloto.

No utilizar para noticias nuevas:

- CanonicalNewsBundle;
- SQLite editorial;
- Source/Evidence;
- Intake;
- EditorialCase;
- ProductResolution;
- Draft Store;
- DraftVersion;
- SubmissionService;
- RevisionService;
- PublicationGate;
- CLI editorial.

---

# 4. Astro

Repositorio operativo:

```text
/Volumes/Dyson/Vibe/visludica
```

Noticias:

```text
src/content/news/
```

Imágenes:

```text
public/images/news/
```

Contrato técnico:

```text
src/content.config.ts
```

Astro Content Collections + Zod siguen siendo la red de seguridad del contenido generado por modelos.

---

# 5. Convención de archivos

Las noticias nuevas utilizan:

```text
YYYY-MM-DD-<slug-descriptivo>.md
```

## Regla consolidada tras el piloto

El prefijo `YYYY-MM-DD` representa:

> **la fecha local de publicación de Vis Ludica, derivada de `published_at`.**

No representa la fecha futura de lanzamiento del juego.

Ejemplo:

```yaml
published_at: 2026-09-09T21:21:00+02:00
release_date: 2026-09-24
```

Nombre correcto:

```text
2026-09-09-fearsome-floors.md
```

La URL pública continúa derivándose del nombre eliminando el prefijo de fecha.

---

# 6. Orden de publicación

`published_at` continúa siendo obligatorio y determina el orden exacto descendente en `/noticias/`.

```yaml
published_at: <timestamp ISO 8601 con zona horaria>
```

No se muestra públicamente.

---

# 7. Clasificación `event`

Se consolida la siguiente regla:

> **`event` describe el acontecimiento que ya ha ocurrido y que justifica publicar la News ahora.**

No describe una fase futura del producto.

Ejemplos:

```text
Se anuncia hoy un lanzamiento para el 24 de septiembre
→ announcement

Se abre hoy la preventa
→ preorder

El juego ya está disponible
→ release

El juego vuelve a estar disponible
→ restock
```

La fecha comercial futura se conserva en `date`, `release_date` o el campo técnico correspondiente.

Esta regla corrige una fricción recurrente observada en el piloto, donde algunas noticias de anuncios futuros estaban siendo clasificadas como `release`.

---

# 8. Titulares

El piloto ha mostrado una repetición excesiva de fórmulas como:

```text
[Juego] llegará en castellano de la mano de [Editorial]
[Juego] llega en castellano de la mano de [Editorial]
[Juego] se incorpora al catálogo de [Editorial]
```

La guía editorial se actualiza a `WEB_NEWS_STYLE_V1_3`.

## Principio vigente

> **El título identifica. El `summary` informa.**

El titular no está obligado a condensar juego + edición española + editorial + acontecimiento + fecha.

### Formas válidas

Novedad ordinaria:

```text
Kado
AXIA: Slayer Combo
AXIA: Slayer Combo, publicado por PIF Games
El almacén de Wilmot, de Salt & Pepper Games
```

Preventa:

```text
Preventa de Azul Kids
Preventa de The Hanging Gardens
Preventa de Black Rose Wars: Duel Lex
```

Reposición:

```text
Reposición de Deductio
```

Acontecimiento específico:

```text
Los Hombres Lobo de Castronegro celebra sus 25 años con una edición especial
The Last Squadron, nuevo Microrama de Juegorama
```

No hay que añadir un verbo al titular para demostrar que existe una noticia.

---

# 9. Summary y lead

El `summary` gana peso en el nuevo criterio de titulares.

Secuencia:

```text
TÍTULO
→ identifica

SUMMARY
→ cuenta el núcleo de la noticia de forma autónoma

LEAD
→ desarrolla el hecho con contexto inmediato

CUERPO
→ explica juego, cambios y antecedentes relevantes
```

No se elimina información de la noticia al simplificar titulares: se desplaza al lugar adecuado.

---

# 10. Ficha automática y cuerpo

Astro continúa generando las fichas públicas desde `products`.

## Fricción detectada

Durante el piloto, varias noticias terminaron con párrafos que recapitulaban:

- jugadores;
- duración;
- edad;
- PVP.

Estos datos ya estaban en `products`.

## Regla consolidada

> **El cuerpo Markdown no debe terminar con una ficha manual escrita en prosa.**

Los datos pueden aparecer en la narración cuando aportan significado real:

```text
es un juego independiente para exactamente dos jugadores
la preventa tiene un PVP de 39 euros
esta edición amplía el rango a 1–6 jugadores
```

Pero se evita un cierre rutinario que duplique la ficha automática.

---

# 11. Editorial y distribución

Se mantiene la separación:

```yaml
publisher_es:
distributor_es:
```

## Regla consolidada

No convertir una distribuidora en editorial por comodidad o por aparecer como fuente profesional.

En especial:

- Asmodee B2B puede confirmar distribución y datos estructurados;
- eso no convierte automáticamente a Asmodee en `publisher_es`;
- el rol debe verificarse para cada producto.

---

# 12. Enlaces externos y BGG

La política general sigue siendo no publicar enlaces externos automáticos a las fuentes de investigación.

Se incorpora una excepción controlada:

> **Cuando un producto tenga `bgg_id`, Astro puede mostrar en su ficha web un enlace a BoardGameGeek generado automáticamente desde ese ID.**

No se añade `bgg_url` al schema.

Conceptualmente:

```text
bgg_id: 428317
→ https://boardgamegeek.com/boardgame/428317
```

La validación de Astro debe continuar rechazando enlaces Markdown externos `http://` o `https://` dentro del cuerpo público de News. El enlace BGG se genera en el componente de ficha y no constituye una excepción para enlaces arbitrarios a editoriales, tiendas, medios o fuentes.

Telegram continúa sin enlaces externos por defecto.

---

# 13. Editoras canónicas

Registro:

```text
src/data/publishers.yaml
```

`publisher_es` debe utilizar nombre canónico.

`distributor_es` permanece sin registro paralelo.

No recrear una base de entidades.

---

# 14. Imágenes

Sin cambios.

Regla:

```text
imagen proporcionada por David
o
imagen/portada oficial disponible
```

No generar imágenes mediante IA como sustituto automático.

Telegram continúa utilizando la imagen que David adjunta manualmente.

---

# 15. Telegram

Work genera una adaptación específica para Telegram.

Se mantiene:

- menos de 1.000 caracteres;
- objetivo habitual 700–900;
- categoría al comienzo;
- uno o dos párrafos breves;
- ficha práctica cuando aporte valor;
- sin emojis por defecto;
- máximo recomendado de cuatro hashtags;
- sin fuentes ni enlaces externos;
- sin YAML;
- sin lenguaje promocional.

La publicación sigue siendo manual por David.

---

# 16. Validaciones activas

El sistema debe seguir comprobando:

- schema Zod;
- nombres de archivo `YYYY-MM-DD-<slug>.md`;
- coherencia entre fecha del fichero y fecha local de `published_at`;
- editoriales canónicas;
- ausencia de enlaces Markdown externos arbitrarios;
- render del enlace BGG cuando exista `bgg_id`;
- contenido válido;
- render de noticias;
- URLs públicas;
- tests;
- build Astro.

Se recomienda añadir o reforzar, si todavía no existe, una validación que detecte discrepancias entre la fecha del nombre del fichero y `published_at`.

No se propone ninguna capa adicional de infraestructura.

---

# 17. Resultado del piloto editorial

El piloto inicial fijaba como objetivo producir aproximadamente:

```text
10–20 noticias
```

Ese umbral ya se ha superado.

Las más de 20 noticias publicadas han permitido identificar patrones reales.

## Lo que ha funcionado

- calidad general de investigación;
- tono sobrio;
- juego como protagonista;
- explicación suficiente de mecánicas;
- `summary` útil y autónomo;
- YAML suficientemente expresivo;
- generación de fichas desde `products`;
- flujo Work → Codex → Astro;
- publicación sin News Core;
- ausencia de necesidad de una base editorial adicional.

## Fricciones recurrentes detectadas

1. titulares excesivamente parecidos;
2. uso de `release` para lanzamientos todavía futuros;
3. fechas de fichero confundidas con fechas comerciales;
4. cierres de cuerpo que duplican la ficha;
5. necesidad de vigilar `publisher_es` frente a `distributor_es`;
6. incorporación del enlace público a BGG como excepción controlada y derivada de `bgg_id`.

Todas pueden resolverse con reglas pequeñas.

---

# 18. Próxima fase

El piloto se considera cerrado.

La siguiente fase es:

```text
USO EDITORIAL NORMAL
+
ESTABILIZACIÓN LIGERA
```

No desarrollar nuevas capas.

Observar si las nuevas reglas eliminan las fricciones durante las próximas noticias.

Solo modificar arquitectura cuando aparezca un problema recurrente que no pueda resolverse con:

- guía editorial;
- schema;
- validación;
- convención simple.

---

# 19. Documentación activa

Mantener como contexto permanente:

```text
WEB_NEWS_STYLE_V1_3.md
WORK_FIRST_NEWS_PLAN.md
STATUS.md
```

Cuando sea útil para Work cloud:

```text
src/content.config.ts
```

`WEB_NEWS_STYLE_V1_2.md` pasa a histórico.

Los tickets de reconducción y la documentación de News Core permanecen archivados.

No es necesario modificar el ticket «Reconducción Work-first y retirada de News Core»: su objetivo ya está cumplido y los cambios actuales no afectan a la arquitectura.

---

# 20. Mantenimiento técnico pendiente

Continúa separado del trabajo editorial:

```text
npm audit
→ identificar paquetes afectados
→ distinguir dependencia directa/transitiva
→ distinguir build/dev/runtime
→ comprobar versión corregida
→ aplicar actualización mínima segura
→ tests + build
```

No ejecutar `npm audit fix --force` automáticamente.

---

# 21. Principio vigente

```text
Work investiga y redacta.
Codex materializa y valida.
Markdown conserva.
YAML estructura.
Astro presenta.
Git controla.
David decide.
```

Y tras el piloto:

```text
Título identifica.
Summary informa.
Event describe el hecho actual.
Published_at fecha nuestra publicación.
La ficha la renderiza Astro.
La arquitectura no crece sin una fricción real.
```

**Estado actual: sistema validado en uso real y listo para continuar como flujo editorial normal.**
