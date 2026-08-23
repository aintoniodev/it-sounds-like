# It sounds like — buscador de canciones por descripción

Labels: wayfinder:map

## Destination

Un producto completo corriendo en local: fichas de canciones escritas por un ingeniero de sonido (ficheros planos, plantilla maleable), indexadas con embeddings (modelo local + opción de API gratuita), y un buscador donde cualquiera describe cómo quiere que le haga sentir la música y recibe el top X de canciones con la descripción del autor. Qué significa "completo" lo fija el ticket de DoD.

## Notes

- **Autor de las fichas**: ingeniero de sonido y profesor. Las descripciones tienen columna vertebral emocional/práctica ("qué me hace sentir", "para qué momento") con acentos técnicos accesibles (reference track, "qué escuchar en 1:32") — centrado en canciones para personas, no en detalle instrumental.
- **Stack decidido**: TypeScript + ThreeUI (componentes Three.js e shaders interactivos) para la UI.
- **El usuario es AI Engineer**: las decisiones de modelos y embeddings son suyas. No grillar sobre lo básico; entregar inventarios y datos, decide él.
- **Embeddings**: modelo local Y APIs gratuitas — ambas vías en el inventario.
- **Idioma**: descripciones en español; los embeddings deben manejar ES bien.
- **Privacidad / local-first**: las descripciones son sentimientos personales; nada público en v1.
- **Fuente de verdad**: carpeta de ficheros, una ficha por canción, esquema mínimo obligatorio + campos opcionales sin schema fijo (la plantilla es dato). Un formulario de captura, si existe, escribe ficheros a esa carpeta — nunca a una BBDD propia.
- **Resultado de búsqueda** (decidido): top 3 ajustable; tarjeta con título+artista, la descripción del autor, y link opcional a Spotify si la ficha lo lleva (nunca obligatorio).
- **Skills por tipo de ticket**: `research` → Skill "research"; `prototype` → Skill "prototype"; `grilling` → Skills "grilling" + "domain-modeling".

## Decisions so far

<!-- una línea por ticket cerrado: gist + link -->

- [Inventario de embeddings](issues/02-inventario-de-embeddings.md): default local `multilingual-e5-small` (MIT, 470 MB) vía transformers.js con cosine en memoria; plan B `bge-m3` en Ollama (respaldo API gratis: Cloudflare 10k neurons/día); jina-v3 mejor en ES pero licencia NC; sin vector store para cientos de fichas. Informe: `research/embeddings` → `docs/research/embeddings.md`.

## Not yet specified

- **Calidad de búsqueda**: umbral mínimo / qué pasa cuando no hay buen match, tuning del modelo — niebla hasta que existan seed del catálogo y modelo elegido.
- **Visualización del soundprint**: cómo se genera y se pinta (probablemente ThreeUI/shaders) — se afila cuando el ticket de definición del soundprint se resuelva.
- **Formulario de captura dentro del producto**: alcance según el DoD.
- **Reindexado**: comando manual vs watcher — según el DoD.
- **Enriquecimiento de fichas** (género, año, audio-features externas) — solo si la calidad de matching lo pide.

## Out of scope

- **Hacer el producto público** (dominio, hosting, bio link): v1 es local por decisión del usuario.
- **El canal Instagram del primo** (pitch, cadencia, copyright de lo que él cuelgue): su canal, no este producto. La plantilla maleable y el export de caption le sirven de apoyo, pero el esfuerzo de contenido no es este mapa.
- **Migración a BD NoSQL**: planteable cuando la escala lo pida; la carpeta de ficheros es la fuente de verdad de v1.
- **Multiplataforma de contenido** (TikTok, YouTube Shorts, etc.).
- **Sesión de grilling con el primo sobre el formato**: sustituida por la plantilla maleable que él adapta a su gusto.
