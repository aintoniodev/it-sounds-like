# 04: El formulario completo del autor (la plantilla, en la web)

**What to build:** `/captura` gana lo que la plantilla local ya tiene, en DOM plano (decisión del informe de UI de la rama `research/db-auth-y-ui-de-captura`: nada de UI-3D para formularios): las secciones sugeridas del cuerpo (Por qué esta canción / Para cuándo / Escucha), claves custom con su valor (las dimensiones: `energia: baja`…), link de Spotify opcional, y el ciclo borrador/publicar: el autor guarda borradores invisibles y publica cuando quiere, con un listado de sus fichas en la propia página que distingue borrador y publicada. La plantilla es sugerencia, nunca obligación — mismo principio que en local.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] una ficha creada con claves custom expone esas claves como filtros en la búsqueda (vía la fusión del 02)
- [ ] borrador guardado no sale en búsquedas y el autor puede publicarlo después desde el listado
- [ ] validación del núcleo y de la fecha en el cliente y en el endpoint, con el mismo módulo compartido del 01
- [ ] el link de Spotify es opcional y, si existe, la portada se resuelve por el camino ya conocido al indexar
- [ ] todo usable con el pulgar en móvil: es la herramienta diaria del autor, no un panel de admin

## Comments

**2026-08-25 (agente, nota del 02):** El link de Spotify opcional se adelantó a petición del usuario dentro del ticket 02: campo en el formulario de `/captura`, aceptado y validado por el endpoint desde el 01, guardado en la fila y servido en la tarjeta del resultado (el panel de búsqueda ya renderiza `spotify` como "escuchar en Spotify"). Quedan de este ticket: secciones sugeridas del cuerpo, claves custom en el formulario y el ciclo borrador/publicar con listado que distinga estados.
