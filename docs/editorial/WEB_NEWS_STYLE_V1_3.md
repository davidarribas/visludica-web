# WEB_NEWS_STYLE_V1_3 — Metodología editorial para noticias web de Vis Ludica

**Versión:** 1.3  
**Fecha:** 9 de septiembre de 2026  
**Estado:** estable; revisión tras piloto real de más de 20 noticias  
**Ámbito:** noticias web de Vis Ludica sobre publicaciones de juegos de mesa en español

---

## 0. Cambios de V1.3

Esta revisión no modifica la arquitectura editorial. Consolida fricciones detectadas durante el piloto real.

Cambios principales:

1. **Titulares más secos y menos formulaicos.**
   - Se elimina la expectativa de que el titular tenga que resumir por sí solo juego + edición española + editorial + acontecimiento + fecha.
   - El título identifica; el `summary` informa.
   - Se evita la muletilla repetitiva «[Juego] llegará en castellano de la mano de [Editorial]».
   - Un título formado solo por el nombre del juego puede ser válido cuando el contexto y el `summary` ya explican el acontecimiento.
   - Cuando el acontecimiento es lo relevante, se expresa de forma directa: `Preventa de...`, `Reposición de...`, `Nueva edición de...`, etc.

2. **`event` describe el acontecimiento que ya ha ocurrido y justifica publicar la News.**
   - No describe una fase futura del producto.
   - Una noticia publicada hoy que anuncia un lanzamiento para dentro de dos semanas es `announcement`, no `release`.
   - Si hoy se abren reservas, es `preorder`, aunque el lanzamiento sea posterior.

3. **El prefijo de fecha del fichero representa la publicación de Vis Ludica.**
   - `YYYY-MM-DD-<slug>.md` utiliza la fecha local de `published_at`.
   - La fecha comercial del producto se conserva en `date`, `release_date` u otros campos equivalentes.

4. **No duplicar la ficha automática en el cuerpo.**
   - El cuerpo no debe cerrar recapitulando jugadores, duración, edad y PVP si esos datos ya están en `products`.
   - Solo se incorporan a la prosa cuando ayudan a explicar el acontecimiento o una característica distintiva.

5. **Mantener la precisión entre editorial y distribuidora.**
   - `publisher_es` y `distributor_es` no se intercambian por comodidad.
   - Si una fuente solo confirma distribución, no se debe convertir al distribuidor en editorial.

6. **BGG pasa a ser una excepción pública controlada.**
   - Si existe `bgg_id`, Astro puede mostrar en la ficha del producto un enlace a BoardGameGeek.
   - La URL se deriva del ID; no se añade un campo `bgg_url`.
   - Esta excepción no permite enlaces externos arbitrarios en el cuerpo Markdown ni convierte la noticia en un listado de fuentes.

---

## 1. Propósito

Este documento define qué considera Vis Ludica una noticia web correctamente investigada, seleccionada y redactada.

La web es el archivo editorial canónico. Telegram y otros canales son adaptaciones de distribución.

La secuencia conceptual es:

```text
FUENTES / DESCUBRIMIENTO
        ↓
HECHOS Y EVIDENCIAS
        ↓
DECISIÓN EDITORIAL: ¿MERECE NEWS?
        ↓
RESOLUCIÓN DE PRODUCTO + ACONTECIMIENTO
        ↓
NOTICIA WEB CANÓNICA
        ↓
ADAPTACIONES DE CANAL
```

La noticia debe poder entenderse de forma autónoma aunque el lector llegue desde un buscador, una página de juego, Telegram o una consulta realizada meses después.

---

## 2. Principio editorial central

> **La noticia debe trasladar de forma comprensible toda la información que resulte editorialmente relevante para entender el juego y el acontecimiento, sin convertirse en publicidad, reseña ni ficha exhaustiva.**

Vis Ludica informa a aficionados y consumidores. No escribe para vender productos ni para ayudar a venderlos.

La extensión no se decide por una plantilla ni por una cifra de palabras. Una reposición puede necesitar dos párrafos y una reedición compleja, un relanzamiento de crowdfunding o una situación con antecedentes puede necesitar bastante más.

**Contexto selectivo no significa contexto mínimo.** Significa incluir el contexto que ayuda realmente a entender el hecho y descartar el que solo rellena, promociona o desvía la pieza.

---

## 3. Neutralidad editorial

