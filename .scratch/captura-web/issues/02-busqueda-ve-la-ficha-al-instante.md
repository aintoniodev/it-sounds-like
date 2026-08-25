# 02: La búsqueda ve la ficha nueva al instante

**What to build:** una ficha publicada desde la web aparece en `/api/buscar` sin esperar al siguiente deploy. Al guardarla, el Function la embedea con el mismo modelo del edge (bge-m3) y guarda el vector en la fila. La búsqueda carga el índice horneado como hoy, añade las fichas web publicadas de `fichas_web`, y rankea todo junto con el núcleo compartido (`rank.mjs`): filtros y dimensiones de las fichas web funcionan igual que los del índice. El visitante no distingue procedencia: es una tarjeta más del top.

El coste en neurons de Workers AI es un embed por ficha nueva (~1/día): dentro del margen 61× ya documentado en el README.

**Blocked by:** 01

**Status:** done

- [x] una ficha creada al minuto sale en búsquedas pertinentes (probar con queries del ánimo de la ficha)
- [x] las dimensiones/claves custom de una ficha web filtran el retrieve igual que en el índice
- [x] fichas en estado borrador NO salen en ninguna búsqueda
- [x] el recall de la suite contra el índice no baja del suelo (la fusión no regresa lo horneado)
- [x] sin fichas web (D1 vacío o caído) la búsqueda funciona exactamente como hoy: fusión tolerante a fallo

## Comments

**2026-08-25 (agente):** Hecho y verificado en producción. Al guardar, `POST /api/captura` embebe el cuerpo con bge-m3 en el edge (mismo runtime contra el que CI hornea el índice; sin embedding la ficha guarda igual y espera a la adopción del 03) y guarda el vector en la nueva columna `vector` (`d1/migrar-fichas-web-vector.sql`, patrón de `migrar-qvec`; ya aplicada en remoto). `/api/buscar` fusiona índice horneado + filas `estado='publicada' AND borrado_pedido=0 AND vector IS NOT NULL` vía `functions/fichas-web.mjs` (`entradaDeFila`: la fila convertida a la forma EXACTA de una entrada del índice — dims en string, que es como el build público las hornea, `cover: null`, spotify trimado al insertar) y rankea todo junto con el núcleo compartido. La carga de fichas web va en paralelo con eventos e índice y degrada a lista vacía si D1 falla: sin fichas web, la búsqueda es literalmente la de hoy.

Verificación: local (pages dev + Workers AI real) y producción — ficha escrita al minuto rankea #1 (0.768) por encima del índice horneado (Eno 0.592) con query pertinente; su clave `momento_del_dia=madrugada` filtra el retrieve como cualquier dim del catálogo; un borrador insertado a mano en D1 no sale en ninguna búsqueda; con la fila borrada, la misma query vuelve al top-1 del catálogo y `fichas_web` queda a cero. CI verde con la fusión desplegada (el recall de la suite corre contra el índice intacto). Nota para el 04: el build público NO convierte dims numéricas (`energia: 7` llega `"7"`) — en el sitio público todo filtra por chips categóricos; la fusión iguala esa forma en vez de cambiarla.

**Coste en neurons:** un embed de bge-m3 por ficha nueva (~1/día) — dentro del margen 61× del README.
