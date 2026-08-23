# Visualización del soundprint

Type: prototype
Status: claimed
Labels: wayfinder:prototype
Blocked by: 08, 09

## Question

Cómo se pinta el soundprint definido en el ticket 04, con las dimensiones que salgan del ticket 09 y solo si el DoD (ticket 08) lo mete en v1: qué genera la forma (shader ThreeUI sembrado por los embeddings de los matches), cómo se presentan las palabras del autor (el significado) y las dimensiones (la estructura) sobre ese lienzo, cómo evoluciona con cada búsqueda y cómo se exporta a PNG. Prototipo visual desechable para reaccionar, no la implementación final.

## Comments

- Prototipo listo para reacción (2026-08-23): rama `prototype/ui-de-busqueda`, página `/soundprint.html` del mismo prototipo de UI (`npm run dev` en `prototype/ui-busqueda`). Las tres capas del ticket 04: palabras del autor (primera frase del "Por qué" del último top 3, en Departure Mono, la fuente bundeada en local, licencia SIL OFL), dimensiones (media de numéricas y valor dominante de categóricas, formato ficha técnica) y lienzo generativo (shader con fbm: una mancha por canción matcheada, posición y forma sembradas por hash del slug, color por su energia; repetir match engorda la mancha). Historial en localStorage, botones reset y exportar PNG (composiciona shader + texto en un canvas 1200x1200). Verificación: tipos compilan y la pipeline de búsqueda es la misma ya probada en navegador real en este origen; el lienzo quedó pendiente de reacción visual (el navegador integrado perdió su webview durante la sesión y no se pudo capturar).