La neutralidad no consiste en escribir de forma fría. Consiste en no adoptar el objetivo comercial de la fuente.

### La noticia sí debe

- identificar con claridad el hecho;
- explicar el producto lo suficiente para situarlo;
- distinguir lo confirmado, lo provisional y lo desconocido;
- explicar cambios, compatibilidades, antecedentes o condiciones cuando sean relevantes;
- conservar información práctica útil para el aficionado;
- utilizar lenguaje natural para lectores de juegos de mesa.

### La noticia no debe

- reproducir entusiasmo promocional;
- exagerar la relevancia;
- inventar un «por qué importa»;
- recomendar comprar, reservar, apoyar o actualizar;
- convertir una ventaja comercial en valoración editorial;
- presentar previsiones como hechos consumados;
- copiar sin filtro el lenguaje de marketing de una editorial, tienda, campaña o creador de contenido.

Evitar como voz propia expresiones del tipo:

```text
una experiencia única
una aventura inolvidable
la batalla definitiva
imprescindible
espectacular
no te lo puedes perder
prepárate para
```

---

## 4. Antes de redactar: decidir si existe una News

Detectar información nueva no obliga a publicar una noticia.

La primera decisión editorial es:

> **¿Este hecho tiene suficiente relevancia para convertirse en una News independiente?**

### Normalmente sí supera el umbral

- anuncio de una edición o publicación en español;
- apertura de preventa o reservas con efecto comercial real;
- lanzamiento o llegada a tiendas;
- reposición de una edición agotada;
- expansión o nueva edición relevante;
- crowdfunding y relanzamientos de crowdfunding;
- retraso, cancelación o cambio de fecha;
- cambio sustancial de contenido, componentes, compatibilidad o condiciones;
- corrección de erratas relevante, material corregido o cambio que afecte a cómo se juega o a lo que posee el comprador;
- cambios comerciales que alteren de forma real la disponibilidad u opciones del consumidor.

### Normalmente no genera una News por sí solo

- una carta promocional aislada de feria;
- un sorteo;
- una sesión de firmas;
- una demo ordinaria;
- una nueva fotografía del producto;
- un prototipo de fábrica;
- un pequeño avance de producción;
- un vídeo, reseña, unboxing o entrevista cuyo único hecho sea que se ha publicado;
- una promoción menor sin otro acontecimiento editorial relevante.

Estos hechos pueden conservarse internamente como evidencia o seguimiento y ser útiles para una noticia posterior.

### Regla de utilidad

> **Una información secundaria puede ser relevante dentro de una News sin tener entidad suficiente para generar otra News.**

---

## 5. Fuente de descubrimiento, fuente de información y acontecimiento

No son lo mismo:

```text
FUENTE DE DESCUBRIMIENTO
≠ FUENTE DE INFORMACIÓN
≠ ACONTECIMIENTO PUBLICABLE
```

Una reseña puede permitir descubrir un juego. Una tienda puede revelar una fecha. Un vídeo puede mostrar componentes. Un foro puede aportar información de un proyecto.

El modelo debe investigar el hecho editorial que existe detrás de esa fuente.

### Fecha de descubrimiento ≠ fecha del anuncio

Que Vis Ludica descubra hoy un producto no significa que haya sido anunciado hoy.

Si no puede determinarse cuándo se produjo el anuncio original, utilizar una formulación neutral:

```text
[Editorial] prepara [Juego] en castellano
[Juego] tendrá edición en castellano
```

No fabricar una novedad cronológica.

---

## 6. Cobertura editorial y granularidad

Vis Ludica se centra principalmente en juegos de mesa modernos, con especial interés en eurogames y títulos afines a su audiencia.

### Cobertura normal

- eurogames y juegos estratégicos;
- familiares, party y cooperativos cuando sean relevantes;
- wargames dentro de la línea editorial correspondiente;
- expansiones con entidad propia;
- LCG cuando el lanzamiento tenga entidad editorial suficiente.

### Cobertura selectiva / frontera gris

- TCG;
- CCG;
- juegos de miniaturas;
- líneas con muchas referencias pequeñas y lanzamientos frecuentes.

En estas categorías no se intenta reproducir el catálogo completo del fabricante o distribuidor.

### Regla de unidad por defecto

Por defecto:

> **Un producto o Version + un acontecimiento editorial = una News.**

### Excepción de agrupación

Puede agruparse más de un producto en una sola News cuando:

