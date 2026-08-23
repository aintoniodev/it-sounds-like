// Harness del ticket 09: qué se embedea y con qué peso.
// Estrategias:
//   A      texto completo con prepend "titulo — artista" (contextual chunk header)
//   A0     texto completo sin prepend (control para validar el prepend)
//   B(w)   embedding por sección, score ponderado y renormalizado sobre las presentes
// Modelo: multilingual-e5-small (prefijos query:/passage:), cosine = dot por vectores normalizados.
import { pipeline } from "@huggingface/transformers";
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { suite } from "./suite.mjs";

const CATALOGO = join(import.meta.dirname, "..", "catalogo");
const TOP = 3;

function parseFicha(slug, raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  if (m) {
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([a-z_ñ]+):\s*(.*)$/);
      if (kv && kv[2] !== '""') meta[kv[1]] = kv[2].replace(/^"|"$/g, "").trim();
    }
  }
  const body = (m ? m[2] : raw).trim();
  return { slug, meta, body };
}

// divide el cuerpo en texto introductorio + secciones "## Título"
function splitSections(body) {
  const secs = {};
  let intro = [];
  for (const block of body.split(/(?=^##\s)/m)) {
    const h = block.match(/^##\s+(.+)$/m);
    if (h) secs[h[1].trim().toLowerCase()] = block.replace(/^##\s+.*$/m, "").trim();
    else if (block.trim()) intro.push(block.trim());
  }
  return { intro: intro.join("\n").trim(), secs };
}

const fichas = readdirSync(CATALOGO)
  .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
  .map((f) => parseFicha(basename(f, ".md"), readFileSync(join(CATALOGO, f), "utf8")));

console.log(`fichas: ${fichas.length}, consultas: ${suite.length}\n`);

let extractor;
try {
  extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-small", { dtype: "q8" });
} catch {
  extractor = await pipeline("feature-extraction", "Xenova/multilingual-e5-small", { quantized: true });
}

async function embed(texts) {
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  return out.tolist();
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// ---- prepara los textos por estrategia ----
const SEC_KEYS = ["por qué esta canción", "para cuándo", "escucha"];
const textosA = fichas.map((f) => `passage: ${f.meta.titulo} — ${f.meta.artista}\n${f.body}`);
const textosA0 = fichas.map((f) => `passage: ${f.body}`);
const bloques = fichas.map((f) => splitSections(f.body)); // intro + secs por ficha

const pesos = {
  "B igual (1/3)": { "por qué esta canción": 1 / 3, "para cuándo": 1 / 3, escucha: 1 / 3, _intro: 1 / 3 },
  "B emocional (.5/.35/.15)": { "por qué esta canción": 0.5, "para cuándo": 0.35, escucha: 0.15, _intro: 0.5 },
  "B práctico (.4/.4/.2)": { "por qué esta canción": 0.4, "para cuándo": 0.4, escucha: 0.2, _intro: 0.4 },
  "B sin escucha (.6/.4/0)": { "por qué esta canción": 0.6, "para cuándo": 0.4, escucha: 0, _intro: 0.6 },
};

const embA = await embed(textosA);
const embA0 = await embed(textosA0);
// embeddings por sección: clave "slug::seccion"
const secTexts = [];
for (let i = 0; i < fichas.length; i++) {
  const { intro, secs } = bloques[i];
  if (intro) secTexts.push([`${fichas[i].slug}::_intro`, `passage: ${intro}`]);
  for (const k of SEC_KEYS) if (secs[k]) secTexts.push([`${fichas[i].slug}::${k}`, `passage: ${secs[k]}`]);
}
const secEmb = new Map();
const secVecs = await embed(secTexts.map(([, t]) => t));
secTexts.forEach(([key], i) => secEmb.set(key, secVecs[i]));

const queries = await embed(suite.map((s) => `query: ${s.q}`));

// ---- scoring ----
function topA(emb) {
  return suite.map((s, qi) => {
    const scores = emb.map((v) => dot(v, queries[qi]));
    return scores
      .map((sc, i) => [fichas[i].slug, sc])
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP)
      .map(([slug]) => slug);
  });
}
function topB(w) {
  return suite.map((s, qi) => {
    const scores = fichas.map((f, fi) => {
      const parts = [];
      if (bloques[fi].intro) parts.push(["_intro", secEmb.get(`${f.slug}::_intro`)]);
      for (const k of SEC_KEYS) if (bloques[fi].secs[k]) parts.push([k, secEmb.get(`${f.slug}::${k}`)]);
      if (!parts.length) return -1;
      const totalW = parts.reduce((s2, [k]) => s2 + w[k], 0) || 1;
      return parts.reduce((s2, [k, v]) => s2 + (w[k] / totalW) * dot(v, queries[qi]), 0);
    });
    return scores
      .map((sc, i) => [fichas[i].slug, sc])
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP)
      .map(([slug]) => slug);
  });
}

function recall(results) {
  let total = 0;
  suite.forEach((s, qi) => {
    const hits = s.expected.filter((e) => results[qi].includes(e)).length;
    total += hits / s.expected.length;
  });
  return total / suite.length;
}

const estrategias = {
  "A completo + prepend": topA(embA),
  "A0 completo sin prepend": topA(embA0),
};
for (const [name, w] of Object.entries(pesos)) estrategias[name] = topB(w);

console.log("recall@3 por estrategia:");
for (const [name, res] of Object.entries(estrategias))
  console.log(`  ${name.padEnd(28)} ${recall(res).toFixed(3)}`);

// detalle del ganador + las dos consultas que prueban el prepend
const ganador = Object.entries(estrategias).sort((a, b) => recall(b[1]) - recall(a[1]))[0];
console.log(`\nganador: ${ganador[0]} — detalle por consulta (✓ = esperado en top3):`);
suite.forEach((s, qi) => {
  const top = ganador[1][qi];
  const hits = s.expected.filter((e) => top.includes(e));
  console.log(`  ${hits.length ? "✓" : "✗"} ${s.q}`);
  console.log(`      top3: ${top.join(" | ")}`);
});
console.log("\nprepend (consulta por artista):");
for (const name of ["A completo + prepend", "A0 completo sin prepend"])
  console.log(`  ${name}: ${estrategias[name][18].join(" | ")}`);
