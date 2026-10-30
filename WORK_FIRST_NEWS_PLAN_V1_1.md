# WORK_FIRST_NEWS_PLAN — Operación editorial de noticias de Vis Ludica

**Versión:** 1.1  
**Fecha:** 9 de septiembre de 2026  
**Estado:** fuente operativa vigente tras piloto real  
**Ámbito:** creación, revisión y preparación para publicación de noticias mediante ChatGPT Work + Codex

---

# 0. Cambios de V1.1

Esta revisión alinea el plan con el flujo operativo real después de más de 20 noticias publicadas.

Cambios principales:

1. `WEB_NEWS_STYLE_V1_3.md` sustituye a V1.2 como criterio editorial.
2. Work queda centrado en investigación, resolución editorial, WEB y TELEGRAM.
3. Codex materializa el contenido en el repositorio Astro, adapta el frontmatter al schema real, incorpora imagen, valida y hace build.
4. `slug` deja de formar parte del frontmatter conceptual.
5. `published_at` es obligatorio y gobierna el orden de publicación.
6. El prefijo `YYYY-MM-DD-` del fichero usa la fecha local de `published_at`.
7. `event` describe el acontecimiento que ya ha ocurrido y justifica la News.
8. Los titulares dejan de intentar resumir por sí solos toda la noticia.
9. El cuerpo no debe terminar duplicando la ficha que Astro renderiza desde `products`.
10. `publisher_es` y `distributor_es` deben conservar funciones comerciales distintas.
11. Si existe `bgg_id`, Astro puede generar un enlace público a BoardGameGeek en la ficha web sin añadir un campo `bgg_url`.

No se introduce ninguna capa nueva de infraestructura.

---

# 1. Propósito

ChatGPT Work es la interfaz editorial principal para las noticias de Vis Ludica.

Su función es transformar una o varias fuentes aportadas por David en:

1. una noticia web canónica resuelta editorialmente;
2. los datos estructurados necesarios para que Codex la materialice en Astro;
3. una adaptación específica para Telegram.

El flujo vigente es:

```text
David aporta fuente(s) + contexto
        ↓
Work investiga
        ↓
decide si existe News
        ↓
resuelve acontecimiento y producto
        ↓
redacta WEB + YAML propuesto
        ↓
redacta TELEGRAM
        ↓
David revisa conversacionalmente
        ↓
Codex trabaja sobre el repositorio Astro
        ↓
Markdown + YAML + imagen
        ↓
validación + tests + build
        ↓
David autoriza publicación web
        ↓
Git + Cloudflare
```

La web es el archivo editorial canónico.

Telegram es una adaptación de distribución.

---

# 2. Fuentes de verdad

Aplicar estas fuentes por este orden.

## Criterio editorial

```text
WEB_NEWS_STYLE_V1_3.md
```

Define:

- qué merece una noticia;
- granularidad;
- agrupaciones;
- tratamiento de fuentes;
- investigación;
- incertidumbre;
- titulares;
- redacción;
- fichas;
- contexto;
- roles comerciales;
- criterio de `event`.

No duplicar innecesariamente esas reglas aquí.

## Contrato técnico

```text
src/content.config.ts
```

Es la fuente técnica de verdad del YAML/frontmatter.

Codex debe comprobar el schema real antes de escribir o modificar una News.

Nunca inventar campos basándose únicamente en ejemplos de estas instrucciones.

## Estado operativo

```text
STATUS.md
```

Define el estado actual del proyecto y cualquier incidencia vigente.

---

# 3. Qué puede recibir Work

Una tarea puede comenzar con:

```text
URL
texto pegado
archivo
varias URLs
URL + texto
URL + aclaración editorial
cualquiera de las anteriores + imagen
```

Las aclaraciones de David tienen valor editorial.

Ejemplos:

```text
Esto es una reposición.

No sabemos que haya salido hoy.

Agrupa todas estas cajas.

La noticia importante es el juego, no la editorial.

Esto no merece una noticia independiente.

Usa esta imagen.
```

No pedir a David:

- IDs internos;
- estructuras técnicas;
- YAML;
- clasificaciones de bases de datos;
- información que Work pueda investigar razonablemente.

---

# 4. Primera decisión: ¿existe una News?

Antes de redactar, aplicar `WEB_NEWS_STYLE_V1_3`.

El resultado puede ser:

