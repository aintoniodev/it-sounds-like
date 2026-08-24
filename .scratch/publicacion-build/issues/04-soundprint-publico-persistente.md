# 04: Soundprint público persistente

**What to build:** los matches del visitante pintan su soundprint en la web pública, lo esperan si vuelve días después (hash en localStorage) para verlo crecer, y se exportan como PNG con la firma del canal — `instagram.com/itdoesoundlike`, constante única compartida con el build, en pantalla y en el PNG. La firma vive en una sola fuente de verdad.

**Blocked by:** 01 (Tracer: primera búsqueda en la web pública).

**Status:** done

- [x] Marcar un clavo actualiza el soundprint del visitante en el sitio
- [x] El soundprint sobrevive recargar y volver días después (localStorage del hash)
- [x] El PNG exportado lleva la firma del canal, sin duplicar la constante

## Comments

**2026-08-24 (agente):** en el sitio público solo el clavo pinta el soundprint (el match confirmado, no cualquier búsqueda) — la letra pedía exactamente eso; v1 sigue registrando cada búsqueda. La firma vive en `web/src/canal.ts` (única fuente, una sola aparición en el bundle verificado) y se muestra en pantalla y en el PNG. El review pilló que re-clavar una ficha inflaba el contador y el peso por repetición: registrarBusqueda ahora acumula por query y el guard de aria-pressed evita también el evento duplicado a D1. No-Goal documentado: marcar "no me encaja" tras un clavo no retrae la mancha (la señal negativa alimenta el re-ranking del 05, no el soundprint).
