# 07: DoD del esfuerzo de publicación

**What to build:** verificación integral contra los nueve criterios de aceptación del mapa de publicación: el sitio despliega desde main por CI en cada push; el suelo público de recall (0.737) aparece en el summary de cada run y ninguna parte del build lo baja; el feedback fluye a D1 con su purge; el re-ranking arranca en frío como cosine puro; el PNG va firmado; la privacidad está publicada; y los márgenes de carga del tier (61× en neurons, 6% en requests) quedan citados. Sin telemetría de terceros: la tabla de feedback es la analítica.

**Blocked by:** 02 (Línea honesta y sorpréndeme), 03 (Feedback: clavo / no me encaja en D1), 04 (Soundprint público persistente), 05 (Re-ranking con shrinkage), 06 (Privacidad: página y borrado), 08 (Refactor: núcleo compartido de rank/filtros/dimensiones).

**Status:** done

- [x] Un push a main despliega sitio, índice y Worker, con el recall del run en el summary del CI
- [x] Arranque en frío verificado: primer visitante sin feedback recibe cosine puro
- [x] PNG firmado y privacidad publicada, comprobados en el sitio desplegado
- [x] Márgenes de carga documentados y accesibles desde el repo
- [x] Cero telemetría de terceros en el sitio (verificable en la red del navegador)

## Comments

**2026-08-24 (agente, cierre del esfuerzo):** verificado criterio a criterio sobre el sitio desplegado. **Deploy+summary**: cada push a main despliega sitio, índice, functions y cron; el summary del CI lleva el recall de la suite (harness, suelo e5 0.754) y desde este run el suelo público en frío y el salto con feedback (replay paso de CI, falla si baja o no sube). **Arranque en frío**: producción con la tabla a cero devuelve el cosine exacto de la calibración ("algo como Miles Davis" → 0.434, el mismo decimal que midió `eval/calibrar-umbral.mjs`); estructural además: `rerankear` con eventos vacíos devuelve las entradas intactas (testeado). **PNG y privacidad**: `CANAL_IG` aparece una sola vez en el bundle (única fuente, pantalla + PNG) y `/privacidad` responde 200 enlazada desde el pie. **Márgenes**: tabla perfil→límite→margen (61× neurons, 6 % requests, 0,3–3 % D1) en el README, con la verificación de fuentes primarias en el ticket 01 del mapa. **Telemetría**: cero dominios de terceros en el bundle (grep sobre los assets construidos); fuentes autoalojadas, three.js bundleado, la única red es la propia. Los ocho tickets del esfuerzo: done.
