# 02: La búsqueda ve la ficha nueva al instante

**What to build:** una ficha publicada desde la web aparece en `/api/buscar` sin esperar al siguiente deploy. Al guardarla, el Function la embedea con el mismo modelo del edge (bge-m3) y guarda el vector en la fila. La búsqueda carga el índice horneado como hoy, añade las fichas web publicadas de `fichas_web`, y rankea todo junto con el núcleo compartido (`rank.mjs`): filtros y dimensiones de las fichas web funcionan igual que los del índice. El visitante no distingue procedencia: es una tarjeta más del top.

El coste en neurons de Workers AI es un embed por ficha nueva (~1/día): dentro del margen 61× ya documentado en el README.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] una ficha creada al minuto sale en búsquedas pertinentes (probar con queries del ánimo de la ficha)
- [ ] las dimensiones/claves custom de una ficha web filtran el retrieve igual que en el índice
- [ ] fichas en estado borrador NO salen en ninguna búsqueda
- [ ] el recall de la suite contra el índice no baja del suelo (la fusión no regresa lo horneado)
- [ ] sin fichas web (D1 vacío o caído) la búsqueda funciona exactamente como hoy: fusión tolerante a fallo

## Comments
