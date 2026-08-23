// Portadas resueltas al indexar y cacheadas en disco, servidas en local:
// la búsqueda no toca la red. Con link de Spotify → oEmbed (título y
// portada, sin key); sin link (o link roto) → iTunes Search con titulo+
// artista. Los fallos no se cachean: la próxima pasada reintenta.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ITUNES = "https://itunes.apple.com/search";

export function crearPortadas({ dir, fetcher = fetch }) {
  mkdirSync(dir, { recursive: true });
  const indice = join(dir, "indice.json");
  const cache = existsSync(indice) ? JSON.parse(readFileSync(indice, "utf8")) : {};

  const claveDe = (ficha) => {
    if (ficha.spotify) return `spotify:${String(ficha.spotify).split(/[?#]/)[0]}`;
    return `itunes:${ficha.titulo} ${ficha.artista}`;
  };

  async function urlDePortada(ficha) {
    if (ficha.spotify) {
      try {
        const r = await fetcher(`https://open.spotify.com/oembed?url=${encodeURIComponent(ficha.spotify)}`);
        const url = (await r.json()).thumbnail_url;
        if (url) return url;
      } catch {
        // link roto o privado: cae a iTunes
      }
    }
    const term = encodeURIComponent(`${ficha.titulo} ${ficha.artista}`);
    const r = await fetcher(`${ITUNES}?term=${term}&entity=song&limit=1&country=ES`);
    const art = (await r.json()).results?.[0]?.artworkUrl100;
    return art ? art.replace("100x100", "600x600") : null;
  }

  async function resolver(ficha) {
    const clave = claveDe(ficha);
    if (cache[clave] && existsSync(join(dir, cache[clave]))) {
      return { cover: `/portadas/${cache[clave]}`, deRed: false };
    }
    let url;
    try {
      url = await urlDePortada(ficha);
      if (!url) return { cover: null, deRed: true };
      const ext = /\.(png|webp)/.test(url) ? url.match(/\.(png|webp)$/)[1] : "jpg";
      const bytes = Buffer.from(await (await fetcher(url)).arrayBuffer());
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
