# Qué se embedea y con qué peso

Type: grilling
Status: resolved
Labels: wayfinder:grilling
Blocked by: 02

## Question

Nacido de la reacción al ticket 01. ¿Qué entra en el embedding de una ficha y con qué peso relativo: el cuerpo entero tal cual, las secciones ponderadas (lo emocional más que lo técnico), el núcleo concatenado? ¿Y las claves custom (`nivel_de_fiesta`, `energia`, `momento_del_dia`): se ignoran, se concatenan al texto, o son dimensiones de filtrado/re-ranking en el retrieve (p.ej. filtrar por `energia` antes de ordenar por similitud)? Decide el usuario (AI Engineer), apoyado en el inventario del ticket 02. Definir también qué se embedea del lado de la query: el texto libre de quien busca, y si se le pueden pasar filtros por dimensión. Al resolver, actualizar `CONTEXT.md` si nacen términos (p.ej. "dimensión").

## Answer

Resuelto por medición, no por intuición (2026-08-23). El usuario fijó el modelo y delegó el resto en los datos: "crea suites y toma decisiones tú". Suite en `eval/` (19 consultas reales en español con matches esperados, recall@3 contra las 23 fichas del seed; re-ejecutable con `npm run eval` dentro de `eval/`).

**Decisiones:**

- **Modelo** (usuario): `multilingual-e5-small` local vía transformers.js (q8), prefijos `query:`/`passage:`, cosine en memoria. `bge-m3` queda como plan B.
- **Un embedding por ficha con el cuerpo completo, sin pesos por sección.** Medido: A (cuerpo completo) 0.693–0.754 de recall@3 según variante, contra 0.579–0.649 de las cuatro ponderaciones por secciones probadas. Todas las variantes B pierden; la complejidad no se paga.
- **Sin prepend del núcleo en el texto embedeado** (revierte el acuerdo previo, con datos): el prepend del "título — artista" baja el recall global (0.693 vs 0.754) a cambio de subir consultas por artista del puesto 2 al 1. Sin prepend, "algo como Miles Davis" sigue devolviendo So What en top-3. El tradeoff no compensa, y si algún día importa, re-embedear y re-medir cuesta minutos con la suite.
- **Claves custom = dimensiones, no texto**: los valores numéricos o de pequeño vocabulario (`energia`, `momento_del_dia`, `nivel_de_fiesta`) no se embedean; filtran el retrieve y estructuran el soundprint. Solo una clave de texto libre se concatenaría al cuerpo (caso raro). Término "Dimensión" registrado en `CONTEXT.md`.
- **Lado de la query**: texto libre + panel de filtros auto-descubierto de las dimensiones presentes en el catálogo. Top 3 ajustable (ya decidido en el mapa).

**Observación para la niebla**: Malamente actúa de imán (aparece en 8+ top-3, algunos falsos positivos claros como "música tranquila para concentrarme"): con catálogos pequeños las fichas ricas en vocabulario musical concentran matches. A vigilar en la niebla de calidad de búsqueda.
