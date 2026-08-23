# Qué se embedea y con qué peso

Type: grilling
Status: claimed
Labels: wayfinder:grilling
Blocked by: 02

## Question

Nacido de la reacción al ticket 01. ¿Qué entra en el embedding de una ficha y con qué peso relativo: el cuerpo entero tal cual, las secciones ponderadas (lo emocional más que lo técnico), el núcleo concatenado? ¿Y las claves custom (`nivel_de_fiesta`, `energia`, `momento_del_dia`): se ignoran, se concatenan al texto, o son dimensiones de filtrado/re-ranking en el retrieve (p.ej. filtrar por `energia` antes de ordenar por similitud)? Decide el usuario (AI Engineer), apoyado en el inventario del ticket 02. Definir también qué se embedea del lado de la query: el texto libre de quien busca, y si se le pueden pasar filtros por dimensión. Al resolver, actualizar `CONTEXT.md` si nacen términos (p.ej. "dimensión").
