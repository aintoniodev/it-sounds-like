# 01: Tracer: el autor escribe una ficha en la web y queda guardada

**What to build:** el camino más fino ya completo: el primo abre `/captura` en el sitio público desde el móvil, introduce el token del autor, rellena el núcleo (título, artista, fecha) y el cuerpo, y la ficha queda guardada en una tabla `fichas_web` del D1 (estado: publicada), visible en un listado simple de la propia página. Sin token válido: 401 genérico (mismo cuerpo para token ausente y token erróneo). Sin núcleo completo o con fecha mal formada: 400 con mensaje claro. La autenticación sigue las prácticas verificadas del informe de la rama `research/auth-token-secreto`: token de 256 bits, secreto de Pages (nunca en el repo), `Authorization: Bearer` sobre HTTPS, comparación timing-safe de los digests SHA-256.

Prefactor incluido (hacerlo primero, dentro de este ticket): la validación de ficha y el slug (`AAAA-MM-DD-artista-cancion`, minúsculas, sin acentos, dedupe) viven hoy en el server arrastrando el servicio de embeddings entero; extraerlas a un módulo puro compartido entre `server/` y `functions/` (el mismo patrón que `rank.mjs`), con el server consumiéndolo.

La ficha nueva NO aparece todavía en las búsquedas: eso es el 02. Este ticket solo demuestra escritura y guardado.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] POST de ficha rechazado con 401 genérico sin token válido; con token válido, aceptada
- [x] ficha válida queda en D1 con el slug según las reglas del server (mismo módulo compartido, sin duplicar)
- [x] slug duplicado (ya en `fichas_web` o ya en el índice público) rechazado con mensaje claro
- [x] la página `/captura` (DOM plano, Departure Mono, móvil) permite login con token, crear una ficha y verla listada
- [x] el token vive como secret de Pages; nada del token aparece en el repo, en logs ni en respuestas
- [x] la suite del server sigue verde tras el prefactor (es extracción, no cambio de semántica)

## Comments

**2026-08-25 (agente):** Hecho y verificado. Prefactor: `functions/ficha.mjs` (núcleo obligatorio, fecha, `slugDe`) con su `ficha.d.mts` tipado para el cliente — mismo patrón que `rank.mjs`; `server/captura.mjs` y `server/servicio.mjs` lo consumen (la suite siguió verde en cada paso; 55 tests al cierre). Auth: `functions/auth.mjs` — Bearer sobre el secret `AUTH_TOKEN` de Pages, digests SHA-256 comparados timing-safe (la extensión del runtime de Workers cuando existe, XOR constante si no: tests en Node), `AUTH_TOKEN_PREVIOUS` válido en solapamiento desde el día uno (el informe manda incluirlo), 401 único y genérico. Endpoint: `functions/api/captura.js` — POST valida con el módulo compartido (400 claro), deduplica contra `fichas_web` y contra el índice horneado (409 con el slug), INSERT protegido por la PK con UNIQUE→409 para carreras, e índice ilegible que degrada a dedupe-solo-D1 en vez de 500; GET lista las fichas del autor. Página: `web/captura.html` + `web/src/captura.ts` (entrada nueva del vite público), DOM plano en Departure Mono, login→crear→listado, una sola ida por login, red caída con aviso. Schema: `fichas_web` en `d1/schema.sql` con el ciclo de vida del reducer validado (estado/editada_en/borrado_pedido) para que 04/05 no migren D1 — decisión deliberada, adelanta columnas, no comportamiento. Turnstile/lockout/cookie quedan para el 06, que existe para eso.

**Verificación:** cadena completa por curl contra `wrangler pages dev` con D1 local: sin token y token erróneo → mismo 401 exacto; núcleo incompleto y fecha mala → 400 claros; válida → 201 con slug canónico; duplicada en D1 y duplicada en índice → 409 claros; sin `index.json` → 201 (degradación); fila en D1 con estado publicada; cero apariciones del token en logs del server. La página compila, typechequea, sirve en `/captura` y su bundle deja los handlers cableados (revisado); la prueba visual en navegador no fue posible desde este entorno (el navegador embebido no procesa clicks sin foco de SO — verificado con una página sonda trivial), así que el recorrido con pulgar queda para el primer uso real del autor y para el DoD del 07.

**Runbook (los dos pasos humanos, una vez):**
1. Genera el token: `openssl rand -base64 32` y guárdalo en el gestor de contraseñas.
2. Súbelo como secret cifrado de Pages: `npx wrangler pages secret put AUTH_TOKEN --project-name it-sounds-like` (dashboard → Settings → Variables and Secrets → Add con "Encrypt" vale igual). Para rotar algún día: pon el nuevo en `AUTH_TOKEN` y el viejo en `AUTH_TOKEN_PREVIOUS`.
3. Aplica la tabla remota (idempotente): con el `.env` cargado, `npx wrangler d1 execute it-sounds-like-feedback --remote --file d1/schema.sql`. Local: `wrangler pages dev` + `.dev.vars` con `AUTH_TOKEN=…` (gitignored ya).

**2026-08-25 (agente, despliegue):** Subido y verificado contra producción con `scripts/wizard-captura.sh` (el runbook de arriba, empaquetado e idempotente; también sabe rotar: el token actual pasa a `AUTH_TOKEN_PREVIOUS`). Ejecutado una vez: token de 256 bits generado y guardado en `.dev.vars` (pendiente el paso solo-humano de copiarlo al gestor de contraseñas), secret `AUTH_TOKEN` subido a Pages, `fichas_web` creada en el D1 remoto, push → CI verde (42 s) → deploy. Verificación en el sitio real: `/captura` 200, POST sin token → 401 genérico, POST con token → 201 con slug canónico, fila de prueba borrada dejando `fichas_web` a cero (nada que el sync del 03 pueda adoptar por accidente). El wizard aprendió a esperar a que las Functions estén vivas (el 401 de la puerta, no el 405 de los estáticos) porque estáticos y functions se publican en momentos ligeramente distintos.