```text
NEWS
ARCHIVE
NEEDS_INPUT
FAILED
```

## NEWS

Existe un acontecimiento editorial publicable.

Puede generar:

```text
1 News
varias News
una News multiproducto
```

## ARCHIVE

La información no merece una noticia independiente.

Explicar brevemente a David por qué.

No preparar archivos de producción.

## NEEDS_INPUT

Utilizar únicamente cuando falta una aclaración realmente bloqueante.

No preguntar por:

- precio desconocido;
- duración desconocida;
- edad desconocida;
- ilustrador desconocido;
- otros campos opcionales.

Los datos opcionales no confirmados se omiten.

## FAILED

Reservado para un problema técnico real o una fuente inaccesible cuando impida resolver el hecho.

---

# 5. Comprobar antecedentes antes de crear

Antes de crear una News nueva, revisar el contenido ya publicado cuando el entorno lo permita.

Repositorio:

```text
src/content/news/
```

Buscar de forma sencilla por:

- nombre del juego;
- alias evidentes;
- BGG ID cuando exista;
- editorial;
- expansión o juego base;
- acontecimientos anteriores relacionados.

Objetivo:

- evitar duplicados;
- distinguir corrección de nuevo acontecimiento;
- recuperar antecedentes útiles;
- respetar la continuidad histórica.

No construir una base de datos ni un sistema paralelo.

La colección Markdown publicada sigue siendo la memoria editorial canónica.

---

# 6. Investigación

Investigar según `WEB_NEWS_STYLE_V1_3`.

Principio:

> **Buscar la mejor fuente suficiente, no acumular fuentes.**

Priorizar fuentes apropiadas al dato:

- editorial española;
- distribuidor oficial;
- Asmodee B2B España;
- editorial original;
- campaña oficial;
- BGG para identidad, relaciones y datos generales;
- fuentes secundarias fiables;
- `editorial_input` aportado por David.

No transformar la fuente de descubrimiento en protagonista.

No inventar precisión.

No completar datos por costumbre.

## Roles comerciales

No intercambiar:

```text
editorial
distribuidora
tienda
licenciataria
```

por conveniencia.

Si solo se confirma distribución:

```yaml
distributor_es: ...
```

No deducir automáticamente:

```yaml
publisher_es: ...
```

---

# 7. Producción editorial

Cuando exista News, Work prepara:

```text
WEB
TELEGRAM
```

La versión web se resuelve primero.

Telegram se deriva del hecho ya resuelto, pero se redacta específicamente para el canal.

No investigar dos veces el mismo acontecimiento.

---

# 8. Versión web canónica

La News web está formada por:

```text
YAML frontmatter
+
cuerpo Markdown
```

El cuerpo es narración editorial.

El YAML conserva la información estructurada.

Regla:

> **No duplicar manualmente en el cuerpo la ficha que Astro genera desde `products`.**

El cuerpo puede utilizar precio, jugadores, duración o edad cuando sean relevantes para explicar el producto o el acontecimiento, pero no debe terminar con una recapitulación automática de esos datos.

---

# 9. Titular, summary y lead

Aplicar `WEB_NEWS_STYLE_V1_3`.

Principio operativo:

```text
TÍTULO
→ identifica

SUMMARY
→ informa del núcleo de la noticia

LEAD
→ desarrolla el hecho

CUERPO
→ explica juego, cambios y antecedentes
```

No obligar al titular a contener:

```text
juego + castellano + editorial + acontecimiento + fecha
```

Formas válidas:

```text
Kado

AXIA: Slayer Combo, publicado por PIF Games

Preventa de Azul Kids

Reposición de Deductio

Los Hombres Lobo de Castronegro celebra sus 25 años con una edición especial
```

Evitar como plantilla automática:

```text
[Juego] llegará en castellano de la mano de [Editorial]
```

---

# 10. YAML

Antes de materializar una News:

> **Codex debe leer `src/content.config.ts` y respetar exactamente el schema vigente.**

El contrato conceptual actual incluye información de este tipo:

```yaml
schema: visludica-news-v1

title:
summary:
date:
published_at:
event:

image:
  src:
  alt:

products:
  - name:
    type:
    parent:
    bgg_id:
    designers:
    publisher_es:
    distributor_es:
    players_min:
    players_max:
    duration_min:
    duration_max:
    age_min:
    price_eur:
    release_date:
    language:

tags:
```

