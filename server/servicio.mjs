// El seam del producto: catálogo → índice → rank con filtros.
// Un embedding por ficha del cuerpo completo (prefijo passage:, sin prepend
// del núcleo — medido en eval/, recall@3 0.754); cosine = dot sobre
// vectores normalizados. La suite de eval/ corre contra este módulo.
import { readdirSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { pipeline } from "@huggingface/transformers";

const NUCLEO = new Set(["titulo", "artista", "fecha", "spotify"]);
const MODELO = "Xenova/multilingual-e5-small";

// el embedder real: transformers.js en Node (q8); fallback a la versión
// cuantizada por defecto si el dtype no está disponible
async function embedReal() {
  let pipe;
  try {
    pipe = await pipeline("feature-extraction", MODELO, { dtype: "q8" });
  } catch {
    pipe = await pipeline("feature-extraction", MODELO);
  }
  return async (texts) => (await pipe(texts, { pooling: "mean", normalize: true })).tolist();
}

function parseFicha(slug, raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  if (m) {
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([a-z_ñ]+):\s*(.*)$/);
      if (kv && kv[2] !== '""') {
        const v = kv[2].replace(/^"|"$/g, "").replace(/\s*#.*$/, "").trim();
        if (v !== "") meta[kv[1]] = /^\d+(?:[.,]\d+)?$/.test(v) ? Number(v.replace(",", ".")) : v;
      }
    }
  }
  return {
    slug,
    titulo: meta.titulo,
    artista: meta.artista,
    fecha: meta.fecha,
    spotify: meta.spotify ?? null,
    body: (m ? m[2] : "").trim(),
    dims: Object.fromEntries(Object.entries(meta).filter(([k]) => !NUCLEO.has(k))),
  };
}

function parseCatalogo(carpeta) {
  const fichas = readdirSync(carpeta)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
    .map((f) => parseFicha(basename(f, ".md"), readFileSync(join(carpeta, f), "utf8")));
  const rotas = fichas.filter((f) => !f.titulo || !f.artista || !f.fecha);
  if (rotas.length) {
    throw new Error(
      `fichas con el núcleo incompleto (titulo/artista/fecha): ${rotas.map((f) => f.slug).join(", ")}`,
    );
  }
  return fichas;
}

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

function pasa(ficha, filtros) {
  for (const [k, v] of Object.entries(ficha.dims)) {
    if (typeof v === "number" && filtros.max?.[k] !== undefined && v > filtros.max[k]) return false;
    if (typeof v === "string" && filtros.en?.[k]?.length && !filtros.en[k].includes(v)) return false;
  }
  return true;
}

// dimensiones del catálogo: numéricas con su rango, categóricas con su
// vocabulario (solo las que sirven para filtrar: más de un valor, pocas opciones)
export function calcularDimensiones(fichas) {
  const nums = new Map();
  const cats = new Map();
  for (const f of fichas) {
    for (const [k, v] of Object.entries(f.dims)) {
      if (typeof v === "number") {
        const info = nums.get(k) ?? { min: v, max: v };
        nums.set(k, { min: Math.min(info.min, v), max: Math.max(info.max, v) });
      } else if (typeof v === "string") {
        (cats.get(k) ?? cats.set(k, new Set()).get(k)).add(v);
      }
    }
  }
  return {
    numericas: [...nums.entries()].map(([key, { min, max }]) => ({ key, min, max })),
    categoricas: [...cats.entries()]
      .filter(([, vs]) => vs.size > 1 && vs.size <= 6)
      .map(([key, vs]) => ({ key, valores: [...vs] })),
  };
}

export async function crearServicio({ carpeta, embed }) {
  const embedBatch = embed ?? (await embedReal());
  const fichas = parseCatalogo(carpeta);
  const vecs = await embedBatch(fichas.map((f) => `passage: ${f.body}`));
  fichas.forEach((f, i) => (f.vector = vecs[i]));

  return {
    fichas,
    dimensiones: () => calcularDimensiones(fichas),

    async buscar(consulta, { filtros = {}, top = 3 } = {}) {
      const qvec = (await embedBatch([`query: ${consulta}`]))[0];
      return fichas
        .filter((f) => pasa(f, filtros))
        .map((f) => ({ ficha: f, score: dot(f.vector, qvec) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, top);
    },
  };
}
