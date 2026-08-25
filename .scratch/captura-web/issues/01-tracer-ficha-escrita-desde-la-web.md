# 01: Tracer: el autor escribe una ficha en la web y queda guardada

**What to build:** el camino más fino ya completo: el primo abre `/captura` en el sitio público desde el móvil, introduce el token del autor, rellena el núcleo (título, artista, fecha) y el cuerpo, y la ficha queda guardada en una tabla `fichas_web` del D1 (estado: publicada), visible en un listado simple de la propia página. Sin token válido: 401 genérico (mismo cuerpo para token ausente y token erróneo). Sin núcleo completo o con fecha mal formada: 400 con mensaje claro. La autenticación sigue las prácticas verificadas del informe de la rama `research/auth-token-secreto`: token de 256 bits, secreto de Pages (nunca en el repo), `Authorization: Bearer` sobre HTTPS, comparación timing-safe de los digests SHA-256.

Prefactor incluido (hacerlo primero, dentro de este ticket): la validación de ficha y el slug (`AAAA-MM-DD-artista-cancion`, minúsculas, sin acentos, dedupe) viven hoy en el server arrastrando el servicio de embeddings entero; extraerlas a un módulo puro compartido entre `server/` y `functions/` (el mismo patrón que `rank.mjs`), con el server consumiéndolo.

La ficha nueva NO aparece todavía en las búsquedas: eso es el 02. Este ticket solo demuestra escritura y guardado.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] POST de ficha rechazado con 401 genérico sin token válido; con token válido, aceptada
- [ ] ficha válida queda en D1 con el slug según las reglas del server (mismo módulo compartido, sin duplicar)
- [ ] slug duplicado (ya en `fichas_web` o ya en el índice público) rechazado con mensaje claro
- [ ] la página `/captura` (DOM plano, Departure Mono, móvil) permite login con token, crear una ficha y verla listada
- [ ] el token vive como secret de Pages; nada del token aparece en el repo, en logs ni en respuestas
- [ ] la suite del server sigue verde tras el prefactor (es extracción, no cambio de semántica)

## Comments
