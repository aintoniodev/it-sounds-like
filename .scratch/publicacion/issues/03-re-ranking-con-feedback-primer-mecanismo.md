# Re-ranking con feedback: primer mecanismo

Type: grilling
Status: claimed
Labels: wayfinder:grilling
Blocked by: 02

## Question

El primer mecanismo de aprendizaje a partir de la señal del ticket 02 (decisión del usuario, AI Engineer): ¿boost por ficha (las que la gente marca "clavo" suben), boost por (query-cluster, ficha) (las parecidas a queries pasadas bien puntuadas suben), un bandit por resultado, o log + re-ranking offline periódico? Restricciones: sin cuentas (no hay usuario identificable más allá de un hash anónimo opcional), coste cero (Workers gratis), y arranque en frío (días con cero feedback: el ranking debe ser el cosine puro). Definir también el umbral de activación (cuánta señal acumulada antes de encender el mecanismo, y si arranca tras un flag). Al resolver, valorar ADR: es difícil de revertir una vez la gente ve rankings "aprendidos".
