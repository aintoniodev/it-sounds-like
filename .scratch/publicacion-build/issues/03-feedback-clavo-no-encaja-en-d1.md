# 03: Feedback: clavo / no me encaja en D1

**What to build:** cada resultado del sitio público lleva sus dos botones; al pulsarlos, un Worker de feedback appendea a D1 la tupla `{query en claro, ficha, acción, ts, rank_pre_boost, visitante}` — sin IP, sin cookies, sin user-agent — y un cron trigger purga lo que supera 90 días, cumpliendo la promesa sin operar nada. El pie del sitio muestra las cinco líneas de privacidad. El visitante es un hash aleatorio en localStorage.

**Blocked by:** 01 (Tracer: primera búsqueda en la web pública).

**Status:** ready-for-agent

- [ ] Pulsar clavo o no me encaja persiste la tupla completa (incluido rank_pre_boost) en D1
- [ ] El Worker rechaza eventos malformados
- [ ] El cron de purge elimina filas de más de 90 días (verificado una vez con wrangler local)
- [ ] Las cinco líneas de privacidad aparecen en el pie del sitio público
- [ ] Ningún evento guarda IP, cookies ni user-agent
