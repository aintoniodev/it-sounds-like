# Spec: it sounds like — v1 local

Status: ready-for-agent
Labels: ready-for-agent

## Problem Statement

Un ingeniero de sonido sabe muchísimo de canciones y no publica nada porque "no es más que un profesor". El hábito diario de compartir una canción muere en la página en blanco, y su criterio de oyente profesional no llega a nadie. Quien sí busca música por cómo quiere sentirse no tiene dónde pedirlo: los recomendadores actuales filtran por comportamiento, no por la palabra de un experto que escucha con oficio.

## Solution

Un producto local donde el autor escribe una ficha al día por canción (qué le hace sentir, para cuándo, qué escuchar), y cualquiera describe cómo quiere que le suene la música y recibe el top 3 del catálogo con las palabras del autor. La misma ficha alimenta el catálogo, un caption listo para Instagram y, acumulada en quien busca, un soundprint: su firma sonora pintada con el vocabulario del autor, exportable como imagen.

## User Stories

1. Como autor, quiero escribir una ficha con título, artista y fecha y el resto libre, para que el hábito diario no muera en una página en blanco.
2. Como autor, quiero que la plantilla me sugiera secciones (Por qué esta canción, Para cuándo, Escucha) sin obligarme, para poder romper el formato cuando la canción lo pida.
3. Como autor, quiero inventarme claves libres (energia, momento_del_dia, nivel_de_fiesta) sin tocar código, para que mi taxonomía crezca conmigo.
4. Como autor, quiero un botón que copie el caption de Instagram renderizado desde mi ficha, para publicar en treinta segundos.
5. Como autor, quiero pegar opcionalmente un link de Spotify, para que la tarjeta sea clicable cuando exista y no estorbe cuando no.
6. Como autor, quiero que la ficha guardada sea searchable al instante, para no pelearme con reindexados manuales.
7. Como buscador, quiero escribir cómo quiero sentirme y recibir 3 canciones con la descripción del autor, para encontrar música por estado de ánimo y no por artista.
8. Como buscador, quiero filtrar por las dimensiones que el autor haya inventado, para acotar (energia baja para dormir, alta para correr).
9. Como buscador, quiero que me lo digan sin rodeos cuando el catálogo no tiene nada fuerte para lo que pedí, para no confundir un mal match con una buena respuesta.
10. Como buscador, quiero un botón sorpréndeme, para salir de mi propia burbuja de búsqueda.
11. Como buscador, quiero ver la portada y poder pinchar el link de la canción, para escuchar lo que acabo de encontrar.
12. Como buscador, quiero que mis búsquedas vayan pintando mi soundprint sin que yo haga nada, para verme retratado en palabras de alguien que sabe escuchar.
13. Como buscador, quiero exportar mi soundprint como imagen, para compartirlo.
14. Como buscador, quiero volver días después y que mi soundprint siga ahí, para verlo crecer.
15. Como mantenedor, quiero arrancar todo con un comando, para que montar el producto no sea un proyecto.
16. Como mantenedor, quiero que nada salga de la red local, para que las descripciones (sentimientos personales) se queden en casa.
17. Como mantenedor, quiero una suite de evaluación que mida el recall del buscador, para cambiar modelo o pesos con datos y no con fe.
18. Como mantenedor, quiero que el índice resuelva portadas y metadatos al indexar y cachee el resultado, para que buscar no dependa de la red.

## Implementation Decisions

