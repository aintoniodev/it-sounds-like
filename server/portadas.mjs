// Portadas resueltas al indexar y cacheadas en disco, servidas en local:
// la búsqueda no toca la red. Con link de Spotify → oEmbed (título y
// portada, sin key); sin link (o link roto o placeholder) → iTunes Search
// con titulo+artista. La clave de caché refleja el camino que DE VERDAD
// resolvió: un link que no responde no puede colonizar la portada de otras
// canciones que compartan ese mismo link. Los fallos no se cachean: la
// próxima pasada reintenta.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ITUNES = "https://itunes.apple.com/search";
// timeout corto: sin red (o con una API caída) la indexación sigue su curso
const FUERA = { signal: AbortSignal.timeout(8000) };

export function crearPortadas({ dir, fetcher = fetch }) {
  mkdirSync(dir, { recursive: true });
  const indice = join(dir, "portadas.json");
  const cache = existsSync(indice) ? JSON.parse(readFileSync(indice, "utf8")) : {};

  async function resolver(ficha) {
    // candidatas de caché en orden de preferencia, SIN tocar la red: el
    // enlace si lo llevara, y siempre la de titulo+artista (que es donde
    // cae lo resuelto por iTunes cuando el enlace no responde)
    const candidatas = [];
    if (ficha.spotify) candidatas.push(`spotify:${String(ficha.spotify).split(/[?#]/)[0]}`);
    candidatas.push(`itunes:${ficha.titulo} ${ficha.artista}`);
    for (const clave of candidatas) {
      if (cache[clave] && existsSync(join(dir, cache[clave]))) {
        return { cover: `/portadas/${cache[clave]}`, deRed: false };
      }
    }

    let clave = null;
    let url = null;
    if (ficha.spotify) {
      try {
        const r = await fetcher(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(ficha.spotify)}`,
          FUERA,
        );
        const t = (await r.json()).thumbnail_url;
        if (t) {
          clave = `spotify:${String(ficha.spotify).split(/[?#]/)[0]}`;
          url = t;
        }
      } catch {
        // link roto, privado o placeholder: cae a iTunes con su propia clave
      }
    }
    if (!url) {
      const term = `${ficha.titulo} ${ficha.artista}`;
      try {
        const r = await fetcher(`${ITUNES}?term=${encodeURIComponent(term)}&entity=song&limit=1&country=ES`, FUERA);
        const art = (await r.json()).results?.[0]?.artworkUrl100;
        if (art) {
          clave = `itunes:${term}`;
          url = art.replace("100x100", "600x600");
        }
      } catch {
        // sin red o API caída: sin portada, la próxima pasada reintenta
      }
    }
    if (!url) return { cover: null, deRed: true };
    try {
      const ext = /\.(png|webp)/.test(url) ? url.match(/\.(png|webp)$/)[1] : "jpg";
      const bytes = Buffer.from(await (await fetcher(url, FUERA)).arrayBuffer());
      const archivo = `${createHash("sha1").update(clave).digest("hex").slice(0, 16)}.${ext}`;
      writeFileSync(join(dir, archivo), bytes);
      cache[clave] = archivo;
      writeFileSync(indice, JSON.stringify(cache));
      return { cover: `/portadas/${archivo}`, deRed: true };
    } catch {
      return { cover: null, deRed: true };
    }
  }

  return { resolver, dir };
}
