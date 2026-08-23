// Construye el desplegable público (placeholder del ticket 05): indice.json
// con las fichas embedeadas contra Workers AI (runtime real de producción,
// sin prefijos bge-m3) + una página mínima. El sitio de verdad llega con el
// ticket 06. Requiere CF_API_TOKEN y CF_ACCOUNT_ID. Sin portadas: aún no hay
// UI que las muestre.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

const CATALOGO = join(import.meta.dirname, "..", "catalogo");
const OUT_DIR = join(import.meta.dirname, "..", "dist-public");
const NUCLEO = new Set(["titulo", "artista", "fecha", "spotify"]);
const BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`;

async function embed(texts) {
  const r = await fetch(BASE, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CF_API_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ text: texts }),
  });
  const j = await r.json();
  if (!j.success) throw new Error(`Workers AI: ${JSON.stringify(j.errors)}`);
  return j.result.data;
}

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
writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(entries));

writeFileSync(
  join(OUT_DIR, "index.html"),
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>it sounds like</title><style>
body{margin:0;height:100vh;display:grid;place-items:center;background:#0d0b09;color:#efe9df;font-family:ui-monospace,"Departure Mono",monospace}
div{text-align:center}h1{font-weight:400;letter-spacing:.3em;text-transform:uppercase;font-size:20px}p{opacity:.55;font-size:14px}
</style></head><body><div><h1>it sounds like</h1><p>describe cómo quieres sentirte — próximamente</p></div></body></html>`,
);
console.log(`${entries.length} fichas → ${OUT_DIR}/index.json (+ placeholder). dims: ${vecs[0].length}`);
