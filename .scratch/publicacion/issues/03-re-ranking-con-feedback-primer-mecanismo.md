# Re-ranking con feedback: primer mecanismo

Type: grilling
Status: claimed
Labels: wayfinder:grilling
Blocked by: 02

## Question

El primer mecanismo de aprendizaje a partir de la señal del ticket 02 (decisión del usuario, AI Engineer): ¿boost por ficha (las que la gente marca "clavo" suben), boost por (query-cluster, ficha) (las parecidas a queries pasadas bien puntuadas suben), un bandit por resultado, o log + re-ranking offline periódico? Restricciones: sin cuentas (no hay usuario identificable más allá de un hash anónimo opcional), coste cero (Workers gratis), y arranque en frío (días con cero feedback: el ranking debe ser el cosine puro). Definir también el umbral de activación (cuánta señal acumulada antes de encender el mecanismo, y si arranca tras un flag). Al resolver, valorar ADR: es difícil de revertir una vez la gente ve rankings "aprendidos".

- Decisiones del usuario (2026-08-23), agnósticas al almacenamiento: (1) mecanismo memory-based en el Worker: score final = coseno + α·Σ wᵢ·feedbackᵢ con wᵢ = cos(query actual, query pasada) decaída por antigüedad; función pura del feedback store, sin entrenamiento; (2) la negativa pesa más (β > α) SOLO dentro del ponderado por similitud, jamás penalización global (una canción puede no encajar para dormir y clavar para correr); (3) arranque en frío por shrinkage: α_efectivo = α·n/(n+K), siempre activo, sin flags ni umbrales, K en el rango 5–15 eventos por contexto; (4) ε-greedy fuera: si aparece rich-get-richer en la telemetría, entra en una tarde (niebla); (5) evaluación por replay offline extendiendo la suite de eval/ con feedback sintético (el suelo de recall 0.754 no se puede romper) + telemetría mínima: cada evento guarda el rank pre-boost de la ficha mostrada. Sin ADR: apagar el mecanismo es α=0, reversible por construcción.
