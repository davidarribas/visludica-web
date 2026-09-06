# AGENTS.md — Vis Ludica

Este repositorio contiene la web de Vis Ludica construida con Astro.

Codex puede realizar tanto trabajos generales de desarrollo como tareas relacionadas con la publicación de noticias.

## 1. Principio general

Trabaja sobre el sistema existente antes de introducir nuevas abstracciones.

Prioriza:

```text
simplicidad
código existente
convenciones actuales
cambios pequeños
validación real
```

No añadas infraestructura preventiva ni capas para problemas que todavía no existen.

Antes de modificar una parte del proyecto:

1. inspecciona el código relacionado;
2. identifica las convenciones existentes;
3. comprueba el estado Git;
4. evita tocar cambios locales ajenos a la tarea.

---

# 2. Trabajos de código

Para tareas de desarrollo normales puedes:

- crear y modificar componentes Astro;
- modificar TypeScript, JavaScript, CSS y configuración;
- corregir errores;
- implementar funcionalidades;
- refactorizar cuando la tarea lo requiera;
- escribir o actualizar tests;
- ejecutar scripts;
- validar contenido;
- ejecutar builds;
- trabajar con Git.

No limites tu trabajo a las noticias.

## Antes de implementar

Comprueba:

- archivos afectados;
- `package.json`;
- tests existentes;
- convenciones del proyecto;
- configuración actual;
- posibles cambios locales no relacionados.

No asumas comandos ni estructura sin inspeccionarlos.

## Después de implementar

Ejecuta las validaciones reales disponibles para la zona afectada.

Como mínimo, cuando proceda:

```text
tests relevantes
validación de contenido
build
```

Si existe un script específico en `package.json`, úsalo.

No inventes scripts nuevos solo para ejecutar una comprobación que ya puede hacerse con las herramientas existentes.

---

# 3. Git y publicación

No incorpores cambios ajenos a la tarea.

Antes de hacer commit:

- revisa el diff;
- comprueba que solo contiene cambios pertinentes;
- ejecuta las validaciones necesarias.

No hagas push ni publiques en producción salvo instrucción explícita del usuario.

Expresiones como:

```text
está bien
perfecto
me gusta
adelante con el cambio
```

no deben interpretarse automáticamente como autorización para publicar.

Una instrucción explícita como:

```text
haz push
publica
sube los cambios
publica la web
```

sí puede autorizar el flujo de publicación correspondiente.

---

# 4. Sistema de noticias

La arquitectura editorial anterior basada en News Core está retirada.

No recrear ni depender de:

```text
visludica-news-core
CanonicalNewsBundle
Game / Version / Organization como entidades editoriales
SQLite editorial
Draft Store
DraftVersion
Evidence Store
Intake
EditorialCase
ProductResolution
EventResolution
PublicationGate
Claims
ResearchPackets
knowledge graph
API editorial propia
bot Telegram
```

El contenido nuevo de noticias vive directamente en Astro.

---

# 5. Fuente técnica de verdad para noticias

Antes de crear o modificar una noticia, consulta:

```text
src/content.config.ts
src/data/publishers.yaml
```

`src/content.config.ts` define el contrato vigente del frontmatter.

`src/data/publishers.yaml` es el único registro de nombres canónicos de editoriales. Antes de incorporar una noticia, normaliza `publisher_es` usando ese registro. Los aliases solo ayudan a reconocer entradas futuras: el frontmatter debe guardar siempre `name`.

Si una editorial es nueva o la correspondencia resulta realmente ambigua, no inventes la normalización. Informa al usuario y amplía el registro únicamente cuando exista una identificación fiable.

No inventes campos ni mantengas contratos antiguos por compatibilidad preventiva.

Las noticias se almacenan en:

```text
src/content/news/
```

Las noticias nuevas deben usar el nombre `YYYY-MM-DD-<slug-descriptivo>.md`. El slug público se deriva del fichero eliminando únicamente el prefijo de fecha y debe describir el juego o acontecimiento, no incluir sistemáticamente la editorial.

Las imágenes asociadas se almacenan según la convención actual bajo:

```text
public/images/news/
```

Inspecciona siempre ejemplos reales existentes antes de escribir.

---

# 6. Creación de una noticia preparada por Work

Cuando el usuario entregue una noticia ya resuelta editorialmente por ChatGPT Work, Codex debe encargarse de materializarla en el repositorio.

