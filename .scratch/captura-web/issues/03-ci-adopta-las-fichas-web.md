# 03: El CI adopta las fichas web: catalogo/ sigue siendo la fuente de verdad

**What to build:** en cada push, un paso nuevo del workflow lee las fichas web publicadas de `fichas_web`, las escribe como markdown en `catalogo/` con un commit del sync (el CI commitea al repo), las retira del D1, y después hornea el índice como hoy. Quien busca no nota el cambio: la ficha pasa de servirse por la fusión del 02 a servirse por el índice horneado, mismo resultado. Es la invariante validada en el prototipo (`prototype/fichas-desde-la-web`, rama homónima): un deploy nunca se come una ficha web que esté en camino — la adopción ocurre ANTES de hornear. Los borradores no se adoptan: esperan al autor.

**Blocked by:** 02 (la fusión debe existir primero: si no, una ficha adoptada desaparecería de las búsquedas entre el push y el horneado)

**Status:** done

- [x] push con una ficha web publicada pendiente: existe el commit del sync con la ficha en markdown, la fila sale del D1, y el índice horneado la incluye
- [x] la búsqueda devuelve lo mismo justo antes y justo después del deploy (sin salto ni duplicidad)
- [x] un borrador en D1 sobrevive al deploy intacto
- [x] tras la adopción, `npm start` local levanta el catálogo con la ficha (flujo local intacto)
- [x] suite de recall y replay del re-rank verdes en el CI con fichas adoptadas presentes

## Comments

**2026-08-25 (agente):** Hecho y verificado en producción. El render del front-matter se mudó al módulo compartido (`markdownDe` en `functions/ficha.mjs`): la captura local y el sync serializan idéntico. `scripts/adoptar-fichas-web.mjs` lee `fichas_web` por la API REST de D1 (nada de bindings: corre en el runner), escribe el markdown en `catalogo/`, commitea el sync y RECÉN ENTONCES retira las filas — si el push falla, el paso muere sin deploy y la fusión del 02 sigue sirviendo la ficha para el próximo run. El workflow gana `contents: write`, clonación completa (el sync empuja desde ahí) y el paso de adopción antes de hornear; el commit del sync lleva el marcador de salto solo dentro del CI (el run que lo crea es el que despliega) y fuera no (un sync manual necesita que su push hornee). Los borradores nunca entran al SELECT y sobreviven; un slug que ya viva en `catalogo/` no se machaca: gana lo que está en git y la fila se retira, con línea en el log.

**Verificación end-to-end contra producción:** ficha escrita en la web rankeó #1 por la fusión (0.778); sync ejecutado → commit `78b6e11` con el markdown exacto del formato del catálogo (spotify citado, claves numéricas sin comillas), fila retirada, borrador de control intacto; el CI del commit del sync corrió suite de recall y replay CON la ficha adoptada en `catalogo/` (verde) y horneó el índice; tras el deploy, la misma búsqueda devolvió los mismos tres resultados con los mismos scores (0.778/0.545/0.525 — el vector horneado contra el mismo bge-m3 da el mismo cosine: sin salto) y sin duplicidad (cero filas publicadas en D1); `npm start` local indexa la ficha adoptada (portada best-effort: un link ficticio no resuelve, correcto). Limpieza: ficha de verificación fuera del catálogo (`f0c418f`), D1 a cero.

**Operativa aprendida (y aplicada):** un commit cuyo MENSAJE cita el marcador de salto de CI — aunque sea en una explicación — suprime su propio run; el dispatch manual lo salva, pero que no vuelva a pasar. Y el sync es idempotente: re-ejecutarlo con la tabla vacía dice "nada que adoptar" y no toca nada.
