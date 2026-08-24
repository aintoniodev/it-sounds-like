# 02: Línea honesta recalibrada y sorpréndeme

**What to build:** las búsquedas que no encajan con el catálogo reciben la línea honesta en la web pública — no un mal match disfrazado de respuesta — y quien quiere salir de su burbuja tiene un botón sorpréndeme que le devuelve algo del índice fuera de lo obvio. El umbral de la v1 (top-1 de consultas reales vs fuera de tema) se recalibra para el espacio de bge-m3 con el mismo método antes de estos textos.

**Blocked by:** 01 (Tracer: primera búsqueda en la web pública).

**Status:** done

- [x] Umbral recalibrado para bge-m3 con el método de la v1 (consultas reales dentro, fuera de tema fuera) y documentado
- [x] Una query fuera de tema recibe la línea honesta, no resultados forzados
- [x] El botón sorpréndeme devuelve una ficha del catálogo y es demoable

## Comments

**2026-08-24 (agente):** recalibrado con `eval/calibrar-umbral.mjs` (mismo método que la v1: top-1 de las 19 consultas reales de la suite vs fuera de tema, contra Workers AI). En el espacio de bge-m3 las distribuciones se solapan 0.006: peor real 0.434 ("algo como Miles Davis"), mejor fuera de tema 0.440 ("previsión del tiempo para mañana"). No existe umbral limpio. Decisión: la suite es el contrato de producto — ninguna consulta real puede caer bajo la línea — así que UMBRAL = 0.43 (suelo de las reales) y el intercambio queda documentado en `functions/rank.mjs`: esa query del tiempo pasa con un match débil, el resto del set fuera de tema (≤ 0.398) recibe la línea honesta. Si el catálogo crece, recalibrar y revisar la decisión.
