// El seam del producto: catálogo → índice → rank con filtros.
// Un embedding por ficha del cuerpo completo (prefijo passage:, sin prepend
// del núcleo — medido en eval/, recall@3 0.754); cosine = dot sobre
// vectores normalizados. La suite de eval/ corre contra este módulo.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { pipeline } from "@huggingface/transformers";
// el núcleo compartido (filtros, dimensiones, coseno) vive una sola vez en
// functions/rank.mjs: v1, edge y cliente consumen el mismo módulo (ticket 08)
import { coseno, pasaFiltros, calcularDimensiones } from "../functions/rank.mjs";

export { pasaFiltros, calcularDimensiones };

const NUCLEO = new Set(["titulo", "artista", "fecha", "spotify"]);
const MODELO = "Xenova/multilingual-e5-small";
// umbral de honestidad: por debajo, el catálogo no tiene nada fuerte para
// la consulta y la UI lo dice en vez de disfrazar un mal match. Calibrado
// con datos: las 19 consultas reales de la suite dan top-1 ≥ 0.834; las
// consultas fuera de tema (recetas, hola hola) quedan en 0.800–0.822.
export const UMBRAL = 0.83;

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

// el núcleo obligatorio de una ficha; lo validan el índice y la captura
export function nucleoCompleto(ficha) {
  return Boolean(ficha.titulo && ficha.artista && ficha.fecha);
}

function parseFicha(slug, raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const meta = {};
  if (m) {
    for (const line of m[1].split("\n")) {
      const kv = line.match(/^([A-Za-z_ñÑ][A-Za-z_ñÑ0-9]*):\s*(.*)$/);
      if (kv && kv[2] !== '""') {
        const v = kv[2].replace(/^"|"$/g, "").replace(/\s*#.*$/, "").trim();
        if (v !== "") meta[kv[1]] = /^-?\d+(?:[.,]\d+)?$/.test(v) ? Number(v.replace(",", ".")) : v;
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
  const rotas = fichas.filter((f) => !nucleoCompleto(f));
  if (rotas.length) {
    throw new Error(
      `fichas con el núcleo incompleto (titulo/artista/fecha): ${rotas.map((f) => f.slug).join(", ")}`,
    );
  }
  return fichas;
}

// los vectores e5 llegan normalizados (normalize: true), así que el coseno
// compartido es el mismo dot de antes — pero ya no depende de ese detalle

export async function crearServicio({ carpeta, embed }) {
  const embedBatch = embed ?? (await embedReal());
  const fichas = parseCatalogo(carpeta);
  const vecs = await embedBatch(fichas.map((f) => `passage: ${f.body}`));
  fichas.forEach((f, i) => (f.vector = vecs[i]));

  return {
    fichas,
    dimensiones: () => calcularDimensiones(fichas),

    // procesa UNA ficha del catálogo (alta, cambio o borrado) sin tocar
    // el resto del índice; el vector solo se recalcula si el cuerpo cambió
    async actualizar(ruta) {
      const nombre = basename(ruta);
      if (!nombre.endsWith(".md") || nombre.startsWith("_")) return { accion: "ignorada", slug: nombre };
      const slug = nombre.replace(/\.md$/, "");
      const i = fichas.findIndex((f) => f.slug === slug);
      if (!existsSync(ruta)) {
        if (i === -1) return { accion: "ignorada", slug };
        fichas.splice(i, 1);
        return { accion: "borrada", slug };
      }
      const nueva = parseFicha(slug, readFileSync(ruta, "utf8"));
      if (!nucleoCompleto(nueva)) {
        throw new Error(`ficha con el núcleo incompleto (titulo/artista/fecha): ${slug}`);
      }
      if (i !== -1 && fichas[i].body === nueva.body) {
        fichas[i] = { ...nueva, vector: fichas[i].vector };
        return { accion: "meta", slug };
      }
      nueva.vector = (await embedBatch([`passage: ${nueva.body}`]))[0];
      if (i === -1) fichas.push(nueva);
      else fichas[i] = nueva;
      return { accion: i === -1 ? "creada" : "re-embedeada", slug };
    },

    async buscar(consulta, { filtros = {}, top = 3 } = {}) {
      const qvec = (await embedBatch([`query: ${consulta}`]))[0];
      return fichas
        .filter((f) => pasaFiltros(f, filtros))
        .map((f) => ({ ficha: f, score: coseno(f.vector, qvec) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, top);
    },
  };
}
