# Formato de ficha

Type: prototype
Status: resolved
Labels: wayfinder:prototype

## Question

¿Cómo es una ficha de canción? Diseñar el formato de fichero: núcleo mínimo obligatorio (referencia a canción + descripción libre) + campos opcionale maleables sin schema fijo — la plantilla es dato ("nosql en ficheros"), para que el autor la adapte sin tocar código. Decidir: representación del fichero (markdown con front-matter vs JSON), convención de nombres de fichero, qué campos opcionales propone la plantilla inicial (p.ej. qué me hace sentir / cuándo la usaría de referencia / qué escuchar en X:XX), y el término canónico (¿"ficha"?). Entregar como artefacto concreto: 5–10 fichas de ejemplo escritas con la voz prevista (emocional primero, acento técnico accesible) para reaccionar, no una especificación abstracta. Al resolver, actualizar `CONTEXT.md` con el término canónico (Skill "domain-modeling").

## Comments

- Prototipo listo para reaccionar: rama `prototype/formato-de-ficha` (`git show prototype/formato-de-ficha:LEEME.md` para el resumen, `catalogo/` para la plantilla `_plantilla.md` y las 8 fichas). Pendiente de reacción del usuario sobre: reparto rígido/maleable, secciones sugeridas, nombres de fichero, término "ficha", y la voz de los ejemplos.

## Answer

Validado por el usuario (2026-08-23), sin cambios sobre el prototipo:

- **Formato**: un fichero markdown por ficha. Front-matter YAML con el núcleo obligatorio (`titulo`, `artista`, `fecha`) y cualquier clave extra inventable por el autor. Cuerpo libre con secciones sugeridas por la plantilla, nunca obligatorias.
- **Secciones sugeridas**: Por qué esta canción / Para cuándo / Escucha.
- **Nombres**: `AAAA-MM-DD-artista-cancion.md`. El usuario anotó que en NoSQL se filtra y plotea por cualquier clave, así que el nombre de fichero no condiciona las consultas.
- **Término canónico**: "ficha" (registrado en `CONTEXT.md` junto con Catálogo, Autor, Plantilla y Núcleo).
- **Voz**: validada la de los 8 ejemplos (emocional primero, acento técnico accesible).

La reacción del usuario abrió una decisión nueva que este ticket NO cierra: qué entra en el embedding y con qué peso, y cómo las claves custom (`nivel_de_fiesta`, `energia`) actúan como dimensiones en retrieve. Vive en el ticket 09. El formato validado está plegado a main (`catalogo/`); el prototipo queda como fuente primaria en la rama `prototype/formato-de-ficha`.