- forman parte de la misma oleada o lanzamiento;
- comparten fecha, línea, distribuidor y acontecimiento;
- pertenecen a una gama de alta granularidad comercial;
- están afectados por el mismo proceso de reservas o calendario;
- separarlos produciría piezas casi idénticas o de escaso valor individual;
- editorialmente la unidad real es la oleada y no cada referencia de catálogo.

### Principio

> **La estructura del catálogo de una distribuidora no debe convertirse automáticamente en la estructura de la hemeroteca.**

---

## 7. Acontecimientos y categorías

La misma edición puede generar varias News a lo largo de su vida:

```text
announcement
preorder
release
restock
new_edition
crowdfunding
delay
cancellation
date_change
price_change
content_change
...
```

Una fase nueva no sustituye silenciosamente a la anterior.

### Regla de clasificación de `event`

> **`event` describe el acontecimiento que ya ha ocurrido y que justifica publicar la noticia ahora. No describe una fase futura del producto.**

Ejemplos:

```text
Se anuncia hoy que Juego X saldrá el 24 de septiembre
→ announcement

Hoy se abren reservas de Juego X
→ preorder

Juego X ya está disponible
→ release

Juego X vuelve a estar disponible
→ restock
```

Una fecha futura de lanzamiento se guarda en `date`, `release_date` o el campo técnico correspondiente, pero no transforma por sí sola una noticia de anuncio en `release`.

### Reposición y reimpresión

Para Vis Ludica no existe una distinción editorial útil entre «reposición» y «reimpresión» cuando el resultado es simplemente que vuelve a estar disponible la misma edición.

> **Se utilizará REPOSICIÓN.**

### Corrección frente a nuevo acontecimiento

Si la noticia original era correcta y posteriormente cambia la realidad editorial:

```text
nuevo acontecimiento
→ nueva News
```

Si la pieza original contenía un error:

```text
error editorial
→ corrección de la pieza
```

---

## 8. Titular

El titular debe ser claro, identificable y natural dentro de una hemeroteca especializada en juegos de mesa.

> **El título identifica. El `summary` informa.**

El titular no tiene que condensar por obligación:

```text
juego
+ edición española
+ editorial
+ acontecimiento
+ fecha
```

Intentar incluir todos esos elementos de forma sistemática produce titulares repetitivos y administrativos.

### Principio editorial

> **No hay que añadir un verbo al título para demostrar que es una noticia.**

En una web especializada en novedades de juegos de mesa en español, expresiones como «llegará en castellano» no deben convertirse en una muletilla.

### Cuando el nombre del juego basta

Un título formado únicamente por el nombre del juego puede ser válido cuando:

- el producto es el verdadero centro;
- el `summary` explica inmediatamente qué ha ocurrido;
- no existe un rasgo noticioso que merezca aparecer en el título;
- añadir editorial, idioma o fecha solo haría el titular más largo sin aportar una distinción útil.

Ejemplos:

```text
Kado
El Taller de Papá Noel
AXIA: Slayer Combo
Iconic: Neon Stories
```

### Cuando conviene añadir la editorial

Puede añadirse de forma compacta si ayuda a identificar la edición o aporta contexto:

```text
AXIA: Slayer Combo, publicado por PIF Games
El almacén de Wilmot, de Salt & Pepper Games
Eres Tú Literal, publicado por Mercurio
```

La editorial sigue siendo secundaria.

### Cuando el acontecimiento debe mandar

Si la noticia existe por un hecho concreto, el titular puede expresarlo de forma directa:

```text
Preventa de Azul Kids
Preventa de The Hanging Gardens
Preventa de Black Rose Wars: Duel Lex
Reposición de Deductio
Nueva edición de [Juego]
[Juego] se retrasa hasta octubre
[Juego] cambia su lanzamiento al 24 de septiembre
```

La repetición de estructuras como `Preventa de...` no es un problema cuando la categoría es el hecho real. Es preferible a buscar sinónimos artificiales.

### Cuando existe un rasgo propio

Si el acontecimiento tiene personalidad o contenido específico, el titular puede desarrollarlo:

```text
Los Hombres Lobo de Castronegro celebra sus 25 años con una edición especial
The Last Squadron, nuevo Microrama de Juegorama
```

### Evitar por defecto

```text
[Juego] llegará en castellano de la mano de [Editorial]
[Juego] llega en castellano de la mano de [Editorial]
[Juego] se incorpora al catálogo de [Editorial]
```

