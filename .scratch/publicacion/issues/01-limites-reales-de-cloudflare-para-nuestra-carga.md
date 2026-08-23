# Límites reales de Cloudflare para nuestra carga

Type: research
Status: resolved
Labels: wayfinder:research

## Question

Verificación con fuentes primarias (2026) de que el plan gratuito de Cloudflare aguanta el perfil de carga objetivo, con los números exactos: (a) Workers AI — cuánto cuesta en neurons una llamada de embedding de bge-m3, y cuántas queries/día cubren los 10.000 neurons/día gratuitos (perfil: 1.000 visitantes/día × ~3 queries); (b) Workers — 100k req/día: qué cuenta como request en nuestro flujo (¿una query = una llamada embed + una llamada feedback?); (c) KV vs D1 para guardar feedback — límites de escritura/lectura/almacenamiento del tier gratuito y cuál encaja mejor en "append por interacción"; (d) Pages — builds/minutos de CI gratuitos. Entregar la tabla de "perfil de carga → límite → margen" y una recomendación no vinculante.

## Answer

Informe completo con fuentes: rama `research/cf-limits` → `docs/research/cf-limits.md`.

| Flujo | Carga | Límite free | Uso |
|---|---|---|---|
| Embedding query (bge-m3, 1.075 neurons/M tok) | 3.000 queries/día ≈ 161 neurons/día | 10.000 neurons/día | 1,6 % (~62× margen) |
| Embeddings de fichas en build | ~5 neurons/build (23 fichas) | ídem | ruido |
| Requests de Functions | 6.000/día peor caso (assets estáticos gratis; subrequest a Workers AI/D1 no cuenta) | 100.000 req/día | 6 % |
| Feedback en KV | 300–3.000 writes/día | **1.000 writes/día** + 1 write/s por clave | 30 %… excede |
| Feedback en D1 | 300–3.000 rows/día | 100.000 rows written/día | 0,3–3 % |
| Builds de Pages | ~30/mes | 500 builds/mes (timeout 20 min) | 6 % |

Recomendación no vinculante: el free tier aguanta el perfil con margen holgado; el único límite rozable es **KV writes (1.000/día)**, así que feedback en **D1** (INSERT por interacción, 30× margen, y la agregación del re-ranker es SQL). Workers AI neurons son un no-límite al 1,6 % de uso; una query = una Function, un feedback = una Function (6 % del cupo peor caso); Pages sobra al ritmo de publicación.
