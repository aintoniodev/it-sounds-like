# 05: Editar y borrar desde la web: sombra en el D1 y conflictos

**What to build:** el autor gestiona sus fichas desde la web, también las ya adoptadas por el catálogo. Editar una ficha adoptada abre su sombra en `fichas_web`: la versión web se sirve por delante del deploy (el 02 la fusiona) hasta que el sync del 03 la adopta. Borrar oculta la ficha al instante (la fusión deja de servirla) y el próximo sync la quita de `catalogo/` con un commit. Si la misma ficha se tocó en local y en la web, gana la edición más reciente y el log del sync lo reporta. La spec completa del conflicto es el reducer validado del prototipo en la rama `prototype/fichas-desde-la-web`: estados borrador/publicada/adoptada, `borradPedido`, adopción antes de hornear.

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [ ] editar una ficha adoptada: la búsqueda sirve la versión nueva al instante; el próximo push la adopta y el deploy no cambia lo que se ve
- [ ] borrar una ficha adoptada: deja de salir en búsquedas ya; el sync la quita del catálogo con commit
- [ ] borrar una ficha que solo vive en la web: desaparece sin dejar rastro en D1
- [ ] conflicto (edición local + edición web de la misma ficha): gana la más reciente, y el log del sync dice cuál pisó cuál
- [ ] el listado del autor distingue borrador / publicada / adoptada / borrado pedido

## Comments
