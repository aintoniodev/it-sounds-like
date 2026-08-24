# 08: Refactor: núcleo compartido de rank/filtros/dimensiones

**What to build:** el code review del tracer 01 dejó tres duplicaciones del mismo núcleo lógico: `pasaFiltros` y `calcularDimensiones` existen casi verbatim en `server/servicio.mjs` y `web/src/publico.ts`, y la aritmética de vectores (`dot` en la v1, `coseno` en el edge) diverge entre las dos. Un cambio de semántica de filtrado o ranking ahora exige shotgun surgery sobre tres sitios. Extraer un módulo compartido (JS puro importable por `server/`, `functions/` y —vía un archivo .ts que lo reexporte o duplicando el contrato con un test de paridad— el cliente), y colapsar el markup de botones de feedback duplicado en `publico.ts` (`abrirPanel` y la lista de resultados pintan el mismo par clavo/no-me-encaja) en un helper. El contrato `{min, max, en}` de filtros viaja hoy como JSON crudo entre cliente y edge: si el módulo compartido aporta el tipo gratis, usarlo; si cuesta más de lo que da, dejarlo.

Origen: hallazgos del review de b34794f..e9495e8 (eje Standards). No los arreglé en el 01/02 para no ensuciar el tracer; este ticket existe para que no se pudra.

**Blocked by:** None (can start immediately; conviene hacerlo antes de que 05 construya re-ranking sobre rank.mjs).

**Status:** done

- [x] `pasaFiltros`, `calcularDimensiones` y la aritmética cosine/dot viven en un único módulo consumido por server, functions y (directa o indirectamente) cliente
- [x] El par de botones de feedback se pinta desde un solo helper en `publico.ts`
- [x] La suite completa sigue verde y el recall del harness no cambia (es refactor, no semántica)

## Comments

**2026-08-24 (agente):** el hogar único es `functions/rank.mjs` (puro, ya probado sin HTTP): `server/servicio.mjs` importa pasaFiltros/calcularDimensiones/coseno y pierde su `dot` local (vectores e5 normalizados ⇒ mismo ranking; paridad medida con `npm run eval` antes y después del stash: 0.772 idéntico, suelo 0.75). El cliente importa `calcularDimensiones` con contrato tipado vía `functions/rank.d.mts`. El markup del par clavo/no-me-encaja vive en `fbDe` (panel y lista lo usan). El contrato `{min,max,en}` viaja tipado en el cliente; no hizo falta el tipo compartido adicional que el ticket dejaba opcional.
