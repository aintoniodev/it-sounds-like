# DoD: qué incluye "producto completo local"

Type: grilling
Status: resolved
Labels: wayfinder:grilling
Blocked by: 01, 04

## Question

Enumerar qué hace completo al producto v1, con criterios de aceptación cerrados para poder ejecutar después: buscador + índice sí; ¿formulario de captura dentro del producto? ¿export de caption (ticket 06)? ¿soundprint ya en v1 o después? ¿reindexado con comando manual o watcher de carpeta? Este ticket cierra el mapa: al resolverlo no debe quedar nada por decidir antes de ejecutar el producto.

## Answer

DoD de v1, cerrado por el usuario (2026-08-23). Criterios de aceptación:

**Ejecución**: un comando (`npm start`) arranca un servidor Node local que sirve la web y vigila `catalogo/` con un watcher; ficha nueva o cambiada = reindexada (re-embed incremental, solo lo que cambió) y searchable al instante. Sin cuentas: quien abre el navegador en la red local busca; el autor captura.

**Buscador**: UI ganadora del 07 (Escenario) con tipografía Departure Mono bundeada en local, sin CDN. Query libre → top 3 ajustable con tarjeta (título, artista, descripción, link opcional, portada cacheada del índice) + filtros auto-descubiertos por dimensión. Bajo umbral de similitud: top 3 igualmente + línea honesta ("el catálogo aún no tiene nada fuerte para eso"). Botón "sorpréndeme" junto a la búsqueda (decisión del usuario, entra en v1).

**Captura**: formulario en el producto (núcleo título/artista/fecha + cuerpo con la plantilla cargada + claves custom libres + link opcional) que escribe la ficha a `catalogo/`.

**Caption**: botón "copiar caption" junto a cada ficha, con las reglas del ticket 06.

**Soundprint**: entra COMPLETO en v1 (decisión del usuario): panel con las tres capas (palabras del autor, dimensiones, lienzo generativo) + export PNG. Su diseño se resuelve en el ticket 10, que queda en la ruta de este mapa. La "línea de plegamiento" (niebla del mapa) es v2: necesita semanas de uso.

**Privacidad**: nada sale del equipo en v1; el índice lleva las portadas cacheadas y la búsqueda funciona sin red.

**Escala (nota, no v1)**: el usuario pidió pensar en 1000 visitas/día. En local el watcher y el cosine en memoria aguantan sin despeinarse; el coste real de visitantes es el modelo de 120 MB por navegador. La vía pública (despliegue estático/edge, embeddings de query server-side con el tier gratuito de Cloudflare Workers AI ya inventariado en el 02, auth de "oráculo" para el autor) es otro esfuerzo y merece su propio mapa.

**RL / feedback del usuario** (propuesta del usuario en la ronda): fuera de este mapa por la misma razón: aprender de usuarios necesita usuarios, y v1 es local. Entra en el esfuerzo de publicación (recogida de feedback por match, y con volumen: re-ranking aprendido o fine-tuning). Se plantea allí.
