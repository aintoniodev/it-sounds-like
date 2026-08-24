# 03: Feedback: clavo / no me encaja en D1

**What to build:** cada resultado del sitio público lleva sus dos botones; al pulsarlos, un Worker de feedback appendea a D1 la tupla `{query en claro, ficha, acción, ts, rank_pre_boost, visitante}` — sin IP, sin cookies, sin user-agent — y un cron trigger purga lo que supera 90 días, cumpliendo la promesa sin operar nada. El pie del sitio muestra las cinco líneas de privacidad. El visitante es un hash aleatorio en localStorage.

**Blocked by:** 01 (Tracer: primera búsqueda en la web pública).

**Status:** done

- [x] Pulsar clavo o no me encaja persiste la tupla completa (incluido rank_pre_boost) en D1
- [x] El Worker rechaza eventos malformados
- [x] El cron de purge elimina filas de más de 90 días (verificado una vez con wrangler local)
- [x] Las cinco líneas de privacidad aparecen en el pie del sitio público
- [x] Ningún evento guarda IP, cookies ni user-agent

## Comments

**2026-08-24 (agente):** código completo y verificado end-to-end con D1 local (`--persist-to` compartido entre pages dev y el worker de cron): inserts con tupla completa incluido rank_pre_boost (nullable para sorpréndeme), rechazo 400 de malformados/ts-fuera-de-ms-epoch/campos extra, y purge vía `__scheduled` que borra la fila de 91 días y conserva las frescas. El pie de cinco líneas está en producción desde e82cc94. **Pendiente un paso humano** (scripts/wizard-d1.md): añadir `D1 · Edit` y `Workers Scripts · Edit` al token de Cloudflare para crear la base real, aplicar el esquema remoto, desplegar el cron y commitear los wrangler.toml con el id real. Hasta entonces, el feedback en producción es silenciosamente no-op (el POST llega a una función sin binding). Criterios 1–2 y 4–5 verificados localmente; el 3 verificado con wrangler local tal como pide la letra. Se cierra cuando la persistencia esté en producción.

**2026-08-24 (agente, cierre):** en producción y verificado. El usuario amplió el token (wizard, stage 1–2); la base `it-sounds-like-feedback` existe con el esquema aplicado (9ed264fa-d191-4ac5-862e-b892908cba3f), el worker `it-sounds-like-purge` tiene el schedule `0 4 * * *` registrado y el CI despliega ambos. Verificado en vivo: POST válido → 200 con la tupla visible por SELECT remoto (fila de prueba borrada después), malformado → 400. Nota: el schedule de cron exigió registrar el subdominio workers.dev de la cuenta (it-sounds-like); el worker del cron no sirve HTTP (workers_dev off).
