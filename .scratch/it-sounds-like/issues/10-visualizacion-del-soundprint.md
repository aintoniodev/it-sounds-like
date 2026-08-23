# Visualización del soundprint

Type: prototype
Status: resolved
Labels: wayfinder:prototype
Blocked by: 08, 09

## Question

Cómo se pinta el soundprint definido en el ticket 04, con las dimensiones que salgan del ticket 09 y solo si el DoD (ticket 08) lo mete en v1: qué genera la forma (shader ThreeUI sembrado por los embeddings de los matches), cómo se presentan las palabras del autor (el significado) y las dimensiones (la estructura) sobre ese lienzo, cómo evoluciona con cada búsqueda y cómo se exporta a PNG. Prototipo visual desechable para reaccionar, no la implementación final.

## Comments

- Prototipo listo para reacción (2026-08-23): rama `prototype/ui-de-busqueda`, página `/soundprint.html` del mismo prototipo de UI (`npm run dev` en `prototype/ui-busqueda`). Las tres capas del ticket 04: palabras del autor (primera frase del "Por qué" del último top 3, en Departure Mono, la fuente bundeada en local, licencia SIL OFL), dimensiones (media de numéricas y valor dominante de categóricas, formato ficha técnica) y lienzo generativo (shader con fbm: una mancha por canción matcheada, posición y forma sembradas por hash del slug, color por su energia; repetir match engorda la mancha). Historial en localStorage, botones reset y exportar PNG (composiciona shader + texto en un canvas 1200x1200). Verificación: tipos compilan y la pipeline de búsqueda es la misma ya probada en navegador real en este origen; el lienzo quedó pendiente de reacción visual (el navegador integrado perdió su webview durante la sesión y no se pudo capturar).

## Answer

Concepto validado por el usuario (2026-08-23): "se ve espectacular, me gusta el concepto". Las tres capas funcionan y comunican.

**Issue conocido, reportado por el usuario**: el lienzo no cambia visiblemente entre búsquedas (las capas de texto y dimensiones sí actualizan). Hipótesis: solapamiento de resultados en catálogo pequeño (el efecto imán de Malamente) más posiciones estables por slug y contraste bajo de las manchas; no es un fallo de la pipeline (el historial actualiza y las capas de texto lo demuestran). **Fix a aplicar en la fase de construcción**: (1) pulso de frescura — los matches de la última búsqueda destellan cálidos y decaen en segundos, (2) el fondo fbm se sierra con el hash de la query para que cada búsqueda mueva el lienzo entero aunque los resultados se solapen, (3) manchas con más radio y opacidad, (4) posiciones con animación de entrada (lerp) en vez de aparecer fijas.

Fuente primaria: rama `prototype/ui-de-busqueda`, página `/soundprint.html`.