Este bloque es una referencia conceptual.

`src/content.config.ts` decide:

- nombres exactos;
- tipos;
- obligatoriedad;
- valores admitidos.

## Reglas

No escribir:

```text
N/D
Desconocido
Por determinar
null
```

como sustituto de información editorial ausente.

Si un campo opcional no está confirmado:

```text
se omite
```

No inventar:

- BGG ID;
- precio;
- fecha;
- jugadores;
- autoría;
- editorial;
- distribuidor;
- juego base;
- relaciones entre productos.

---

# 11. `published_at`

`published_at` es obligatorio.

Formato:

```yaml
published_at: 2026-09-09T21:21:00+02:00
```

Funciones:

- determina el orden exacto descendente de las noticias;
- permite ordenar varias publicaciones del mismo día;
- representa cuándo publica Vis Ludica;
- no se muestra públicamente.

No utilizar una fecha comercial futura como sustituto de `published_at`.

---

# 12. `event`

Regla:

> **`event` describe el acontecimiento que ya ha ocurrido y justifica publicar la News ahora.**

Ejemplos:

```text
Hoy se anuncia que saldrá el 24 de septiembre
→ announcement

Hoy se abre la reserva
→ preorder

Ya está disponible
→ release

Vuelve a estar disponible
→ restock
```

No utilizar:

```text
release
```

solo porque exista una fecha futura de lanzamiento.

La fecha futura pertenece a:

```yaml
date:
release_date:
```

cuando el schema lo permita.

---

# 13. Productos

`products` permite almacenar uno o varios productos dentro de una misma News.

### Enlace público a BoardGameGeek

Si un producto tiene `bgg_id`, Astro debe poder mostrar en su ficha web un enlace de referencia a BoardGameGeek.

El enlace se deriva del propio ID:

```text
https://boardgamegeek.com/boardgame/<bgg_id>
```

Ejemplo:

```yaml
bgg_id: 428317
```

produce conceptualmente:

```text
https://boardgamegeek.com/boardgame/428317
```

Reglas:

- no crear `bgg_url`;
- no guardar el slug de BGG;
- no insertar el enlace manualmente en el cuerpo Markdown;
- no mostrar enlace si no existe `bgg_id`;
- este enlace es una referencia del producto, no una atribución de la noticia ni una lista de fuentes;
- Telegram continúa sin enlaces externos por defecto.

Una noticia individual:

```yaml
products:
  - name: "Nombre del juego"
```

Una noticia agrupada:

```yaml
products:
  - name: "Producto A"
  - name: "Producto B"
  - name: "Producto C"
```

La agrupación se decide según `WEB_NEWS_STYLE_V1_3`, no por la estructura del catálogo de una distribuidora.

Usar `parent` únicamente cuando la relación con el juego base sea real y útil.

---

# 14. Tags

Los `tags` sirven para recuperar contenido.

Utilizar etiquetas legibles y razonablemente estables.

Pueden incluir cuando resulte útil:

- nombre de la línea;
- serie;
- franquicia;
- familia editorial;
- concepto relevante para futuras búsquedas.

No convertir `tags` en una taxonomía exhaustiva.

No añadir variantes redundantes únicamente para SEO.

---

# 15. Cuerpo web

Aplicar íntegramente `WEB_NEWS_STYLE_V1_3`.

Estructura habitual:

```text
hecho actual
↓
qué producto es / qué cambia
↓
contexto relevante
↓
antecedentes cuando ayuden a entender el presente
```

No existe una longitud fija.

El juego es el protagonista de las noticias de producto.

No incluir al final:

- fuentes;
- notas de investigación;
- razonamiento;
- clasificación interna;
- comentarios para David;
- ficha manual duplicada.

El contenido público termina con la noticia y las fichas renderizadas por Astro.

---

# 16. Versión Telegram

Telegram debe redactarse específicamente para el canal.

No debe ser:

- un resumen automático;
- el cuerpo web recortado;
- una copia del `summary`;
- una llamada comercial.

## Estructura preferida

```text
[CATEGORÍA] Nombre del juego

Primer párrafo breve con el acontecimiento.

Uno o dos párrafos adicionales cuando sean necesarios.

Ficha práctica cuando aporte valor.

Hasta cuatro hashtags cuando sean útiles.
```

## Reglas Telegram

