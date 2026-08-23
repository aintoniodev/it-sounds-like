# Límites reales de Cloudflare para nuestra carga

Type: research
Status: open
Labels: wayfinder:research

## Question

Verificación con fuentes primarias (2026) de que el plan gratuito de Cloudflare aguanta el perfil de carga objetivo, con los números exactos: (a) Workers AI — cuánto cuesta en neurons una llamada de embedding de bge-m3, y cuántas queries/día cubren los 10.000 neurons/día gratuitos (perfil: 1.000 visitantes/día × ~3 queries); (b) Workers — 100k req/día: qué cuenta como request en nuestro flujo (¿una query = una llamada embed + una llamada feedback?); (c) KV vs D1 para guardar feedback — límites de escritura/lectura/almacenamiento del tier gratuito y cuál encaja mejor en "append por interacción"; (d) Pages — builds/minutos de CI gratuitos. Entregar la tabla de "perfil de carga → límite → margen" y una recomendación no vinculante.
