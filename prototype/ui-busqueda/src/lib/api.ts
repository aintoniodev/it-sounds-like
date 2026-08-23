// Capa de datos compartida por las variantes: índice precalculado,
// embedding de la query en el navegador (e5-small) y ranking con filtros
// por dimensión. Lógica compartida, no layout: cada variant dibuja lo suyo.
export interface Ficha {
  slug: string;
  titulo: string;
  artista: string;
  fecha: string;
  spotify: string | null;
  body: string;
  dims: Record<string, string | number>;
  cover: string | null;
  vector: number[];
}

export interface Filtros {
  // dimensión numérica → valor máximo admitido
  max: Record<string, number>;
  // dimensión categórica → conjunto de valores admitidos
  en: Record<string, string[]>;
}

export interface Resultado {
  ficha: Ficha;
  score: number;
}

export async function loadIndex(): Promise<Ficha[]> {
  const r = await fetch("index.json");
  if (!r.ok) throw new Error(`no puedo leer el índice: genera index.json con eval/build-index.mjs (${r.status})`);
  return r.json();
}

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

let extractorPromise: Promise<(q: string) => Promise<number[]>> | null = null;
export function getExtractor(onEstado: (s: string) => void) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      onEstado("cargando el modelo (unos 120 MB la primera vez)…");
      let pipe;
      try {
        pipe = await pipeline("feature-extraction", "Xenova/multilingual-e5-small", { dtype: "q8" });
      } catch {
        pipe = await pipeline("feature-extraction", "Xenova/multilingual-e5-small");
      }
      return async (q: string) => {
        const out = await pipe(`query: ${q}`, { pooling: "mean", normalize: true });
        return Array.from(out.data as Float32Array);
      };
    })();
  }
  return extractorPromise;
}

export function pasa(f: Ficha, filtros: Filtros): boolean {
  for (const [k, v] of Object.entries(f.dims)) {
    if (typeof v === "number" && filtros.max[k] !== undefined && v > filtros.max[k]) return false;
    if (typeof v === "string" && filtros.en[k]?.length && !filtros.en[k].includes(v)) return false;
  }
  return true;
}

export function rank(index: Ficha[], qvec: number[], filtros: Filtros, top = 3): Resultado[] {
  return index
    .filter((f) => pasa(f, filtros))
    .map((f) => ({ ficha: f, score: dot(f.vector, qvec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}

export interface DimInfo {
  numericas: { key: string; min: number; max: number }[];
  categoricas: { key: string; valores: string[] }[];
}

export function dimensiones(index: Ficha[]): DimInfo {
  const nums = new Map<string, { min: number; max: number }>();
  const cats = new Map<string, Set<string>>();
  for (const f of index) {
    for (const [k, v] of Object.entries(f.dims)) {
      if (typeof v === "number") {
        const info = nums.get(k) ?? { min: v, max: v };
        nums.set(k, { min: Math.min(info.min, v), max: Math.max(info.max, v) });
      } else if (typeof v === "string") {
        (cats.get(k) ?? cats.set(k, new Set()).get(k)!).add(v);
      }
    }
  }
  return {
    numericas: [...nums.entries()].map(([key, v]) => ({ key, ...v })),
    categoricas: [...cats.entries()]
      .filter(([, vs]) => vs.size > 1 && vs.size <= 6)
      .map(([key, vs]) => ({ key, valores: [...vs] })),
  };
}

// divide el cuerpo en secciones {"por qué": "..."} para pintarlas como toque final
export function secciones(body: string): Record<string, string> {
  const secs: Record<string, string> = {};
  for (const block of body.split(/(?=^##\s)/m)) {
    const h = block.match(/^##\s+(.+)$/m);
    if (h) secs[h[1].trim().toLowerCase().replace(/^por qué esta canción$/, "por qué")] = block.replace(/^##\s+.*$/m, "").trim();
    else if (block.trim() && !secs["intro"]) secs["intro"] = block.trim();
  }
  return secs;
}
