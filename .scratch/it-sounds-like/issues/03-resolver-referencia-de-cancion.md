# Resolver referencia de canción sin fricción

Type: research
Status: resolved
Labels: wayfinder:research

## Question

Dado un link opcional de Spotify en la ficha: cómo obtener título, artista y (si procede) portada para la tarjeta de resultado SIN OAuth si es posible (oEmbed público, endpoints de metadata de embed), y qué fallback hay para fichas sin link (texto libre "artista – título": ¿normalización vía MusicBrainz u otra vía gratuita?). Para cada vía: qué requiere (key, coste), límites de rate, y compatibilidad con TypeScript. El link es siempre opcional — el producto no puede depender de él.

## Answer

Informe completo en rama `research/referencia-cancion` → `docs/research/referencia-cancion.md` (endpoints probados en vivo 2026-08-23 + fuentes primarias).

### Con link de Spotify — oEmbed, sin OAuth ni key

| Aspecto | Dato |
|---|---|
| Endpoint | `GET https://open.spotify.com/oembed?url=<link codificado>` |
| Auth / CORS | ninguna / `access-control-allow-origin: *` (usable desde Node o browser) |
| Campos | `title`, `thumbnail_url` (portada 300×300, CDN `image-cdn-fa.spotifycdn.com` sin firma de caducidad), `iframe_url` (embed) |
| Carencia | **no devuelve artista** → título+artista deben venir de la ficha (campos de plantilla) o del fallback |
| Rate limit | no publicado (Web API: rolling 30 s con 429+`Retry-After`; no aplica a oEmbed) |
| Errores | URL inválida → 504 feo; tratar no-2xx como "sin metadatos"; legacy `embed.spotify.com` = 308 |

Web API `/v1/tracks` daría artista, pero exige client credentials y desde nov-2024 los apps nuevos tienen endpoints restringidos → **no OAuth en v1**: nada del producto lo necesita.

### Fallback sin link — todas sin key (verificadas en vivo)

| Vía | Devuelve | Rate limit | Portada | TS |
|---|---|---|---|---|
| MusicBrainz Search | título, artist-credit, releases, score | **1 req/s**, User-Agent propio obligatorio | no → Cover Art Archive (thumbs 250/500/1200, sin auth) | `musicbrainz-api` 1.2.1 / fetch |
| iTunes Search | artista, título, álbum, `artworkUrl100`→600×600, preview 30 s | **~20 req/min** (doc Apple) | sí | fetch |
| Deezer | artista, título, álbum, cover 250px, preview 30 s | cuota por IP no publicada | sí | fetch |

### Recomendación (no vinculante)

1. Campos `título`+`artista` en la plantilla de ficha = tarjeta resuelta sin red; el link Spotify solo añade portada/embed vía oEmbed.
2. Fallback texto libre: iTunes Search como default (1 request lo da todo); MusicBrainz+CAA como vía de datos abiertos.
3. Resolver en **tiempo de indexado** y cachear junto a la ficha — el camino de búsqueda queda sin llamadas externas (local-first).

