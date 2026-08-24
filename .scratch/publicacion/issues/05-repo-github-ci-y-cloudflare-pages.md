# Repo GitHub + CI + Cloudflare Pages

Type: task
Status: resolved
Labels: wayfinder:task
Blocked by: 04

## Question

El repo hoy es local. Montar el camino de publicación: repo remoto en GitHub, workflow de CI que construya el índice con el pipeline del ticket 04 y despliegue a Cloudflare Pages, cuenta/API token de Cloudflare en secrets. Los pasos de credenciales y dashboards son solo humanos: generar el wizard interactivo (Skill "wizard") que abra URLs, capture tokens y escriba secrets. Resolución: URL pública en *.pages.dev saliendo del main del repo. Además (derivado del ticket 04): con el token ya en secrets, ejecutar la pasada definitiva de la suite de `eval/` contra Workers AI real y registrar el recall — es el número que decide la elección de modelo público (suelo: 0.754).

## Answer

Hecho y verificado (2026-08-24), con el wizard `scripts/wizard-publicar.sh` para lo humano (token, Account ID) y CI para lo demás:

- **Repo**: github.com/aintoniodev/it-sounds-like, público (decisión del usuario tras auditar que no hay fuga: .env nunca commiteado, ni token ni Account ID en toda la historia; lo expuesto son fichas seed dummy y docs de proceso sin datos personales). Lo bloqueó primero la facturación de Actions de la cuenta (jobs privados ni arrancaban); el paso a público lo desbloqueó (Actions gratis e ilimitado).
- **CI**: `.github/workflows/deploy.yml` en cada push a main — npm ci reproducible (el lockfile de eval/ se perdió en la odisea del commit huérfano y hubo que regenerarlo), suite contra Workers AI, índice público y deploy a Pages.
- **Deploy verificado**: https://it-sounds-like.pages.dev (200), índice público con 23 fichas × 1024 dims servido desde el edge.
- **Pasada definitiva de la suite contra Workers AI (bge-m3 real): recall@3 = 0.737** contra el suelo de 0.754 de e5-small. Por debajo: la decisión de modelo público (aceptar por cliente ligero / híbrido / e5-small en cliente) queda para el DoD, como estaba previsto.