No están prohibidas, pero no deben actuar como plantilla automática.

### Principios

- el juego o producto sigue siendo el centro de las noticias de producto;
- el título no debe competir con el `summary`;
- claridad antes que ingenio;
- brevedad cuando no se pierde información relevante;
- evitar pasivas innecesarias;
- evitar clickbait, juegos de palabras, SEO artificial y lenguaje promocional;
- no repetir «en castellano» si el contexto ya hace evidente que la noticia documenta una edición española;
- usar la fecha en el titular solo cuando sea realmente uno de los datos que define el acontecimiento.

---

## 9. Summary y cuerpo: seleccionar y desarrollar

Regla:

> **El título identifica; el `summary` selecciona e informa; el cuerpo desarrolla.**

`summary` debe funcionar de forma autónoma en listados y metadatos. Contiene el núcleo de la noticia en una o dos frases.

El primer párrafo del cuerpo vuelve a contar el hecho principal porque el cuerpo también debe ser autónomo.

Eso no autoriza a repetir después los mismos antecedentes, listas o detalles con palabras ligeramente distintas.

---

## 10. Primer párrafo

El primer párrafo contiene la noticia.

Prioridad conceptual:

```text
qué juego o producto
+ qué ha ocurrido
+ quién interviene cuando sea relevante
+ fecha relevante si está confirmada
```

No es necesario reproducir literalmente el titular.

Un titular corto como:

```text
Kado
```

puede abrir con:

```text
Kado llegará próximamente en castellano de la mano de Devir...
```

La información que se ha retirado del titular no se elimina de la noticia: se traslada al `summary` y al lead.

---

## 11. Explicar el juego

La noticia debe permitir que un lector que no conozca el título entienda qué clase de juego es cuando esa información resulte útil.

Regla:

> **Explicar la propuesta y el mecanismo distintivo suficiente para reconocer qué tipo de juego es, sin resumir el reglamento.**

Puede incluir:

- estructura general;
- mecanismo central;
- objetivo;
- rasgo diferencial;
- relación con un juego anterior;
- condición de solitario, juego para exactamente tres jugadores, campaña, cooperativo, etc.

---

## 12. Contexto histórico y antecedentes

Los antecedentes se incluyen cuando explican el acontecimiento actual.

Pueden ser extensos si son realmente relevantes.

Preferir hechos concretos a conclusiones causales no demostradas.

---

## 13. Relanzamientos y crowdfunding

Un relanzamiento de crowdfunding es un nuevo acontecimiento.

Cuando exista un intento anterior, explicar:

- qué ocurrió;
- cuándo ocurrió;
- qué cambios confirmados distinguen el nuevo intento;
- nueva fecha o estado;
- condiciones de campaña cuando estén realmente disponibles.

No interpretar si los cambios harán que la nueva campaña tenga éxito.

---

## 14. Fechas, previsiones e incertidumbre

Nunca inventar precisión.

Usar lenguaje natural:

```text
prevé
sitúa
estima
programa
trabaja con una previsión de
```

### Fecha técnica del fichero

Las noticias nuevas utilizan:

```text
YYYY-MM-DD-<slug-descriptivo>.md
```

El prefijo `YYYY-MM-DD` representa:

> **la fecha local de publicación de Vis Ludica, derivada de `published_at`.**

No representa:

- la fecha futura de lanzamiento;
- la fecha en la que la fuente publicó el anuncio;
- la fecha comercial de una preventa;
- la fecha histórica del acontecimiento si Vis Ludica publica la pieza después.

Ejemplo:

```yaml
published_at: 2026-09-09T21:21:00+02:00
release_date: 2026-09-24
```

Nombre:

```text
2026-09-09-fearsome-floors.md
```

La fecha comercial permanece en los campos estructurados y en la redacción cuando sea relevante.

### Fechas relativas en una hemeroteca

Preferir fechas o ventanas absolutas frente a expresiones que envejecen mal cuando puedan resolverse sin inventar precisión.

### Ausencia de información

No narrar automáticamente todos los campos desconocidos.

---

## 15. Condiciones comerciales y promociones

El lenguaje comercial se transforma en información verificable.

Comprobar especialmente:

```text
gratis
incluido
exclusivo
regalo
reserva
preventa
envío gratuito
suplemento
```

No reproducir lenguaje promocional sin comprobar condiciones.

---

## 16. Ficha del juego en la web

