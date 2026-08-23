# Seed del catálogo

Type: task
Status: resolved
Labels: wayfinder:task
Blocked by: 01

## Question

Escribir 20–30 fichas de ejemplo siguiendo el formato resuelto en el ticket 01, con la voz prevista (ingeniero de sonido: emocional primero, acento técnico accesible, centrado en canciones). Sin ellas no se puede evaluar la calidad de búsqueda ni prototipar la UI con datos reales. Son desechables: las reemplazan las fichas del autor en cuanto empiece. Resolución: fichas creadas en la carpeta del catálogo + nota de qué variedad cubren (ánimos, géneros, épocas) para que el test de matching sea representativo.

## Answer

Hecho (2026-08-23): 23 fichas en `catalogo/` en main, las 8 validadas en el prototipo del ticket 01 más 15 nuevas. Cobertura:

- **Ánimos**: euforia (September, Bohemian Rhapsody), calma/concentración (Claro de luna, Naima, So What, An Ending), desgarro/duelo (Skinny Love, Tú Me Dejaste De Querer), deseo con rabia (Ojalá), fiesta/baile (September, Ojos Así, Blinding Lights), amor (Something About Us, Eres, Mediterráneo), renacer (Feeling Good), madrugada (Teardrop), groove físico (Redbone, The Less I Know the Better), identidad/paisaje (Malamente, Jóga, Como el agua).
- **Géneros**: pop, rock, jazz, flamenco, soul, electrónica, clásica, folclore latino, pop urbano español.
- **Épocas**: de 1801 (Beethoven) a 2020 (The Weeknd, C. Tangana).
- **Claves custom como dimensiones**: `nivel_de_fiesta` (September), `energia` (Claro de luna: 2, Blinding Lights: 9, a propósito extremos opuestos de la misma dimensión), `momento_del_dia` (Teardrop).
- **Variedad estructural**: una ficha mínima sin secciones (Eno), fichas sin link de Spotify (mayoría), fichas con link placeholder.

Desechables por diseño: cuando el autor empiece a publicar, sus fichas sustituyen a estas.
