# 07: DoD del esfuerzo de publicación

**What to build:** verificación integral contra los nueve criterios de aceptación del mapa de publicación: el sitio despliega desde main por CI en cada push; el suelo público de recall (0.737) aparece en el summary de cada run y ninguna parte del build lo baja; el feedback fluye a D1 con su purge; el re-ranking arranca en frío como cosine puro; el PNG va firmado; la privacidad está publicada; y los márgenes de carga del tier (61× en neurons, 6% en requests) quedan citados. Sin telemetría de terceros: la tabla de feedback es la analítica.

**Blocked by:** 02 (Línea honesta y sorpréndeme), 03 (Feedback: clavo / no me encaja en D1), 04 (Soundprint público persistente), 05 (Re-ranking con shrinkage), 06 (Privacidad: página y borrado), 08 (Refactor: núcleo compartido de rank/filtros/dimensiones).

**Status:** ready-for-agent

- [ ] Un push a main despliega sitio, índice y Worker, con el recall del run en el summary del CI
- [ ] Arranque en frío verificado: primer visitante sin feedback recibe cosine puro
- [ ] PNG firmado y privacidad publicada, comprobados en el sitio desplegado
- [ ] Márgenes de carga documentados y accesibles desde el repo
- [ ] Cero telemetría de terceros en el sitio (verificable en la red del navegador)
