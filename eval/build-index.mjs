// Genera prototype/ui-busqueda/public/index.json: embeddings de las fichas
// (cuerpo completo, sin prepend, prefijo passage:) + metadatos + portadas
// best-effort desde iTunes Search. Ejecutar desde eval/: node build-index.mjs
import { pipeline } from "@huggingface/transformers";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";

const CATALOGO = join(import.meta.dirname, "..", "catalogo");
const OUT = join(import.meta.dirname, "..", "prototype", "ui-busqueda", "public", "index.json");
const NUCLEO = new Set(["titulo", "artista", "fecha", "spotify"]);

function parseFicha(slug, raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_ñ]+):\s*(.*)$/);
    if (kv && kv[2] !== '""') meta[kv[1]] = kv[2].replace(/^"|"$/g, "").replace(/\s*#.*$/, "").trim();
  }
  return { slug, meta, body: m[2].trim() };
}

const fichas = readdirSync(CATALOGO)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
  .map((f) => parseFicha(basename(f, ".md"), readFileSync(join(CATALOGO, f), "utf8")));

let extractor;
try {
  extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-small", { dtype: "q8" });
} catch {
  extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-small", { quantized: true });
}
const vecs = (await extractor(fichas.map((f) => `passage: ${f.body}`), { pooling: "mean", normalize: true })).tolist();

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function portada(titulo, artista) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(`${titulo} ${artista}`)}&entity=song&limit=1&country=ES`;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const art = j.results?.[0]?.artworkUrl100;
    return art ? art.replace("100x100", "600x600") : null;
  } catch {
    return null;
  }
}

mkdirSync(join(OUT, ".."), { recursive: true });
const entries = [];
for (let i = 0; i < fichas.length; i++) {
  const f = fichas[i];
  const dims = Object.fromEntries(Object.entries(f.meta).filter(([k, v]) => !NUCLEO.has(k) && v !== ""));
  entries.push({
    slug: f.slug,
    titulo: f.meta.titulo,
    artista: f.meta.artista,
    fecha: f.meta.fecha,
    spotify: f.meta.spotify || null,
    body: f.body,
    dims,
    cover: await portada(f.meta.titulo, f.meta.artista),
    vector: vecs[i],
  });
  console.log(`${f.meta.titulo} — portada: ${entries[i].cover ? "ok" : "sin portada"}`);
  if (i < fichas.length - 1) await esperar(3500);
}

writeFileSync(OUT, JSON.stringify(entries));
console.log(`\n${entries.length} fichas → ${OUT}`);
