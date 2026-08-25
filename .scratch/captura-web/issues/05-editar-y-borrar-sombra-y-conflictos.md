# 05: Editar y borrar desde la web: sombra en el D1 y conflictos

**What to build:** el autor gestiona sus fichas desde la web, también las ya adoptadas por el catálogo. Editar una ficha adoptada abre su sombra en `fichas_web`: la versión web se sirve por delante del deploy (el 02 la fusiona) hasta que el sync del 03 la adopta. Borrar oculta la ficha al instante (la fusión deja de servirla) y el próximo sync la quita de `catalogo/` con un commit. Si la misma ficha se tocó en local y en la web, gana la edición más reciente y el log del sync lo reporta. La spec completa del conflicto es el reducer validado del prototipo en la rama `prototype/fichas-desde-la-web`: estados borrador/publicada/adoptada, `borradPedido`, adopción antes de hornear.

**Blocked by:** 03, 04

**Status:** done

- [x] editar una ficha adoptada: la búsqueda sirve la versión nueva al instante; el próximo push la adopta y el deploy no cambia lo que se ve
- [x] borrar una ficha adoptada: deja de salir en búsquedas ya; el sync la quita del catálogo con commit
- [x] borrar una ficha que solo vive en la web: desaparece sin dejar rastro en D1
- [x] conflicto (edición local + edición web de la misma ficha): gana la más reciente, y el log del sync dice cuál pisó cuál
- [x] el listado del autor distingue borrador / publicada / adoptada / borrado pedido

## Comments

## Comments

**2026-08-25 (agente):** Hecho y verificado en producción. PUT edita: la ficha web se actualiza (upsert); la adoptada abre su sombra — la fusión (`fusionar`: la entrada web pisa la homónima del índice, sin duplicidad) sirve la versión nueva por delante del deploy (DoD paso 4: la query del contenido nuevo la puntea #1). DELETE borra: web-only desaparece; adoptada recibe tombstone (`borrado_pedido=1`) que la oculta YA (DoD paso 5: Malamente fuera del top al momento) y el próximo sync la quita con `git rm` + commit; una edición revive la ficha (verificado: el PUT sobre la tombstone la devolvió al top). Conflictos según el reducer validado: el sync compara `editada_en` de la fila contra el último commit del fichero (`git log -1 --format=%ct`) — gana la más reciente y el relatorio del commit lo dice ficha a ficha. Disciplina de ventana: las filas se retiran un run DESPUÉS del commit, con la fusión tapando el deploy — nunca hay hueco donde nadie sirva la ficha (fue corrección sobre el 03, que retiraba antes). El listado muestra borrador/publicada/borrado pedido + sección del catálogo (adoptadas) con editar/borrar.
