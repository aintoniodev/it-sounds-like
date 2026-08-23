# Embeddings del deploy: bge-m3 en build

Type: research
Status: open
Labels: wayfinder:research

## Question

La v1 mide y usa e5-small EN EL NAVEGADOR; el sitio público embedea la query en el edge con bge-m3 (Workers AI). Fichas y query tienen que vivir en el MISMO espacio vectorial. Verificar con fuentes primarias: (a) la API de embeddings de Workers AI para bge-m3 — nombre exacto del modelo, dimensiones, batching, formato de entrada, determinismo entre llamadas/versiones; (b) cómo generar los embeddings de las fichas en build para que sean idénticos a los del edge: ¿llamar a Workers AI desde el CI en el build, o generarlos en local con bge-m3 (Ollama) y confiar en que coinciden?; (c) re-ejecutar la suite de `eval/` (19 consultas) con bge-m3 para confirmar que el recall no baja del suelo de e5-small (0.754). Entregar recomendación no vinculante del pipeline de build.