La entrada puede incluir:

```text
YAML/frontmatter propuesto
cuerpo Markdown
imagen
slug descriptivo sugerido
```

Codex debe:

1. leer `src/content.config.ts` y `src/data/publishers.yaml`;
2. normalizar `publisher_es` al nombre canónico sin inventar equivalencias;
3. comprobar noticias existentes para evitar colisiones;
4. adaptar el frontmatter al schema real si fuera necesario;
5. añadir `published_at` con el momento de incorporación en la zona `Europe/Madrid` si el usuario no lo ha proporcionado;
6. crear el Markdown con el nombre `YYYY-MM-DD-<slug-descriptivo>.md`;
7. colocar la imagen en la ubicación correcta;
8. comprobar rutas y referencias;
9. ejecutar validación;
10. ejecutar tests relevantes;
11. ejecutar build;
12. informar del resultado.

No cambies el contenido editorial salvo que sea necesario para cumplir el contrato técnico o el usuario lo solicite.

Si detectas una contradicción editorial o un dato imposible de representar:

> informa al usuario en lugar de inventar una solución factual.

---

# 7. Separación entre contenido y código

Para noticias:

```text
Markdown
→ narración editorial

frontmatter YAML
→ datos estructurados

Astro
→ presentación
```

No dupliques manualmente en el Markdown una ficha que Astro ya genera desde los datos estructurados.

No crees archivos paralelos como:

```text
JSON de la noticia
YAML separado
fichas Game
fichas Version
fichas Organization
manifiestos editoriales
```

salvo petición explícita y justificada.

---

# 8. Contenido histórico

Preserva:

- slugs;
- URLs públicas;
- cuerpos editoriales;
- compatibilidad necesaria para que la web siga funcionando.

No migres ni reescribas contenido histórico salvo que una tarea lo requiera.

No inventes datos ausentes durante una migración.

---

# 9. Imágenes de noticias

## Imágenes de noticias

Codex **no debe generar imágenes para las noticias**.

Nunca utilizar herramientas de generación de imagen como sustituto de una portada, fotografía o material gráfico editorial.

Para una noticia nueva:

1. utiliza la imagen o portada proporcionada por el usuario;
2. si existe una portada oficial ya identificada y disponible como parte de la tarea, puede utilizarse;
3. conserva la imagen sin modificaciones visuales salvo instrucción expresa;
4. colócala en la ruta vigente de `public/images/news/`;
5. utiliza un nombre coherente con el slug;
6. actualiza la referencia correspondiente en el Markdown;
7. comprueba que Astro la renderiza correctamente.

Si no existe una imagen adecuada disponible:

> no generes ninguna.

Solicita al usuario una portada o imagen antes de dar por terminada la incorporación de la noticia.

No crear:

* ilustraciones generadas por IA;
* recreaciones del juego;
* imágenes de sustitución;
* overlays;
* composiciones;
* thumbnails especiales;
* versiones específicas para Telegram;

salvo petición explícita del usuario.

---

# 10. Telegram

Telegram no forma parte del repositorio ni del flujo de Codex actualmente.

ChatGPT Work genera el texto para Telegram.

El usuario lo publica manualmente.

No implementar integración Telegram salvo una nueva decisión explícita del proyecto.

---

# 11. Documentación

Evita crear documentos nuevos de:

```text
continuidad
cierre
propuesta
impacto
arquitectura
```

si la información puede incorporarse a un documento existente.

La documentación activa debe mantenerse pequeña.

Actualiza documentación solo cuando la tarea lo requiera.

---

# 12. Principio de simplificación

Cuando haya dos opciones técnicamente válidas:

> prefiere la que deje menos código, menos estado y menos conceptos permanentes.

No mantengas una arquitectura únicamente porque ya exista históricamente.

No diseñes anticipadamente un futuro sistema de agentes.

Si aparece una necesidad nueva, resuelve primero el problema concreto.

---

# 13. Entrega de tareas

Al terminar un trabajo de código, informa de forma concreta:

- qué has cambiado;
- archivos principales afectados;
- validaciones ejecutadas;
- resultado de tests/build;
- estado Git;
- cualquier incidencia real pendiente.

No hagas una explicación extensa de decisiones triviales.

Si la tarea está completa, termina ahí.
