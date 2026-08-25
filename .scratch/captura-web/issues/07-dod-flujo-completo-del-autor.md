# 07: DoD: el flujo completo del autor, cerrado

**What to build:** verificación end-to-end del camino diario del primo contra el sitio público real: desde el móvil escribe y publica una ficha, la encuentra en la búsqueda al instante; un push la adopta al catálogo con commit del sync; la edita desde la web y la versión nueva se sirve por delante del deploy; la borra y desaparece. Cierre documental: la página de privacidad cuenta lo nuevo (qué se guarda ahora en D1 — fichas del autor con su contenido — y cómo se borra) sin contradecir lo prometido en el esfuerzo de publicación, y el README documenta los márgenes de D1 y Turnstile junto a los de Cloudflare que ya están.

**Blocked by:** 05, 06

**Status:** ready-for-agent

- [ ] el recorrido completo (crear → buscar → push/adoptar → editar → borrar) funciona contra el sitio público, comprobado desde un móvil
- [ ] página de privacidad actualizada y coherente con lo que realmente se guarda
- [ ] README con los márgenes de D1 (`fichas_web` + contador de intentos) y Turnstile
- [ ] CI verde completo: suite, replay del re-rank, deploy
- [ ] el prototipo y los informes de research quedan referenciados como fuentes de las decisiones (ramas `prototype/fichas-desde-la-web` y `research/*`)

## Comments