La web debe ofrecer, cuando estén disponibles y confirmados, datos prácticos y créditos del juego.

Estos datos proceden de `products` y son renderizados por Astro.

### Regla de no duplicación

> **El cuerpo Markdown no debe terminar con una segunda ficha escrita en prosa.**

Evitar cierres del tipo:

```text
Juego X admite de 2 a 4 jugadores, tiene una duración de 45 minutos,
está recomendado a partir de 10 años y tiene un PVP de 29,95 euros.
```

si esos mismos datos ya están disponibles en `products`.

### Sí pueden aparecer en el cuerpo cuando aportan significado

La duplicación funcional es válida cuando un dato ayuda a explicar el juego o el acontecimiento.

Ejemplos:

- «es un juego independiente para exactamente dos jugadores»;
- «el precio de la preventa es de 39 euros» cuando el precio forma parte de la noticia;
- «esta edición amplía el rango a 1–6 jugadores»;
- «el lanzamiento está previsto para el 25 de septiembre».

La regla no es ocultar datos prácticos, sino evitar la recapitulación automática al final.

### Datos especialmente útiles

- jugadores;
- duración;
- edad recomendada;
- precio o PVPR;
- diseñador/es;
- editorial responsable de la edición española;
- fecha o ventana de publicación cuando tenga sentido.

Los desconocidos se omiten.

---

## 17. Autoría y créditos

El diseñador / autor suele ser información útil.

El ilustrador no se incluye mecánicamente.

Conservar siempre el rol oficial sin inferir el peso creativo real.

---

## 18. Relaciones entre productos

Cuando sea útil, explicar con precisión si un producto es:

- juego independiente;
- expansión;
- expansión que también funciona de forma autónoma;
- nueva edición;
- reimplementación;
- spin-off;
- producto del mismo universo;
- material que requiere una caja base concreta.

BGG puede ayudar internamente a resolver estas relaciones, pero su taxonomía no debe filtrarse a la prosa si no aporta nada.

---

## 19. Roles comerciales y precisión verbal

No intercambiar sin evidencia:

```text
publicar
editar
distribuir
adquirir derechos
licenciar
reservar
vender
```

### Regla estructural

> **`publisher_es` y `distributor_es` representan funciones diferentes y no deben rellenarse por analogía.**

Una tienda no se convierte en editorial por abrir reservas.

Una distribuidora no debe presentarse como editora si la fuente no lo confirma.

Si una fuente profesional solo confirma que Asmodee distribuye un producto, utilizar `distributor_es: Asmodee` y no asumir `publisher_es: Asmodee`.

La formulación comercial o jurídica más precisa solo se utiliza cuando está respaldada.

---

## 20. Fuentes: investigación interna y publicación pública

Las fuentes utilizadas deben ser trazables internamente.

La política pública de Vis Ludica es distinta:

> **La web no publica enlaces externos a las fuentes de cada noticia, salvo el enlace de referencia a BoardGameGeek generado desde `bgg_id`.**

Las URLs, fechas, capturas, evidencias y procedencia se conservan para auditoría y futuras revisiones, no para convertir la web en un agregador. El enlace a BGG no se presenta como atribución de la noticia, sino como referencia útil del producto.

### Enlace público a BoardGameGeek

Cuando `products[].bgg_id` esté disponible y confirmado, Astro puede renderizar en la ficha del producto un enlace a su entrada en BoardGameGeek.

Reglas:

- derivar el enlace directamente de `bgg_id`;
- no almacenar un campo adicional `bgg_url`;
- mostrarlo únicamente cuando exista ID;
- no inventar ni buscar un ID solo para poder mostrar el enlace;
- no insertar manualmente el enlace dentro del cuerpo Markdown;
- mantener bloqueados los enlaces externos arbitrarios a editoriales, tiendas, medios, campañas y otras fuentes, salvo decisión editorial expresa.

Conceptualmente:

```text
bgg_id: 428317
→ https://boardgamegeek.com/boardgame/428317
```

El slug textual de BGG no forma parte del contrato y no debe conservarse.

### Regla de investigación

> **Buscar la mejor fuente suficiente, no acumular fuentes.**

La investigación debe detenerse cuando estén suficientemente confirmados:

1. identidad del producto;
2. acontecimiento real;
3. edición española y actor responsable;
4. fecha/estado cuando proceda;
5. datos de referencia razonablemente disponibles;
6. contexto necesario para evitar errores.

---

## 21. Jerarquía de fuentes

