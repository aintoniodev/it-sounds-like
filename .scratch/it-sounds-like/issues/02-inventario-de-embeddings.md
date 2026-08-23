# Inventario de embeddings: modelos locales multilingües + APIs gratuitas

Type: research
Status: resolved
Labels: wayfinder:research

## Question

Inventario comparativo para que el AI Engineer elija: (a) modelos locales multilingües (sentence-transformers y alternativas) con calidad acreditada en textos cortos en español, tamaño, licencia y forma de uso desde TypeScript/Node; (b) APIs de embeddings con tier gratuito real: quién, límites del tier, dimensiones, multilingüe sí/no, latencia; y (c) cómo comparar con catálogo pequeño (cientos de fichas): cosine en memoria vs vector store. El usuario es AI Engineer: hechos, límites y trade-offs verificables con fuentes primarias — sin tutorial. Entregar tabla comparativa y una recomendación razonada pero no vinculante.

## Answer

Informe completo en rama `research/embeddings` → `docs/research/embeddings.md` (con fuentes primarias por claim).

### Locales (calidad ES = MTEB STS de las propias model cards)

| Modelo | Params / disco | Dims | Licencia | STS17 es-es | Uso desde Node |
|---|---|---|---|---|---|
| `multilingual-e5-small` | 118 M / 470 MB | 384 | MIT | 84,84 | transformers.js (puerto Xenova, 152k dl/mes); prefijos `query:` |
| `multilingual-e5-large` | 560 M / 2,24 GB | 1024 | MIT | 86,74 | transformers.js; prefijos `query:` |
| `bge-m3` | 568 M / 1,2 GB (Ollama) | 1024 | MIT | — (MIRACL 69,2) | Ollama `/api/embed` o transformers.js; **sin prefijos**, 8k tokens |
| `jina-embeddings-v3` | 572 M | 1024 | **CC-BY-NC** | **88,78** | solo Python sidecar (`trust_remote_code`, sin puerto ONNX) |
| `paraphrase-multilingual-MiniLM-L12-v2` | 118 M | 384 | Apache-2.0 | — | transformers.js; 128 tokens máx, generación antigua |

### APIs gratuitas

| Proveedor | Free tier exacto | Tipo | Dims / ES |
|---|---|---|---|
| Gemini (`gemini-embedding-001/-2`) | "no charge" en free tier; RPM/RPD dinámicos en AI Studio | **recurrente** | 3072 MRL / 100+ idiomas |
| Cloudflare (`@cf/baai/bge-m3`) | **10.000 neurons/día** (renovable) | **recurrente** | 1024 / multilingüe; endpoint OpenAI-compatible |
| Cohere (`embed-v4`) | trial: **1.000 llamadas/mes**, 2.000 inputs/min | mensual escaso | 1536 MRL / 100+ idiomas |
| Voyage (`voyage-4*`) | **200 M tokens one-time** (50 M multilingual-2) | one-time | 1024 MRL / multilingüe |
| Jina | 10 M tokens one-time, **solo no comercial** | one-time | 1024 |
| OpenAI | **sin free tier** ($0,02/1M small) | — | 1536/3072 |

### Búsqueda

Cientos de fichas × 1024 dims = 2 MB en `Float32Array`; cosine exhaustivo = sub-ms en Node. Vector store (vectra, sqlite-vec, usearch — todos vivos en 2026) solo tendría sentido desde ~10⁴–10⁵ vectores.

### Recomendación (no vinculante)

1. `multilingual-e5-small` vía transformers.js (en-proceso, MIT, mejor calidad/GB en ES) como default local.
2. Plan B calidad: `bge-m3` en Ollama; el mismo modelo sirve Cloudflare gratis (10k neurons/día) como respaldo API.
3. Cosine en memoria, sin vector store. Evitar jina-v3 (NC), MiniLM (antiguo), OpenAI (no hay free).
4. Eval casero query→ficha cuando exista el seed del catálogo, antes que pelear por MTEB.

