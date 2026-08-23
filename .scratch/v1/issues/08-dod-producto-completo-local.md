# 08: DoD — producto completo local

Parent: spec en `.scratch/it-sounds-like/spec.md`

**What to build:** La verificación final del DoD contra la spec: un comando arranca todo, el ciclo autor → buscador → soundprint funciona de punta a punta, nada sale del equipo en búsqueda, y los textos están unslop. Es el gate de "producto completo local"; no añade features, las verifica juntas.

**Blocked by:** 02, 03, 04, 05, 06, 07.

**Status:** ready-for-agent

- [ ] desde un clone limpio: install + `npm start` dejan el producto usable (buscador, captura, caption, soundprint)
- [ ] con la red cortada tras el primer índice, todo el producto funciona: búsqueda, portadas, soundprint
- [ ] sin cuentas y sin BBDD del formulario: la carpeta del catálogo es la única fuente de verdad
- [ ] pasada unslop sobre todos los textos de la UI: sin emojis, sin relleno
- [ ] la suite de `eval/` sigue en 0.75+ corriendo contra el servicio real