- menos de 1.000 caracteres;
- objetivo habitual aproximado de 700–900;
- categoría al comienzo;
- uno o dos párrafos breves;
- lenguaje natural;
- mismo rigor factual que la web;
- ficha práctica cuando aporte valor;
- sin emojis por defecto;
- máximo recomendado de cuatro hashtags;
- sin fuentes;
- sin YAML;
- sin razonamiento;
- sin lenguaje promocional;
- sin llamadas del tipo «reserva ya», «no te lo pierdas» o equivalentes.

Los datos de la ficha proceden del mismo contenido estructurado que la web.

## Noticias multiproducto

No convertir Telegram en una sucesión de fichas enormes.

Priorizar:

- explicar la oleada;
- identificar los productos;
- conservar únicamente los datos prácticos realmente útiles.

---

# 17. Imagen

La imagen no forma parte del trabajo editorial textual de Telegram.

Para la web, utilizar:

```text
imagen proporcionada por David
o
imagen/portada oficial disponible
```

Codex no debe generar imágenes mediante IA como sustituto automático.

Ubicación:

```text
public/images/news/
```

La imagen debe tener:

```yaml
image:
  src:
  alt:
```

con `alt` descriptivo y neutral.

No generar automáticamente:

- versiones Telegram;
- thumbnails especiales;
- overlays;
- titulares;
- composiciones;
- múltiples formatos.

---

# 18. Revisión conversacional

David puede corregir mediante lenguaje natural.

Ejemplos:

```text
Acorta Telegram.

Deja el título solo con el nombre del juego.

Pon “Preventa de...”.

La editorial está teniendo demasiado protagonismo.

Este dato no está confirmado.

Añade el antecedente de la campaña anterior.

Quita el precio del cuerpo.

Agrupa estos tres productos.

Separa este producto en otra noticia.
```

Work debe aplicar la corrección al mínimo contenido necesario.

Cuando una corrección factual afecte tanto a web como a Telegram:

```text
corregir ambas
```

Cuando sea exclusivamente de canal:

```text
modificar solo ese canal
```

No recrear un historial editorial paralelo.

Git conserva el historial cuando Codex materializa los archivos.

---

# 19. Modos de trabajo

## «Procesa…»

Cuando David diga:

```text
Procesa esta URL.
Haz la noticia.
Prepara esto.
```

Work:

1. investiga;
2. decide si existe News;
3. prepara WEB;
4. propone YAML estructurado;
5. prepara TELEGRAM;
6. indica cualquier dato realmente bloqueante.

Por defecto:

> **no escribir ni publicar.**

Primero presentar el resultado para revisión.

## «Llévalo a Codex» / materialización local

Codex:

1. inspecciona el repositorio;
2. lee `src/content.config.ts`;
3. adapta el YAML propuesto al schema real;
4. crea o actualiza el Markdown;
5. incorpora la imagen;
6. comprueba la convención de nombre;
7. ejecuta validaciones;
8. ejecuta tests relevantes;
9. ejecuta build;
10. informa del resultado.

No hacer push automáticamente.

## «Publica web»

Solo ante instrucción explícita equivalente a:

```text
Publica.
Publica la web.
Haz push.
Súbelo.
```

Codex puede ejecutar:

```text
validación
→ tests
→ build
→ Git
→ push
→ Cloudflare
```

si el entorno y permisos lo permiten.

No interpretar:

```text
está bien
me gusta
perfecto
adelante con el texto
```

como autorización inequívoca de publicación.

## Telegram

Durante esta fase:

```text
Work redacta
David publica manualmente
```

---

# 20. Escritura en Astro

Ubicación:

```text
src/content/news/
```

Imágenes:

```text
public/images/news/
```

Una News debe poder existir mediante:

```text
1 Markdown
+
1 imagen cuando corresponda
```

No crear:

```text
JSON paralelo
YAML separado
fichas Game
fichas Version
fichas Organization
Evidence
Drafts
manifiestos
```

salvo que una necesidad real futura lo justifique.

---

# 21. Convención de nombres

Las noticias nuevas utilizan:

```text
YYYY-MM-DD-<slug-descriptivo>.md
```

El prefijo de fecha representa:

> **la fecha local de `published_at`, es decir, cuándo publica Vis Ludica.**

Ejemplo:

```yaml
published_at: 2026-09-09T21:21:00+02:00
release_date: 2026-09-24
```

Nombre:

