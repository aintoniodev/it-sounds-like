# Re-ranking con feedback: primer mecanismo

Type: grilling
Status: resolved
Labels: wayfinder:grilling
Blocked by: 02

## Question

El primer mecanismo de aprendizaje a partir de la señal del ticket 02 (decisión del usuario, AI Engineer): ¿boost por ficha (las que la gente marca "clavo" suben), boost por (query-cluster, ficha) (las parecidas a queries pasadas bien puntuadas suben), un bandit por resultado, o log + re-ranking offline periódico? Restricciones: sin cuentas (no hay usuario identificable más allá de un hash anónimo opcional), coste cero (Workers gratis), y arranque en frío (días con cero feedback: el ranking debe ser el cosine puro). Definir también el umbral de activación (cuánta señal acumulada antes de encender el mecanismo, y si arranca tras un flag). Al resolver, valorar ADR: es difícil de revertir una vez la gente ve rankings "aprendidos".

- Decisiones del usuario (2026-08-23), agnósticas al almacenamiento: (1) mecanismo memory-based en el Worker: score final = coseno + α·Σ wᵢ·feedbackᵢ con wᵢ = cos(query actual, query pasada) decaída por antigüedad; función pura del feedback store, sin entrenamiento; (2) la negativa pesa más (β > α) SOLO dentro del ponderado por similitud, jamás penalización global (una canción puede no encajar para dormir y clavar para correr); (3) arranque en frío por shrinkage: α_efectivo = α·n/(n+K), siempre activo, sin flags ni umbrales, K en el rango 5–15 eventos por contexto; (4) ε-greedy fuera: si aparece rich-get-richer en la telemetría, entra en una tarde (niebla); (5) evaluación por replay offline extendiendo la suite de eval/ con feedback sintético (el suelo de recall 0.754 no se puede romper) + telemetría mínima: cada evento guarda el rank pre-boost de la ficha mostrada. Sin ADR: apagar el mecanismo es α=0, reversible por construcción.

## Answer

Primer mecanismo de aprendizaje, cerrado (usuario, AI Engineer, 2026-08-23; almacenamiento concreto del 02):

- **Mecanismo**: memory-based en el Worker. `score = coseno + α_efectivo · Σ wᵢ · feedbackᵢ`, con `wᵢ = cos(query_actual, query_pasada)` decaída por antigüedad de 90 días. Función pura de (D1, query actual): sin entrenamiento, sin estado extra, coste despreciable a nuestra escala. El boost por ficha global queda de ingrediente residual si la señal por query es escasa.
- **Negativas**: pesan más (β > α) SOLO dentro del ponderado por similitud de query. Jamás penalización global.
- **Arranque en frío**: shrinkage `α_efectivo = α · n/(n+K)`, K en 5–15 por contexto. Siempre activo, sin flags ni umbrales; a señal cero es cosine puro por construcción.
- **Telemetría**: cada evento guarda el rank pre-boost; el efecto se audita con una SQL. ε-greedy fuera: si la telemetría muestra rich-get-richer, entra en una tarde (queda en niebla).
- **Evaluación**: replay offline extendiendo la suite de `eval/` con feedback sintético; el suelo de recall 0.754 (e5-small, cuerpo completo) no se puede romper. Sin A/B en el sitio.
- **Sin ADR**: apagar el mecanismo es poner α a cero; reversible por construcción.
