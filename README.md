# it sounds like

Buscador local de canciones por descripción. El autor (un ingeniero de sonido) escribe una ficha al día —qué le hace sentir, para cuándo, qué escuchar— y cualquiera describe cómo quiere que le suene la música y recibe el top del catálogo con las palabras del autor. La misma ficha alimenta un caption listo para Instagram y, acumulada en quien busca, un soundprint: su firma sonora exportable como imagen.

Todo corre en local. Sin cuentas, sin red en búsqueda, la carpeta `catalogo/` es la única fuente de verdad.

## Arranque

```
npm install --ignore-scripts
npm start
```

`npm start` construye la web y arranca el servidor en `http://localhost:3000`. La primera indexación descarga el modelo de embeddings (~120 MB); las siguientes salen del caché.

- `--ignore-scripts` evita un falso fallo del check de instalación de `sharp` (dependencia de transformers.js) con Node moderno; el binario precompilado funciona sin ese script.
- `npm test` — suite del servicio de búsqueda (parser, watcher, portadas, caption).
- `npm run eval` — recall@3 de las 19 consultas de `eval/suite.mjs` contra el servicio real (suelo: 0.75).
- `npm run dev:web` — Vite en modo desarrollo con proxy al API (arranca el servidor aparte).

## Piezas

- `catalogo/` — fichas markdown, una por canción. Núcleo obligatorio (`titulo`, `artista`, `fecha`), claves inventables (dimensiones), cuerpo libre. `_plantilla.md` es la plantilla editable, el índice la ignora.
- `server/` — Node. `servicio.mjs` es el seam: catálogo → índice (multilingual-e5-small, cuerpo completo) → rank con filtros. `index.mjs` sirve la web, el API y vigila `catalogo/` (alta/edición/borrado en caliente). `portadas.mjs` resuelve portadas al indexar (oEmbed de Spotify, fallback iTunes) y las cachea: la búsqueda funciona sin red. `caption.mjs` renderiza el caption. `captura.mjs` valida y escribe fichas nuevas.
- `web/` — buscador Escenario (portadas 3D en sala oscura, panel lateral, filtros auto-descubiertos, sorpréndeme) y soundprint (tres capas, historial por navegador, export PNG). Departure Mono bundeada.
- `eval/` — la suite de calidad. `recall.mjs` corre contra el servicio real; el recall no puede bajar del suelo en ninguna refactorización.
- `tools/caption.mjs` — caption por CLI: `node tools/caption.mjs <slug>`.

## Decisiones

Las decisiones de producto viven en `.scratch/it-sounds-like/map.md` (mapa del esfuerzo) y `.scratch/it-sounds-like/spec.md` (spec v1). El vocabulario canónico, en `CONTEXT.md`.

La señal de Instagram del export del soundprint es la constante `ENLACE_IG` en `web/src/soundprint.ts`.
