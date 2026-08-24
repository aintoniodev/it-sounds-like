# Publicación de it sounds like

Labels: wayfinder:map

## Destination

La web pública de it sounds like corriendo gratis en Cloudflare: buscador estático en Pages (subdominio gratuito), queries embedeadas en el edge con Workers AI, catálogo deployado por push del autor (captura local, sin login de oráculo), un backend mínimo en Workers que recoge feedback por match, y un primer mecanismo de re-ranking que aprende de ese feedback. El PNG del soundprint lleva la firma del canal del autor. Coste: gratis mientras sea posible, dicho explícitamente.

## Notes

- Hereda todo de `.scratch/it-sounds-like/map.md` (formato de ficha, embeddings, UI Escenario, Departure Mono, soundprint). Vocabulario en `CONTEXT.md`.
- **Stack**: Cloudflare Pages + Workers + Workers AI (bge-m3, 10k neurons/día gratis, endpoint OpenAI-compatible, ya inventariado en el mapa v1).
- **La captura NO se publica**: el autor sigue escribiendo fichas en local y publica con push + CI. El login de oráculo no compra nada por ahora (decisión del usuario, Q1c).
- **El usuario es AI Engineer**: la señal de feedback y el mecanismo de re-ranking son su territorio; entregar datos y trade-offs, decide él.
- **Privacidad**: las queries son sentimientos. El feedback se recoge anónimo o no se recoge.
- Unslop en todos lados (preferencia heredada del mapa v1). Textos en español.
- Skills por tipo: `research` → "research"; `prototype` → "prototype"; `grilling` → "grilling" + "domain-modeling".

## Decisions so far

<!-- una línea por ticket cerrado: gist + link -->

- [Límites reales de Cloudflare para nuestra carga](issues/01-limites-reales-de-cloudflare-para-nuestra-carga.md): el free tier aguanta el perfil (neurons al 1,6 %, requests al 6 %, Pages al 6 %); feedback en D1, no KV (KV roza sus 1.000 writes/día). Informe: rama `research/cf-limits`, `docs/research/cf-limits.md`.
- [Embeddings del deploy: bge-m3 en build](issues/04-embeddings-del-deploy-bge-m3-en-build.md): fichas embedeadas en CI llamando a Workers AI (identidad cross-runtime no garantizada; cache por hash + sonda de drift); eval local bge-m3 0.719 < suelo e5 0.754, decisión de modelo abierta hasta la pasada contra Workers AI. Informe: rama `research/embeddings-deploy`, `docs/research/embeddings-deploy.md`.
- [Señal de feedback](issues/02-senal-de-feedback-que-como-y-privacidad.md): "clavo"/"no me encaja" por resultado; evento {query en claro, ficha, acción, ts, rank_pre_boost, visitante-hash localStorage}; sin IP/cookies/UA; retención 90 días con cron; feedback en **D1** (KV roza 1.000 writes/día); privacidad de cinco líneas en el footer.
- [El sitio público (prototipo)](issues/06-el-sitio-publico-prototipo.md): Escenario + botones clavo/no-encaja (stub a Worker+D1), privacidad de cinco líneas, soundprint con firma "it sounds like · @cuenta" en pantalla y PNG. Validado en vivo. Además: la capa .tapa del Escenario interceptaba todos los clics; corregido en ambas páginas.
- [Re-ranking con feedback](issues/03-re-ranking-con-feedback-primer-mecanismo.md): memory-based en el Worker — coseno + α·Σ wᵢ·feedbackᵢ (wᵢ = sim(query,pasada) decaída); negativa pesa más solo en su contexto; shrinkage α·n/(n+K) sin flags; replay en eval/ con suelo 0.754; rank pre-boost auditado por SQL.

- [Repo GitHub + CI + Cloudflare Pages](issues/05-repo-github-ci-y-cloudflare-pages.md): repo público (auditado sin fugas) + CI en cada push (npm ci, suite, índice, deploy) + Pages verificado en https://it-sounds-like.pages.dev. Recall definitivo contra Workers AI: 0.737 < suelo 0.754; decisión de modelo para el DoD.

## Not yet specified

- **ε-greedy**: solo si la telemetría (rank pre-boost) muestra rich-get-richer.
- **Elección definitiva del modelo público**: la suite local dio 0.719 con bge-m3 (ONNX) contra el suelo 0.754 de e5-small; la pasada que vale es contra Workers AI real, tras el wizard del ticket 05. Si no supera el suelo, decide el usuario (aceptar la diferencia por cliente ligero, o híbrido).
- **Analytics del sitio**: probablemente nada o mínimo; se decide al cerrar el mapa.

## Out of scope

- **Login de oráculo / captura online**: el autor captura en local; publicar es push + CI. Vuelve a plantearse si el autor lo pide.
- **Dominio propio**: subdominio gratuito primero; cambiar es diez minutos de DNS cuando importe.
- **Fine-tuning de embeddings**: el mapa incluye el PRIMER mecanismo de aprendizaje (re-ranking); entrenar modelos propios es esfuerzo posterior.
- **Pagar por infraestructura**: gratis mientras sea posible; lo que encarezca el coste se queda fuera o espera.

## (referencias del esfuerzo v1)

Spec construible: `.scratch/it-sounds-like/spec.md`. Mapa v1 (10/10 resuelto): `.scratch/it-sounds-like/map.md`.
