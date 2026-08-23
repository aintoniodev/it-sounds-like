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

## Not yet specified

- **Activación del re-ranking**: cuánto feedback acumulado hace falta antes de que el mecanismo se encienda (y si empieza apagado detrás de flag) — niebla hasta ver la forma de la señal (ticket 03).
- **Verificación de calidad del modelo público**: re-ejecutar la suite de `eval/` con bge-m3 para confirmar que el suelo de recall no baja — se afila cuando el ticket 04 defina la vía de embeddings del deploy.
- **Analytics del sitio**: probablemente nada o mínimo; se decide al cerrar el mapa.

## Out of scope

- **Login de oráculo / captura online**: el autor captura en local; publicar es push + CI. Vuelve a plantearse si el autor lo pide.
- **Dominio propio**: subdominio gratuito primero; cambiar es diez minutos de DNS cuando importe.
- **Fine-tuning de embeddings**: el mapa incluye el PRIMER mecanismo de aprendizaje (re-ranking); entrenar modelos propios es esfuerzo posterior.
- **Pagar por infraestructura**: gratis mientras sea posible; lo que encarezca el coste se queda fuera o espera.

## (referencias del esfuerzo v1)

Spec construible: `.scratch/it-sounds-like/spec.md`. Mapa v1 (10/10 resuelto): `.scratch/it-sounds-like/map.md`.
