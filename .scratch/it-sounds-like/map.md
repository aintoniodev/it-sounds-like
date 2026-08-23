# It sounds like — buscador de canciones por descripción

Labels: wayfinder:map

## Destination

Un producto completo corriendo en local: fichas de canciones escritas por un ingeniero de sonido (ficheros planos, plantilla maleable), indexadas con embeddings (modelo local + opción de API gratuita), y un buscador donde cualquiera describe cómo quiere que le haga sentir la música y recibe el top X de canciones con la descripción del autor. Qué significa "completo" lo fija el ticket de DoD.

## Notes

- **Autor de las fichas**: ingeniero de sonido y profesor. Las descripciones tienen columna vertebral emocional/práctica ("qué me hace sentir", "para qué momento") con acentos técnicos accesibles (reference track, "qué escuchar en 1:32") — centrado en canciones para personas, no en detalle instrumental.
- **Stack decidido**: TypeScript + ThreeUI (componentes Three.js e shaders interactivos) para la UI.
- **El usuario es AI Engineer**: las decisiones de modelos y embeddings son suyas. No grillar sobre lo básico; entregar inventarios y datos, decide él.
- **Embeddings** (decidido en el 09, medido): `multilingual-e5-small` local (transformers.js, q8, prefijos query:/passage:), cosine en memoria. Un embedding por ficha con el cuerpo completo, sin prepend del núcleo y sin pesos por sección. Suite re-ejecutable en `eval/`.
- **Idioma**: descripciones en español; los embeddings deben manejar ES bien.
- **Privacidad / local-first**: las descripciones son sentimientos personales; nada público en v1.
- **Fuente de verdad**: carpeta de ficheros, una ficha por canción, esquema mínimo obligatorio + campos opcionales sin schema fijo (la plantilla es dato). Un formulario de captura, si existe, escribe ficheros a esa carpeta — nunca a una BBDD propia.
- **Resultado de búsqueda** (decidido): top 3 ajustable; tarjeta con título+artista, la descripción del autor, y link opcional a Spotify si la ficha lo lleva (nunca obligatorio).
- **Skills por tipo de ticket**: `research` → Skill "research"; `prototype` → Skill "prototype"; `grilling` → Skills "grilling" + "domain-modeling".
- **Unslop en todos lados** (preferencia permanente): fichas, captions, UI, textos del producto. Sin emojis, sin relleno, voz seca y concreta.
- **Tipografía** (decidida en el 07): Departure Mono (https://github.com/rektdeckard/departure-mono), bundeada en local, sin CDN. Estética de consola de estudio.

## Decisions so far

<!-- una línea por ticket cerrado: gist + link -->

- [Formato de ficha](issues/01-formato-de-ficha.md): markdown por ficha, front-matter YAML con núcleo obligatorio (titulo/artista/fecha) + claves inventables, cuerpo libre con secciones sugeridas (Por qué / Para cuándo / Escucha); nombres AAAA-MM-DD-artista-cancion.md; término "ficha"; voz validada. Detalle y prototipo: rama `prototype/formato-de-ficha`.
- [Inventario de embeddings](issues/02-inventario-de-embeddings.md): default local `multilingual-e5-small` (MIT, 470 MB) vía transformers.js con cosine en memoria; plan B `bge-m3` en Ollama (respaldo API gratis: Cloudflare 10k neurons/día); jina-v3 mejor en ES pero licencia NC; sin vector store para cientos de fichas. Informe: `research/embeddings` → `docs/research/embeddings.md`.
- [Resolver referencia de canción](issues/03-resolver-referencia-de-cancion.md): sin OAuth — oEmbed de Spotify (`open.spotify.com/oembed`, sin key, da título+portada pero NO artista) para fichas con link; fallback texto libre con iTunes Search (1 request lo da todo) o MusicBrainz+CAA; resolver en indexado y cachear en la ficha. Informe: `research/referencia-cancion` → `docs/research/referencia-cancion.md`.
- [Seed del catálogo](issues/05-seed-del-catalogo.md): 23 fichas desechables en `catalogo/` cubriendo ánimos, géneros (pop a clásica), épocas (1801–2020) y claves custom como dimensiones (`energia` en dos extremos).
- [Definir soundprint](issues/04-definir-soundprint.md): firma del que busca hecha con las palabras del autor (significado) sobre dimensiones (estructura) y lienzo generativo; input pasivo de los matches, por navegador sin cuentas; panel + export PNG (enlace con el canal IG del autor); el nombre es "soundprint".
- [Qué se embedea y con qué peso](issues/09-que-se-embedea-y-con-que-peso.md): resuelto midiendo (suite en `eval/`, recall@3): un embedding por ficha del cuerpo completo, sin pesos por sección (0.75 vs 0.58–0.65 de las ponderadas) y sin prepend del núcleo (0.754 vs 0.693); claves custom = dimensiones de filtrado, no texto; query = texto libre + filtros auto-descubiertos.
- [Export de caption para Instagram](issues/06-export-de-caption-para-instagram.md): borrador pegable renderizado desde la ficha (gancho = primera frase, cuerpo, Para cuando, Escucha, firma, link, 4 hashtags); el autor retoca antes de publicar; cero emojis, unslop. Prototipo: `tools/caption.mjs`.
- [Prototipo de UI de búsqueda](issues/07-prototipo-de-ui-de-busqueda.md): gana **Escenario** (portadas 3D, sala oscura, panel lateral); tipografía Departure Mono para el producto; cartel y constelación descartadas sin diagnosticar sus errores. Prototipo completo: rama `prototype/ui-de-busqueda`.

## Not yet specified

- **Trayectoria temporal del soundprint** (la "línea de plegamiento"): además de la foto de estado actual, una línea que se va formando con el historial de matches: convergencia hacia tu sonido (embudo de plegamiento), quiebros cuando la vida re-ordena el gusto, y periodicidad de hábitos (domingos de calma, viernes de energia). Necesita semanas de uso para existir, y depende de la visualización estática (ticket 10). Motivación de diseño anotada por el usuario: la línea en formación incentiva usar el producto X días para ver el espectáculo armarse. El DoD decide si es v1 o v2.
- **Calidad de búsqueda**: umbral mínimo / qué pasa cuando no hay buen match, tuning del modelo, y el efecto imán de fichas ricas en vocabulario musical (Malamente en 8+ top-3 con falsos positivos claros). Suite en `eval/` para iterar con datos.
- **Formulario de captura dentro del producto**: alcance según el DoD.
- **Reindexado**: comando manual vs watcher — según el DoD.
- **Enriquecimiento de fichas** (género, año, audio-features externas) — solo si la calidad de matching lo pide.

## Out of scope

- **Hacer el producto público** (dominio, hosting, bio link): v1 es local por decisión del usuario.
- **El canal Instagram del primo** (pitch, cadencia, copyright de lo que él cuelgue): su canal, no este producto. La plantilla maleable y el export de caption le sirven de apoyo, pero el esfuerzo de contenido no es este mapa.
- **Migración a BD NoSQL**: planteable cuando la escala lo pida; la carpeta de ficheros es la fuente de verdad de v1.
- **Multiplataforma de contenido** (TikTok, YouTube Shorts, etc.).
- **Sesión de grilling con el primo sobre el formato**: sustituida por la plantilla maleable que él adapta a su gusto.
