# 04: Soundprint público persistente

**What to build:** los matches del visitante pintan su soundprint en la web pública, lo esperan si vuelve días después (hash en localStorage) para verlo crecer, y se exportan como PNG con la firma del canal — `instagram.com/itdoesoundlike`, constante única compartida con el build, en pantalla y en el PNG. La firma vive en una sola fuente de verdad.

**Blocked by:** 01 (Tracer: primera búsqueda en la web pública).

**Status:** ready-for-agent

- [ ] Marcar un clavo actualiza el soundprint del visitante en el sitio
- [ ] El soundprint sobrevive recargar y volver días después (localStorage del hash)
- [ ] El PNG exportado lleva la firma del canal, sin duplicar la constante
