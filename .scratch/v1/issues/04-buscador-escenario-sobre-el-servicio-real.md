# 04: Buscador Escenario sobre el servicio real

Parent: spec en `.scratch/it-sounds-like/spec.md`

**What to build:** La UI ganadora del prototipo —sala oscura con portadas 3D, cámara que viaja al primer match, panel lateral con la ficha completa— conectada al servicio de búsqueda real. Filtros auto-descubiertos del catálogo por dimensión (numéricas con tope, categóricas por valor), top 3 ajustable, línea honesta cuando nada supera el umbral ("el catálogo aún no tiene nada fuerte para eso") y botón sorpréndeme. Tipografía Departure Mono bundeada en local. El prototipo de `prototype/ui-busqueda` (variante escenario y capa de datos) ya valida layout, shaders y filtros: levantar y adaptar, no rediseñar.

**Blocked by:** 01, 03.

**Status:** ready-for-agent

- [ ] buscar pinta las portadas 3D de los matches con la cámara en el primero y el panel lateral muestra la ficha, con link clicable cuando la ficha lo lleva
- [ ] los filtros se descubren solos del catálogo y acotan el retrieve (energia con tope, momento_del_dia por valor…)
- [ ] el top 3 es ajustable desde la UI
- [ ] una consulta sin nada fuerte sobre el umbral muestra la línea honesta, no un mal match disfrazado
- [ ] sorpréndeme devuelve una ficha sin escribir nada
- [ ] Departure Mono se sirve en local, sin CDN
