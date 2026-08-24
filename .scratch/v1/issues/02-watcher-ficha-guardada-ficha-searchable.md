# 02: Watcher — ficha guardada, ficha searchable

Parent: spec en `.scratch/it-sounds-like/spec.md`

**What to build:** Con el servidor arrancado, crear, editar o borrar un fichero del catálogo se refleja en la búsqueda sin reiniciar y sin re-embedear todo: solo la ficha cambiada se re-procesa. El ciclo del autor queda cerrado: escribir → guardar → buscar → encontrar.

**Blocked by:** 01.

**Status**: done

- [x] ficha nueva creada con el servidor arrancado aparece en resultados en segundos (embed de una ficha, no del catálogo entero)
- [x] editar el cuerpo re-embedea solo esa ficha; editar solo el front-matter no re-embedea (el vector depende del cuerpo y se reutiliza)
- [x] borrar una ficha la saca del índice sin reiniciar
- [x] el log del servidor dice qué ficha se re-procesa, no "reindexando todo"