- **Ficha**: un fichero markdown por canción en `catalogo/`, front-matter YAML con núcleo obligatorio (titulo, artista, fecha), claves inventables, cuerpo libre. Nombres `AAAA-MM-DD-artista-cancion.md`; ficheros con `_` inicial los ignora el índice (así vive la plantilla, que es dato editable, no schema). Vocabulario canónico en `CONTEXT.md` (Ficha, Catálogo, Autor, Plantilla, Núcleo, Soundprint, Dimensión).
- **Embeddings** (medido, suite recall@3 con 19 consultas): `multilingual-e5-small` local (transformers.js, q8, prefijos `query:`/`passage:`), cosine exhaustivo en memoria. Un embedding por ficha del cuerpo completo, sin prepend del núcleo (0.754 vs 0.693 con prepend) y sin pesos por sección (todas las ponderaciones pierden contra el texto completo). Sin vector store: el catálogo son cientos.
- **Dimensiones**: las claves custom numéricas o de vocabulario corto NO se embedean; filtran el retrieve. Las de texto libre se concatenarían al cuerpo. Los filtros se descubren solos del catálogo y se ofrecen en la UI.
- **Buscador**: UI ganadora del prototipo "Escenario" (portadas 3D en sala oscura, cámara al primer match, panel lateral con la ficha), tipografía Departure Mono (SIL OFL, bundeada en local). Top 3 ajustable; bajo umbral, línea honesta "el catálogo aún no tiene nada fuerte para eso"; botón sorpréndeme.
- **Referencia de canciones**: sin OAuth. Con link: oEmbed de Spotify (título y portada, no artista; el artista vive en el núcleo de la ficha). Sin link: iTunes Search (una petición da artwork). Todo se resuelve al indexar y se cachea junto a la ficha; la búsqueda funciona sin red.
- **Ejecución**: servidor Node local (`npm start`) que sirve la web y vigila `catalogo/` con watcher; reindexado incremental (solo re-embed de fichas cambiadas). Sin cuentas: el autor captura desde el formulario (escribe ficheros a la carpeta, nunca a una BBDD propia); quien abre el navegador en la red local busca.
- **Captura**: formulario con núcleo, cuerpo precargado con la plantilla, claves custom libres, link opcional.
- **Caption**: gancho = primera frase del "Por qué", resto del cuerpo, "Para cuando:", "Escucha:", firma "titulo — artista", link, 4 hashtags (#canciondeldia #itsoundslike + título y artista normalizados). Es un borrador pegable que el autor retoca. Cero emojis. Unslop en todos los textos del producto (preferencia permanente del esfuerzo).
- **Soundprint**: tres capas — palabras del autor (primera frase del "Por qué" del último top 3, en Departure Mono), dimensiones (media de numéricas y valor dominante de categóricas, formato ficha técnica) y lienzo generativo (shader fbm: una mancha por canción matcheada, posición/forma por hash del slug, color por su energia, grosor por repetición). Historial por navegador (localStorage). Export PNG que composiciona lienzo y texto. Issue conocido del prototipo a corregir en construcción: el lienzo apenas cambia entre búsquedas con resultados solapados; fixes decididos: pulso de frescura en los últimos matches, fondo sembrado por el hash de la query, más contraste, entrada animada de manchas nuevas.
- **Privacidad**: nada sale del equipo en v1.

## Testing Decisions

- Un seam principal: **el servicio de búsqueda** (catálogo → índice → rank con filtros). Es la superficie donde vive toda la lógica; la UI ya está validada por prototipo. Test de comportamiento externo: dada una carpeta de fichas y una consulta, el ranking y los filtros que salen; nada de interiors del modelo.
- Prior art: la suite de `eval/` (19 consultas con matches esperados, recall@3) ya prueba exactamente en ese seam y es el test de calidad de referencia. La implementación debe exponerse para que la suite la use; el recall@3 del cuerpo-completo-sin-prepend (0.754) es el suelo que ninguna refactorización puede bajar.
- El parser de fichas se prueba en el mismo seam (núcleo obligatorio, `_` ignorados, claves custom a dimensiones) y el render de caption como función pura ficha → texto (snapshots de 2-3 fichas representativas, incluida una sin secciones y una sin link).
- UI, sonido del watcher y export PNG: verificación manual; el coste de automatizarlos supera el valor en v1.

## Out of Scope

- Publicar el producto (hosting, dominio, roles de oráculo, escala pública): esfuerzo nuevo con su propio mapa.
- Feedback de usuarios y aprendizaje (re-ranking, fine-tuning): pertenece al esfuerzo de publicación.
- Trayectoria temporal del soundprint (la "línea de plegamiento"): v2, necesita semanas de uso real.
- Tuning de calidad y enriquecimiento de fichas (género, año, audio-features): iteración post-v1 con la suite de `eval/`.
- Migración a BD NoSQL, multiplataforma de contenido, y el canal Instagram del autor (la herramienta le sirve; su contenido es suyo).

## Further Notes

- Fuentes primarias de las decisiones: ramas `prototype/formato-de-ficha` (formato y voz), `prototype/ui-de-busqueda` (UI ganadora y soundprint), `research/embeddings` y `research/referencia-cancion` (informes con fuentes), y las Answers de los 10 tickets del mapa `.scratch/it-sounds-like/map.md`.
- Efecto imán conocido: fichas ricas en vocabulario musical concentran matches en catálogos pequeños (Malamente en 8+ top-3 con falsos positivos). Anotado para la iteración de calidad; no bloquea v1.
- El seed de 23 fichas en `catalogo/` es desechable: cuando el autor empiece, sus fichas sustituyen a las del seed.
