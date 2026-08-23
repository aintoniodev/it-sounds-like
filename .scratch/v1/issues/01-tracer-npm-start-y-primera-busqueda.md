# 01: Tracer — `npm start` y primera búsqueda viva

Parent: spec en `.scratch/it-sounds-like/spec.md`

**What to build:** Con `npm start` desde la raíz arranca un servidor Node local que indexa el catálogo y sirve una página mínima donde escribes cómo quieres sentirte y recibes el top 3 con título, artista y texto de la ficha. El índice: parser de fichas (núcleo obligatorio titulo/artista/fecha, ficheros con `_` inicial ignorados, claves custom → dimensiones, cuerpo completo), un embedding por ficha con multilingual-e5-small (q8, prefijo `passage:`, sin prepend del núcleo). El corazón del ticket es el servicio de búsqueda (catálogo → índice → rank) como módulo importable: la suite de `eval/` debe ejecutarse contra él, no contra una copia de su lógica. La query se embedea en el servidor (transformers.js en Node ya lo demuestra el harness); el navegador queda fino, sin descarga de modelo.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `npm start` desde la raíz arranca índice y web en un solo comando (solo `npm install` previo)
- [ ] una consulta desde la página devuelve el top 3 con título, artista y texto de la ficha
- [ ] ficha con núcleo incompleto se rechaza con error que nombra el fichero; `_plantilla.md` no aparece nunca en resultados
- [ ] las claves custom (energia, momento_del_dia…) llegan al servicio como dimensiones, numéricas y de vocabulario
- [ ] la suite de `eval/` corre contra el servicio real y su recall@3 queda en 0.75 o más (suelo medido del cuerpo completo sin prepend: 0.754)
