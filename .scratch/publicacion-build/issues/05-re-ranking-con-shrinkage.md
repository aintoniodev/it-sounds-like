# 05: Re-ranking con shrinkage

**What to build:** el sitio aprende de lo que la gente marca: el Worker de buscar re-rankea con `coseno + α·n/(n+K) · Σ wᵢ·feedbackᵢ`, donde `wᵢ = cos(query_actual, query_pasada)` decae por antigüedad de 90 días y la negativa pesa más (β > α) solo dentro de su contexto de query. Arranca en frío como cosine puro por construcción; poner α a cero apaga el aprendizaje sin desplegar cirugía. La matemática vive como función pura (índice + feedback store → ranking), probada sin HTTP ni D1 real.

**Blocked by:** 03 (Feedback: clavo / no me encaja en D1).

**Status:** ready-for-agent

- [ ] Replay en `eval/` con feedback sintético: sin feedback el recall no baja; con feedback de la suite sube los aciertos marcados
- [ ] Unidades del shrinkage: señal cero = cosine exacto, K domina con pocos eventos, saturación con muchos
- [ ] La penalización negativa nunca actúa fuera de su contexto de query
- [ ] α = 0 desactiva el mecanismo y el ranking es idéntico al cosine puro
- [ ] El Worker de `/buscar` usa el re-ranking en producción
