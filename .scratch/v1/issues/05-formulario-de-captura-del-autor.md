# 05: Formulario de captura del autor

Parent: spec en `.scratch/it-sounds-like/spec.md`

**What to build:** El autor escribe fichas desde el navegador: núcleo (titulo, artista, fecha), cuerpo precargado con la plantilla (Por qué / Para cuándo / Escucha), claves custom libres (nombre + valor) y link de Spotify opcional. Al guardar se escribe un fichero markdown en la carpeta del catálogo —nunca a una BBDD propia— y, con el watcher, la ficha es searchable al instante.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] una ficha guardada desde el formulario aparece en el catálogo con nombre `AAAA-MM-DD-artista-cancion.md` y núcleo válido
- [ ] el cuerpo llega precargado con la plantilla y es editable
- [ ] las claves custom inventadas en el formulario quedan en el front-matter y funcionan como filtros en el buscador
- [ ] guardar con el núcleo incompleto se rechaza con mensaje claro y no escribe nada
- [ ] guardar → buscar y encontrar, sin recargar ni reiniciar