Orden conceptual, sujeto al dato concreto:

1. editorial española responsable;
2. distribuidor o portal profesional oficial;
3. Asmodee B2B España cuando el producto sea distribuido por Asmodee;
4. editorial original;
5. campaña oficial;
6. BGG para identidad, relaciones y datos generales;
7. fuentes secundarias fiables;
8. publicaciones sociales y comunidades;
9. `editorial_input` aportado por David.

### Asmodee B2B

Cuando Asmodee distribuye un producto, consultar prioritariamente su B2B para:

- jugadores;
- duración;
- edad;
- PVPR;
- idioma;
- fecha/disponibilidad;
- editorial y distribución;
- otros datos normalizados.

No convertir automáticamente el hecho de aparecer en Asmodee B2B en prueba de que Asmodee es la editorial.

---

## 22. Organización del cuerpo

No existe una plantilla fija, pero una noticia normal tiende a seguir:

```text
HECHO ACTUAL
        ↓
QUÉ PRODUCTO ES / QUÉ CAMBIA
        ↓
CONTEXTO O CONSECUENCIAS RELEVANTES
        ↓
ANTECEDENTES, SI EXPLICAN EL PRESENTE
```

No es obligatorio utilizar todas las capas.

---

## 23. Casos específicos

### 23.1 Anuncio

Comprobar:

- quién lo publicará en español;
- qué producto es;
- relación con otros títulos si puede confundirse;
- fecha o ventana real;
- propuesta del juego;
- autoría y datos de referencia disponibles.

Titular posible:

```text
Juego
Juego, próximo lanzamiento de Editorial
```

No es obligatorio utilizar «llegará en castellano».

### 23.2 Preventa / reservas

Comprobar:

- quién abre la reserva;
- qué producto o conjunto incluye;
- fecha de apertura/cierre;
- fecha o ventana de lanzamiento;
- condiciones comerciales relevantes;
- promociones verificadas.

Titular preferente cuando la preventa es el acontecimiento:

```text
Preventa de Juego
```

### 23.3 Lanzamiento / novedad

Comprobar:

- si está realmente disponible;
- quién publica/distribuye la edición española;
- fecha si es fiable;
- precio/PVPR si está disponible;
- datos de referencia;
- explicación suficiente del juego.

Titulares posibles:

```text
Juego
Juego, publicado por Editorial
Juego, disponible
```

No forzar «llega en castellano».

### 23.4 Reposición

Titular preferente:

```text
Reposición de Juego
```

o, si resulta más natural:

```text
Juego vuelve a estar disponible
```

### 23.5 Expansión

Comprobar:

- qué juego amplía;
- si requiere caja base;
- qué añade realmente;
- cambios de jugadores, campaña, módulos o compatibilidad;
- si forma parte de una oleada que conviene agrupar.

### 23.6 Nueva edición

El titular debe destacar el cambio cuando este sea la noticia:

```text
Nueva edición de Juego
Juego celebra sus 25 años con una edición especial
```

### 23.7 Cambio de fecha, retraso o cancelación

El titular debe expresar el cambio.

### 23.8 Corrección de erratas o contenido

Puede generar News cuando afecta de forma material a jugadores o propietarios.

### 23.9 Crowdfunding

Comprobar plataforma, estado, fechas, edición española y antecedentes relevantes.

### 23.10 Líneas de miniaturas, TCG/CCG y alta granularidad

Antes de crear News individuales, preguntar:

> **¿Esto se entiende mejor como una oleada conjunta?**

---

## 24. Datos desconocidos

Regla transversal:

```text
dato no confirmado
→ ausencia o incertidumbre
```

Nunca:

```text
inferir por costumbre
copiar de otra edición
convertir un mes en un día exacto
inventar precio
inventar fecha
inventar Organization
inventar compatibilidad
inventar BGG ID
```

---

## 25. Errores editoriales a evitar

