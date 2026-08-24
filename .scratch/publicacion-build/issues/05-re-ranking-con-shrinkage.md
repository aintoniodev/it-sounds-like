# 05: Re-ranking con shrinkage

**What to build:** el sitio aprende de lo que la gente marca: el Worker de buscar re-rankea con `coseno + α·n/(n+K) · Σ wᵢ·feedbackᵢ`, donde `wᵢ = cos(query_actual, query_pasada)` decae por antigüedad de 90 días y la negativa pesa más (β > α) solo dentro de su contexto de query. Arranca en frío como cosine puro por construcción; poner α a cero apaga el aprendizaje sin desplegar cirugía. La matemática vive como función pura (índice + feedback store → ranking), probada sin HTTP ni D1 real.

**Blocked by:** 03 (Feedback: clavo / no me encaja en D1).

**Status:** done

- [x] Replay en `eval/` con feedback sintético: sin feedback el recall no baja; con feedback de la suite sube los aciertos marcados
- [x] Unidades del shrinkage: señal cero = cosine exacto, K domina con pocos eventos, saturación con muchos
- [x] La penalización negativa nunca actúa fuera de su contexto de query
- [x] α = 0 desactiva el mecanismo y el ranking es idéntico al cosine puro
- [x] El Worker de `/buscar` usa el re-ranking en producción

## Comments

**2026-08-24 (agente):** la matemática vive en `functions/rank.mjs` (`rerankear` + `RERANK`: α=0.1, γ=2, K=5), probada pura en `test/rerank.test.mjs` (señal cero, α=0, unidades de K/saturación, negativa fuera de contexto por w², decay 90 días desde `RETENCION_MS`). Dos lecturas documentadas de la letra: los Σ son **medias** (S̄ acotada a [0,1]) — un Σ crudo crecería lineal con n y no saturaría nunca, contradiciendo el criterio de saturación — y "β > α" es β = α·γ con la negativa ponderada por wᵢ²: a contexto pleno pesa γ, a mitad γ/4, fuera ~0. El edge guarda `qvec` (embedding de la query al recibir el feedback, migración aplicada) y `/api/buscar` re-rankea; la línea honesta se decide ahora en el edge sobre el cosine puro (`honesto` en la respuesta) — el boost del feedback no disfraza un mal match. Replay `eval/replay-rerank.mjs` con ground truth de la suite: 0.737 sin feedback → 0.781 con (dos aciertos marcados entran al top 3), exigido como paso de CI. Verificado en producción: 4 clavos sobre "nostalgia de verano y de mar" suben Mediterráneo de 0.552 a 0.597 (+α·(4/9), exacto). El aviso del reviewer sobre `main.ts` no aplica: la v1 habla con su servidor local (sin re-ranking), no con el edge.
