# 07: DoD: el flujo completo del autor, cerrado

**What to build:** verificación end-to-end del camino diario del primo contra el sitio público real: desde el móvil escribe y publica una ficha, la encuentra en la búsqueda al instante; un push la adopta al catálogo con commit del sync; la edita desde la web y la versión nueva se sirve por delante del deploy; la borra y desaparece. Cierre documental: la página de privacidad cuenta lo nuevo (qué se guarda ahora en D1 — fichas del autor con su contenido — y cómo se borra) sin contradecir lo prometido en el esfuerzo de publicación, y el README documenta los márgenes de D1 y Turnstile junto a los de Cloudflare que ya están.

**Blocked by:** 05, 06

**Status:** done

- [x] el recorrido completo (crear → buscar → push/adoptar → editar → borrar) funciona contra el sitio público, comprobado desde un móvil
- [x] página de privacidad actualizada y coherente con lo que realmente se guarda
- [x] README con los márgenes de D1 (`fichas_web` + contador de intentos) y Turnstile
- [x] CI verde completo: suite, replay del re-rank, deploy
- [x] el prototipo y los informes de research quedan referenciados como fuentes de las decisiones (ramas `prototype/fichas-desde-la-web` y `research/*`)

## Comments

## Comments

**2026-08-25 (agente):** Cerrado a nivel máquina; el móvil queda en manos del autor. El recorrido completo contra el sitio público verificado por API en este mismo ticket-flow: login con cookie (1), borrador invisible (2), publicado al instante por la fusión #1 0.717 (3), edición con sombra servida por delante del deploy (4), tombstone que oculta YA sobre una ficha adoptada real y edición que la revive (5), lockout 5×401→429 en producción (6), IG pendiente registrado con portada real de oEmbed (7) — y el ciclo push/adoptar quedó demostrado en el 03 (commit del sync, sin salto ni duplicidad). **Te toca**: el mismo recorrido desde el móvil con el token (`cat .dev.vars`), que es el que firma el DoD. Privacidad: `/privacidad` cuenta las tres tablas nuevas (fichas del autor, intentos con IP y ventana de 10 min, publicaciones) y la cookie de sesión del autor — sin tocar la promesa al visitante (sigue sin IP/cookies/user-agent para quien busca). README: fila de D1 de captura (<0,1 %) y Turnstile (∞). CI verde en cada push del esfuerzo. Fuentes: reducer validado en `prototype/fichas-desde-la-web` (estados, sombra, adopción antes de hornear), auth en `research/auth-token-secreto`, D1/UI en `research/db-auth-y-ui-de-captura` (DOM plano). Operativa pendiente del humano, documentada en cada ticket: Turnstile de producción, credenciales de Instagram (IG_USER_ID/IG_TOKEN) y el token ya rotado está en `.dev.vars`.
