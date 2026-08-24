# 02: Línea honesta recalibrada y sorpréndeme

**What to build:** las búsquedas que no encajan con el catálogo reciben la línea honesta en la web pública — no un mal match disfrazado de respuesta — y quien quiere salir de su burbuja tiene un botón sorpréndeme que le devuelve algo del índice fuera de lo obvio. El umbral de la v1 (top-1 de consultas reales vs fuera de tema) se recalibra para el espacio de bge-m3 con el mismo método antes de estos textos.

**Blocked by:** 01 (Tracer: primera búsqueda en la web pública).

**Status:** ready-for-agent

- [ ] Umbral recalibrado para bge-m3 con el método de la v1 (consultas reales dentro, fuera de tema fuera) y documentado
- [ ] Una query fuera de tema recibe la línea honesta, no resultados forzados
- [ ] El botón sorpréndeme devuelve una ficha del catálogo y es demoable
