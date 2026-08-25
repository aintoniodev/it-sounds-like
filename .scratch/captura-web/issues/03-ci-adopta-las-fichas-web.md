# 03: El CI adopta las fichas web: catalogo/ sigue siendo la fuente de verdad

**What to build:** en cada push, un paso nuevo del workflow lee las fichas web publicadas de `fichas_web`, las escribe como markdown en `catalogo/` con un commit del sync (el CI commitea al repo), las retira del D1, y después hornea el índice como hoy. Quien busca no nota el cambio: la ficha pasa de servirse por la fusión del 02 a servirse por el índice horneado, mismo resultado. Es la invariante validada en el prototipo (`prototype/fichas-desde-la-web`, rama homónima): un deploy nunca se come una ficha web que esté en camino — la adopción ocurre ANTES de hornear. Los borradores no se adoptan: esperan al autor.

**Blocked by:** 02 (la fusión debe existir primero: si no, una ficha adoptada desaparecería de las búsquedas entre el push y el horneado)

**Status:** ready-for-agent

- [ ] push con una ficha web publicada pendiente: existe el commit del sync con la ficha en markdown, la fila sale del D1, y el índice horneado la incluye
- [ ] la búsqueda devuelve lo mismo justo antes y justo después del deploy (sin salto ni duplicidad)
- [ ] un borrador en D1 sobrevive al deploy intacto
- [ ] tras la adopción, `npm start` local levanta el catálogo con la ficha (flujo local intacto)
- [ ] suite de recall y replay del re-rank verdes en el CI con fichas adoptadas presentes

## Comments
