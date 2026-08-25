// Construye el desplegable público: index.json con las fichas embedeadas
// contra Workers AI (runtime real de producción, sin prefijos bge-m3) para
// la función de /api/buscar, catalogo.json ligero (sin vectores) para el
// cliente, y el cliente fino construido con vite.
// Requiere CF_API_TOKEN y CF_ACCOUNT_ID. Sin portadas: las fichas aún no
// llevan cover resuelto.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { join, basename } from "node:path";
import { execSync } from "node:child_process";
import { embed } from "./embed.mjs";

const CATALOGO = join(import.meta.dirname, "..", "catalogo");
const OUT_DIR = join(import.meta.dirname, "..", "dist-public");
const NUCLEO = new Set(["titulo", "artista", "fecha", "spotify"]);

const fichas = readdirSync(CATALOGO)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
  .map((f) => {
    const raw = readFileSync(join(CATALOGO, f), "utf8");
    const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    const meta = {};
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([a-z_ñ]+):\s*(.*)$/);
      if (kv && kv[2] !== '""') meta[kv[1]] = kv[2].replace(/^"|"$/g, "").replace(/\s*#.*$/, "").trim();
    }
    return { slug: basename(f, ".md"), meta, body: m[2].trim() };
  });

const vecs = await embed(fichas.map((f) => f.body));

mkdirSync(OUT_DIR, { recursive: true });
const entries = fichas.map((f, i) => ({
  slug: f.slug,
  titulo: f.meta.titulo,
  artista: f.meta.artista,
  fecha: f.meta.fecha,
  spotify: f.meta.spotify || null,
  body: f.body,
  dims: Object.fromEntries(Object.entries(f.meta).filter(([k, v]) => !NUCLEO.has(k) && v !== "")),
  cover: null,
  vector: vecs[i],
}));

// portadas resueltas al hornear con el mismo camino que el local (server/
// portadas.mjs: oEmbed de Spotify, fallback iTunes) y servidas como assets
// estáticos del propio deploy. Sin red (o API caída) la ficha cae al
// fallback de texto del cliente y la próxima pasada reintenta
import { crearPortadas } from "../server/portadas.mjs";
const portadas = crearPortadas({ dir: join(OUT_DIR, "portadas") });
let deRed = 0;
for (const e of entries) {
  const r = await portadas.resolver(e);
  e.cover = r.cover;
  if (r.deRed) {
    deRed++;
    await new Promise((res) => setTimeout(res, 400)); // cortesía entre peticiones
  }
}
console.log(`portadas: ${entries.filter((e) => e.cover).length}/${entries.length} resueltas (${deRed} consultadas en red)`);

writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(entries));
// el cliente no necesita los vectores: el rank vive en el edge
const sinVector = ({ vector, ...f }) => f;
writeFileSync(join(OUT_DIR, "catalogo.json"), JSON.stringify(entries.map(sinVector)));

// las Pages Functions (el Worker de buscar) viven en /functions de la raíz:
// wrangler pages deploy las recoge de ahí, junto al wrangler.toml

// cliente fino: vite construye publico.html y privacidad.html en
// dist-public; publico se promueve a index.html (la entrada que sirve
// Pages) y privacidad queda como página propia
const WEB = join(import.meta.dirname, "..", "web");
execSync("npx vite build --config vite.public.config.ts", { cwd: WEB, stdio: "inherit" });
renameSync(join(OUT_DIR, "publico.html"), join(OUT_DIR, "index.html"));

console.log(`${entries.length} fichas → ${OUT_DIR}/index.json (+ catalogo.json, functions, cliente). dims: ${vecs[0].length}`);