- convertir la fuente de descubrimiento en protagonista;
- publicar una reseña como noticia solo porque permitió descubrir un juego;
- transformar el catálogo de una distribuidora en una noticia por SKU;
- publicar promociones menores sin suficiente interés;
- publicar cada pequeño avance de producción;
- usar «llegará en castellano» o «de la mano de» como fórmula automática;
- tratar el titular como un resumen completo cuando el `summary` ya cumple esa función;
- repetir en summary, lead y cuerpo los mismos antecedentes;
- terminar el cuerpo con una ficha manual de jugadores/duración/edad/PVP;
- resumir el reglamento;
- omitir contexto histórico esencial por buscar una falsa brevedad;
- añadir ilustradores y créditos de forma mecánica;
- convertir una previsión condicionada en fecha firme;
- escalar una tienda a editorial o una distribuidora a editora;
- utilizar `event: release` para un lanzamiento que todavía no ha ocurrido;
- utilizar la fecha comercial futura como prefijo del fichero;
- copiar lenguaje promocional;
- publicar enlaces externos por sistema, salvo el enlace controlado a BGG derivado de `bgg_id`;
- convertir el cuerpo en una ficha técnica;
- eliminar datos prácticos útiles por miedo a parecer una ficha.

---

## 26. Lista de control antes de aprobar

### Publicabilidad

- ¿Existe realmente una News o solo nueva información?
- ¿Tiene impacto suficiente en disponibilidad, contenido, edición, funcionamiento o situación comercial?

### Acontecimiento

- ¿Se ha identificado el acontecimiento real y no la fuente que lo reveló?
- ¿`event` describe lo que ya ha ocurrido y justifica publicar ahora?
- ¿Se está confundiendo una fecha futura de lanzamiento con un `release` actual?

### Granularidad

- ¿Debe ser una News individual?
- ¿Forma parte de una oleada que conviene agrupar?

### Fuentes y roles comerciales

- ¿Cada afirmación importante es trazable?
- ¿Se ha buscado una fuente primaria suficiente?
- ¿`publisher_es` está realmente confirmado como editorial?
- ¿`distributor_es` está correctamente separado?

### Titular

- ¿El juego ocupa el centro cuando se trata de una noticia de producto?
- ¿El título está intentando hacer el trabajo del `summary`?
- ¿Podría simplificarse sin perder la identidad de la noticia?
- ¿Se está usando por inercia «llegará en castellano», «de la mano de» o «se incorpora al catálogo»?
- Si la noticia es una preventa, reposición o nueva edición, ¿conviene que el acontecimiento aparezca directamente?
- ¿Una fecha en el título aporta realmente valor?

### Summary y cuerpo

- ¿El `summary` cuenta el núcleo de forma autónoma?
- ¿El lead cuenta el hecho?
- ¿Cada párrafo posterior añade información?
- ¿La explicación del juego ayuda a reconocerlo sin enseñar el turno completo?

### Ficha

- ¿`products` contiene jugadores, duración, edad, precio y autoría cuando están disponibles?
- ¿El cuerpo termina repitiendo esos mismos datos como una ficha manual?
- ¿Los datos que sí aparecen en la prosa tienen una función narrativa o informativa real?

### Fechas técnicas

- ¿El nombre `YYYY-MM-DD-...` usa la fecha local de `published_at`?
- ¿Las fechas comerciales permanecen en sus campos propios?

### Tono

- ¿Hay lenguaje promocional?
- ¿Hay recomendación de compra?
- ¿Hay protagonismo innecesario de otro medio?

---

## 27. Salida editorial esperada

La salida normal del generador no debe explicar su propio razonamiento.

Debe entregar la pieza publicable y los datos estructurados necesarios.

Conceptualmente:

```text
title
summary
body_markdown
products
classification
internal_sources/evidence
```

En su presentación pública, la salida termina al terminar la noticia y sus fichas renderizadas.

---

## 28. Presentación pública de fuentes

Por defecto, la noticia web publicada:

- no incluye una lista de fuentes;
- no incluye URLs externas de las fuentes de investigación;
- puede incluir en la ficha del producto un enlace automático a BoardGameGeek cuando exista `bgg_id`;
- no enlaza automáticamente editoriales, tiendas, medios, campañas o canales;
- no nombra al medio que permitió descubrir la información salvo decisión editorial expresa.

La trazabilidad debe existir internamente aunque no sea visible para el lector.

---

## 29. Principio final

En caso de duda:

```text
hecho antes que fuente de descubrimiento
relevancia antes que automatismo
contexto útil antes que minimalismo
claridad antes que ingenio
título identifica; summary informa
precisión antes que falsa completitud
incertidumbre antes que suposición
información antes que promoción
hemeroteca antes que catálogo
```

Y, sobre todo:

> **No todo lo que cambia merece una noticia, no todo lo que sabemos tiene que entrar en el texto y no todo titular necesita explicar por sí solo toda la noticia.**
