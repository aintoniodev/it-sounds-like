# El sitio público (prototipo)

Type: prototype
Status: resolved
Labels: wayfinder:prototype
Blocked by: 02, 04

## Question

Cómo se ve el sitio público respecto a la v1 local, para reaccionar antes de construir: mismo Escenario y Departure Mono, sin captura ni watcher; query embedeada en el edge (con estado de carga honesto); botones de feedback según el ticket 02; soundprint localStorage + export PNG con la firma "it sounds like · @cuenta" (la cuenta del autor, configurable). Prototipo desechable sobre la rama del prototipo de UI.

## Comments

- Prototipo listo para reacción (2026-08-23): rama `prototype/ui-de-busqueda`, página `/publico.html` del prototipo de UI. Escenario ganador con las diferencias de lo público: botones "clavo"/"no me encaja" por resultado y en el panel de ficha (stub: el evento va a localStorage + consola con la tupla del ticket 02; el POST a Worker+D1 llega en construcción), pie de privacidad de cinco líneas, enlace a `soundprint.html?cuenta=…` cuyo PNG lleva la firma "IT SOUNDS LIKE · @CUENTA" (parametrizable). En el prototipo la query se embedea local (e5-small); el estado de carga es el mismo que tendrá el edge.
- Verificado en navegador real: búsqueda, feedback con estado visual, panel de ficha y firma del soundprint. Por el camino se cayeron dos bugs del Escenario original que ningún test anterior había tocado: la capa .tapa interceptaba TODOS los clics fuera del input (pointer-events), y el input heredaba el none cuando se corrigió lo primero. Ambos arreglados en /publico y en la variante /?variant=escenario.

## Answer

Validado por el usuario (2026-08-23): abrió el prototipo en el navegador (`/publico.html`) y dio paso ("adelante"). El sitio público hereda el Escenario ganador con feedback clavo/no-encaja por resultado, privacidad de cinco líneas y el soundprint firmado; los stubs documentados (POST a Worker+D1, embedding en el edge) son trabajo de construcción, no de diseño. Fuente primaria: rama `prototype/ui-de-busqueda`, páginas `/publico.html` y `/soundprint.html`.
