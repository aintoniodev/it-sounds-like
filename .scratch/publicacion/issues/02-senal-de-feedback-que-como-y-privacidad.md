# Señal de feedback: qué, cómo y privacidad

Type: grilling
Status: claimed
Labels: wayfinder:grilling
Blocked by: 01

## Question

Diseñar la señal de feedback por match: qué ve y toca quien busca (¿dos botones por resultado: "clavo" / "no me encaja"? ¿solo negativo para no invitar a cortesía?), qué se guarda exactamente por evento (query, ficha, acción, timestamp… ¿hash anónimo de visitante sin cookies?), en qué se guarda (KV vs D1, según los límites del ticket 01), retención, y la página de privacidad mínima honesta. Las queries son sentimientos: decidir hasta dónde llega el anonimato lo decide el usuario con los datos del 01 delante. Al resolver, actualizar `CONTEXT.md` si nacen términos (p.ej. "señal", "match").

## Comments

- Sesión del 2026-08-23: se adelantan las decisiones independientes del ticket 01 (señal, guardado, identidad, privacidad, retención). La elección KV vs D1 y la confirmación de límites cierran el ticket cuando el research aterrice.

- Decisiones del usuario (2026-08-23), independientes del ticket 01: dos botones por resultado ("clavo" / "no me encaja") en texto plano; tupla {query en claro, ficha, acción, ts} sin IP, sin cookies, sin user-agent; visitante identificado por hash aleatorio en localStorage (borrable por el propio visitante); retención 90 días con purge por cron en el Worker; página de privacidad de cinco líneas en el footer. Pendiente para resolver: KV vs D1 y verificación de límites (ticket 01).
