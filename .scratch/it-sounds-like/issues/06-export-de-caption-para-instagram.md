# Export de caption para Instagram

Type: prototype
Status: resolved
Labels: wayfinder:prototype
Blocked by: 01

## Question

Cómo se renderiza una ficha a un caption listo para pegar en Instagram: qué campos entran, formato del texto, link de la canción, si lleva hasthtags y cuáles. Prototipo: 2–3 renders de ejemplo sobre fichas reales del ticket 01 para reaccionar. Es la pieza que conecta el producto con el hábito diario del autor sin fricción (la ficha que escribe alimenta catálogo y caption a la vez).

## Answer

Validado por reacción del usuario (2026-08-23), sobre el prototipo `tools/caption.mjs` (desechable hasta que el producto le ponga el botón de copiar):

- **Estructura**: gancho (primera frase del "Por qué"), resto del cuerpo, "Para cuando:", "Escucha:" (la firma de ingeniero), firma "titulo — artista", link de Spotify si la ficha lo lleva, y 4 hashtags (#canciondeldia #itsoundslike + título y artista normalizados).
- **Flujo**: el caption es un borrador pegable; el autor retoca treinta segundos antes de publicar. La ficha sigue siendo la única fuente de verdad, sin secciones duplicadas solo para Instagram.
- **Cero emojis** y **unslop en todos lados** (preferencia permanente del esfuerzo: fichas, captions, UI): decisión explícita del usuario.
