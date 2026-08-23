# Repo GitHub + CI + Cloudflare Pages

Type: task
Status: open
Labels: wayfinder:task
Blocked by: 04

## Question

El repo hoy es local. Montar el camino de publicación: repo remoto en GitHub, workflow de CI que construya el índice con el pipeline del ticket 04 y despliegue a Cloudflare Pages, cuenta/API token de Cloudflare en secrets. Los pasos de credenciales y dashboards son solo humanos: generar el wizard interactivo (Skill "wizard") que abra URLs, capture tokens y escriba secrets. Resolución: URL pública en *.pages.dev saliendo del main del repo. Además (derivado del ticket 04): con el token ya en secrets, ejecutar la pasada definitiva de la suite de `eval/` contra Workers AI real y registrar el recall — es el número que decide la elección de modelo público (suelo: 0.754).
