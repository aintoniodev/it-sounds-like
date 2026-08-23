# Prototipo de UI de búsqueda

Type: prototype
Status: resolved
Labels: wayfinder:prototype
Blocked by: 01, 05

## Question

Cómo se ve y se comporta el flujo de búsqueda: caja donde se describe lo que quieres sentir → top 3 (ajustable) tarjetas con título+artista, la descripción del autor y link opcional a Spotify. Prototipo desechable en TypeScript + ThreeUI, con embeddings reales si ya hay modelo elegido (o stub si aún no) y las fichas del seed (ticket 05). Es look & feel para reaccionar — cómo debería verse y comportarse es la pregunta; no es el producto final.

## Comments

- Prototipo listo para reacción (2026-08-23): rama `prototype/ui-de-busqueda`, tres variantes (`?variant=cartel|escenario|constelacion`) con embeddings reales (e5-small en el navegador, primera carga ~120 MB), filtros por dimensión en la variante cartel, barra cambiadora inferior. Para correrlo: `git checkout prototype/ui-de-busqueda && cd prototype/ui-busqueda && npm install --ignore-scripts && npm run dev` (el índice `public/index.json` ya va generado; para regenerarlo, `node build-index.mjs` desde `eval/`). Verificado en navegador real: las tres variantes buscan y devuelven resultados consistentes con la suite del `eval/`. Nota: ThreeUI es un catálogo copia-y-pega (MengTo/threeui), no un paquete npm; el prototipo usa `three` directo y a la hora de construir se copian componentes del catálogo.

## Answer

Resuelto por reacción del usuario (2026-08-23):

- **Ganadora: Escenario** (variante B). Portadas como paneles 3D en sala oscura con niebla, cámara viajando al primer match, lista lateral de resultados y panel con la ficha. El usuario la vio funcionando en navegador real con búsquedas de verdad.
- **Tipografía del producto: Departure Mono** (https://github.com/rektdeckard/departure-mono), decisión del usuario sobre el prototipo ganador. Bundearla en local, sin CDN.
- **Cartel y Constelación descartadas**. El usuario observó errores en ambas ("creo que tenían algún error") y decidió no investigarlos: no se pliegan, así que los defectos quedan sin diagnóstico. El germen de soundprint (resplandor residual de la constelación) no se pierde: la visualización del soundprint es el ticket 10 y hará su propio diseño.
- Verificado: las tres variantes ejecutaban búsquedas reales con e5-small en el navegador y devolvían resultados consistentes con la suite de `eval/`.

Fuente primaria del prototipo completo: rama `prototype/ui-de-busqueda`. El ganador se pliega cuando el producto se construya (tras el DoD y el colapso a spec).
