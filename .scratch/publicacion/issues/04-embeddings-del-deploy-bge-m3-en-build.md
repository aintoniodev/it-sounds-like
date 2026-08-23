# Embeddings del deploy: bge-m3 en build

Type: research
Status: resolved
Labels: wayfinder:research

## Question

La v1 mide y usa e5-small EN EL NAVEGADOR; el sitio público embedea la query en el edge con bge-m3 (Workers AI). Fichas y query tienen que vivir en el MISMO espacio vectorial. Verificar con fuentes primarias: (a) la API de embeddings de Workers AI para bge-m3 — nombre exacto del modelo, dimensiones, batching, formato de entrada, determinismo entre llamadas/versiones; (b) cómo generar los embeddings de las fichas en build para que sean idénticos a los del edge: ¿llamar a Workers AI desde el CI en el build, o generarlos en local con bge-m3 (Ollama) y confiar en que coinciden?; (c) re-ejecutar la suite de `eval/` (19 consultas) con bge-m3 para confirmar que el recall no baja del suelo de e5-small (0.754). Entregar recomendación no vinculante del pipeline de build.

## Answer

Informe completo con fuentes: rama `research/embeddings-deploy` → `docs/research/embeddings-deploy.md`.

| Punto | Verificado |
|---|---|
| API | `@cf/baai/bge-m3`, entrada `text` (string o array, batching síncrono), 1024 dims (ficha BAAI; CF no las publica), REST `/ai/run/...` y endpoint OpenAI-compatible `/v1/embeddings`; batch async `?queueRequest=true` (payload < 10 MB) |
| Prefijos | bge-m3 NO usa `query:`/`passage:` (al revés que e5) ni pooling mean: adaptar a CLS |
| Determinismo | Sin page de model versioning ni garantía documentada; precedente de actualización silenciosa (EmbeddingGemma 2025-09-18, "re-indexing recommended"); local: mismo texto en la misma sesión cos=1.000001 |
| Build | La identidad cross-runtime NO está garantizada (Ollama GGUF ≠ ONNX q8 ≠ serving CF) → generar fichas llamando a Workers AI desde el CI (~5 neurons/build), cache por hash + sonda de drift (probe cos < 0.999 ⇒ re-index) + assert dims |
| Eval (c) | Ollama no disponible (sin binario ni servicio) → ejecutada con Xenova/bge-m3 ONNX q8 vía transformers.js de `eval/`: **mejor 0.719 (A+prepend) vs suelo e5-small 0.754 (A0)** — NO supera el suelo en local; fallo notorio: "jazz sereno, referencia para mezclar". La estrategia ganadora cambia con el modelo |

Recomendación no vinculante: pipeline CI → Workers AI para el índice (nunca mezclar runtimes), query vía `env.AI.run` en el edge. La elección de modelo queda **abierta**: pasada definitiva pendiente contra Workers AI real (necesita ACCOUNT_ID + API token; procedimiento documentado en el informe, junto a la ruta Ollama). Trade-off si se confirma 0.719: algo de recall a cambio de 1024 dims multilingües, sparse/ColBERT futuro y cero descarga de modelo en el navegador.
