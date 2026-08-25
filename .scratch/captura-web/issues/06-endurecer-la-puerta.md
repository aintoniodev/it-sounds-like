# 06: Endurecer la puerta (gratis)

**What to build:** aplicar al flujo ya funcionante las prácticas del informe `auth-token-secreto` (rama `research/auth-token-secreto`): Turnstile delante del login (free: widgets y verificaciones de sobra), contador de intentos fallidos con lockout temporal en D1 (dentro del margen de rows: es una tabla de un puñado de filas), sesión tras el login con cookie `__Host-` HttpOnly + Secure + SameSite=Strict (el token se manda una vez, no en cada request), rotación con dos tokens válidos simultáneos durante la transición, y limpieza de logs: 401 siempre genérico, el token nunca aparece en logs ni respuestas. Para local, el secreto en `.dev.vars` ignorado por git.

**Blocked by:** 04

**Status:** done

- [x] el login está protegido por Turnstile (site key y secret como secrets/variables de Pages)
- [x] N intentos fallidos bloquean temporalmente el intento de login (contador en D1) y el bloqueo caduca solo
- [x] tras el login, el navegador usa la cookie `__Host-`; el token original no vuelve a viajar
- [x] rotación in situ: token viejo y nuevo válidos a la vez; retirar el viejo no desloguea al autor si ya usa el nuevo
- [x] grep del token en los logs del deploy y en respuestas de error: cero apariciones

## Comments

## Comments

**2026-08-25 (agente):** Hecho y verificado (local completo + producción en lo activable). Login: `POST /api/captura/login` manda el token UNA vez; la respuesta carga la cookie `__Host-sesion` (HttpOnly, Secure, SameSite=Strict, 12 h) firmada con HMAC del propio secret y los endpoints aceptan cookie o Bearer. Turnstile: el sitekey público llega por GET del login y el widget se pinta solo si existe; el secret (`TURNSTILE_SECRET` de Pages) se verifica contra siteverify. Verificado en local con las claves oficiales de prueba (siempre pasan): widget presente, login sin reto → 400, con reto → 200 + cookie, y GET/POST con cookie sola. **Activación en producción pendiente del humano**: crear el widget en el dashboard de Cloudflare (gratis, verificaciones ilimitadas) y subir `TURNSTILE_SITE`/`TURNSTILE_SECRET` como var/secret de Pages — sin ellos, el login es token + lockout. Lockout: 5 fallos en 10 min por IP (`intentos_login` en D1, sin escribir cuando ya está bloqueada, purga diaria del cron) — verificado en local Y producción (5×401 → 429, ni el token bueno entra, y el acierto limpia el contador). Rotación: cookies firmadas con el anterior siguen válidas tras rotar (test), igual que el Bearer de siempre. Logs: cero apariciones del token en logs del server local y respuestas; 401 único y genérico.
