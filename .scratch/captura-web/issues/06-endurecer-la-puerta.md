# 06: Endurecer la puerta (gratis)

**What to build:** aplicar al flujo ya funcionante las prácticas del informe `auth-token-secreto` (rama `research/auth-token-secreto`): Turnstile delante del login (free: widgets y verificaciones de sobra), contador de intentos fallidos con lockout temporal en D1 (dentro del margen de rows: es una tabla de un puñado de filas), sesión tras el login con cookie `__Host-` HttpOnly + Secure + SameSite=Strict (el token se manda una vez, no en cada request), rotación con dos tokens válidos simultáneos durante la transición, y limpieza de logs: 401 siempre genérico, el token nunca aparece en logs ni respuestas. Para local, el secreto en `.dev.vars` ignorado por git.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] el login está protegido por Turnstile (site key y secret como secrets/variables de Pages)
- [ ] N intentos fallidos bloquean temporalmente el intento de login (contador en D1) y el bloqueo caduca solo
- [ ] tras el login, el navegador usa la cookie `__Host-`; el token original no vuelve a viajar
- [ ] rotación in situ: token viejo y nuevo válidos a la vez; retirar el viejo no desloguea al autor si ya usa el nuevo
- [ ] grep del token en los logs del deploy y en respuestas de error: cero apariciones

## Comments