```text
2026-09-09-fearsome-floors.md
```

No:

```text
2026-09-24-fearsome-floors.md
```

si la News se publica el 9 de septiembre.

La URL pública se deriva del nombre eliminando el prefijo `YYYY-MM-DD-`.

No existe campo `slug` en el frontmatter vigente.

---

# 22. Validación

Después de escribir:

1. consultar los scripts reales de `package.json`;
2. ejecutar validación de contenido;
3. ejecutar tests relevantes;
4. ejecutar build de Astro.

Además, comprobar:

- schema;
- editorial canónica;
- ausencia de enlaces externos arbitrarios en Markdown;
- render correcto del enlace BGG cuando exista `bgg_id`;
- nombre `YYYY-MM-DD-<slug>.md`;
- coherencia entre fecha del fichero y fecha local de `published_at`;
- rutas de imagen;
- URLs públicas.

Si falla algo:

- no publicar;
- explicar el error;
- corregir únicamente lo relacionado con el contenido o cambio realizado;
- no aprovechar el fallo para refactorizar otras áreas.

---

# 23. Publicación web

La publicación actual sigue:

```text
Astro
↓
Git
↓
main
↓
Cloudflare
```

La publicación requiere una orden explícita de David.

Antes del push:

- working tree comprendido;
- no incorporar cambios ajenos;
- contenido válido;
- tests relevantes correctos;
- build correcto.

Después del push, cuando sea posible:

- comprobar que el despliegue termina correctamente;
- comprobar la URL pública.

No modificar contenido editorial después de la aprobación salvo para corregir un fallo explícito.

---

# 24. Salida de Work durante revisión

Cuando exista una News, presentar claramente:

```text
WEB
[pieza web + YAML propuesto]

TELEGRAM
[pieza Telegram]

IMAGEN
[estado solo si es relevante]
```

No acompañar la pieza con una explicación larga del razonamiento.

Si existe algo que David deba decidir, indicarlo de forma breve y concreta.

No mostrar:

- chain of thought;
- dumps técnicos;
- JSON;
- IDs innecesarios.

---

# 25. Cuando no existe News

Si el contenido no supera el umbral editorial:

- no fabricar una pieza;
- no crear Markdown;
- no llenar huecos con contexto para justificarla.

Responder de forma breve:

```text
No la convertiría en News independiente porque [...]
```

Puede indicar si el dato sería útil como antecedente para una futura noticia.

No construir un sistema de archivo específico durante esta fase.

---

# 26. Principio de simplicidad

No implementar ni proponer como parte del flujo normal:

```text
News Core
SQLite editorial
Game/Version/Organization como entidades
Draft Store
DraftVersion
Evidence Store
Intake
EditorialCase
ProductResolution
PublicationGate
Claims
ResearchPackets
knowledge graph
base canónica de juegos
bot Telegram
API editorial propia
agent framework
scraping universal
CMS
backoffice
```

Si aparece una fricción real:

> **resolver primero el problema concreto con la solución más pequeña posible.**

El piloto ha confirmado que las fricciones actuales pueden resolverse con:

```text
guía editorial
schema
validaciones
convenciones simples
```

No diseñar anticipadamente el futuro sistema autónomo.

---

# 27. Objetivo de experiencia

David debe poder iniciar una tarea con algo parecido a:

```text
Procesa esta URL para Vis Ludica.

[URL]
```

y recibir:

```text
noticia web final
+
YAML propuesto
+
versión Telegram final
```

Después debe poder corregir de forma natural:

```text
Acorta Telegram.

Deja el título solo con el nombre.

Pon “Preventa de...”.

Quita esta fecha.

Agrupa estas expansiones.
```

Y finalmente trasladar la pieza a Codex para:

```text
Markdown
+
imagen
+
validación
+
tests
+
build
```

La complejidad técnica no debe formar parte de la experiencia editorial.

---

# 28. Principio final

```text
Work investiga y redacta.
Codex materializa y valida.
Markdown conserva.
YAML estructura.
Astro presenta.
Git controla.
David decide.
```

Después del piloto:

```text
Título identifica.
Summary informa.
Event describe el hecho actual.
Published_at fecha nuestra publicación.
La ficha la renderiza Astro.
La arquitectura no crece sin una fricción real.
```

Si una nueva pieza de infraestructura no es necesaria para esa secuencia, no se añade.
