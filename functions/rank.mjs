// El rank del sitio público: cosine sobre el índice embedeado en CI contra
// Workers AI (bge-m3, sin prefijos) con la query embedeada en el edge.
// Módulo puro (índice + vector → ranking): la suite lo prueba sin HTTP ni
// bindings. bge-m3 devuelve vectores normalizados, pero normalizamos por si
// acaso: cosine honesto, no dot a ciegas.
import { RETENCION_MS } from "./feedback.mjs";

// el modelo del espacio compartido: el índice se embea en CI contra este
// runtime y la query en el edge — misma constante para /api/buscar y
// /api/feedback, una sola fuente.
export const MODELO = "@cf/baai/bge-m3";

// umbral de honestidad para el espacio de bge-m3: por debajo, el catálogo no
// tiene nada fuerte para la consulta y la UI lo dice en vez de disfrazar un
// mal match. Calibrado con el método de la v1 (eval/calibrar-umbral.mjs):
// las 19 consultas reales de la suite dan top-1 ≥ 0.434; las fuera de tema,
// ≤ 0.440. El margen se solapa en 0.006 — la suite es el contrato, así que
// el umbral se queda pegado al suelo real y "previsión del tiempo para
// mañana" (0.440) se cuela: intercambio documentado, no accidente.
export const UMBRAL = 0.43;

// un filtro exige la dimensión: filtrar por energia o momento_del_dia deja
// fuera a las fichas que no declaran esa clave (misma semántica que la v1)
export function pasaFiltros(ficha, filtros) {
  for (const [k, tope] of Object.entries(filtros?.max ?? {})) {
    const v = ficha.dims?.[k];
    if (typeof v !== "number" || v > tope) return false;
  }
  for (const [k, suelo] of Object.entries(filtros?.min ?? {})) {
    const v = ficha.dims?.[k];
    if (typeof v !== "number" || v < suelo) return false;
  }
  for (const [k, permitidos] of Object.entries(filtros?.en ?? {})) {
    const v = ficha.dims?.[k];
    if (typeof v !== "string" || !permitidos.includes(v)) return false;
  }
  return true;
}

export function coseno(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

// entries: las fichas del índice público con su vector; qvec: el embedding
// de la query en el mismo espacio. Devuelve {ficha sin vector, score}.
export function rankear(entries, qvec, { filtros = {}, top = 3 } = {}) {
  return entries
    .filter((f) => pasaFiltros(f, filtros))
    .map((e) => {
      const { vector, ...ficha } = e;
      return { ficha, score: coseno(vector, qvec) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, top);
}

// dimensiones del catálogo: numéricas con su rango, categóricas con su
// vocabulario (solo las que sirven para filtrar: más de un valor, pocas
// opciones). Un único hogar para server, edge y cliente (ticket 08).
export function calcularDimensiones(fichas) {
  const nums = new Map();
  const cats = new Map();
  for (const f of fichas) {
    for (const [k, v] of Object.entries(f.dims ?? {})) {
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

// ── re-ranking con shrinkage (ticket 05) ─────────────────────────────────
// El sitio aprende de lo que la gente marca, sin traicionar al cosine:
//
//   score = cosine + α · n/(n+K) · (S̄⁺ − γ·S̄⁻)
//
// S̄⁺ y S̄⁻ son medias (acotadas a [0,1]) de los pesos de los eventos de
// cada ficha; n/(n+K) es el shrinkage: con pocos eventos la señal apenas
// mueve y con muchos satura hacia α (nunca lo supera). El peso de cada
// evento es wᵢ = max(0, cos(query_actual, query_pasada)) · decay(90 días).
// La negativa entra ponderada por wᵢ² y γ>1 (β = α·γ > α): a contexto pleno
// (w=1) la penalización γ supera al positivo simétrico; a mitad de contexto
// pesa γ/4, y fuera del contexto (~0) no actúa. α = 0 apaga el aprendizaje
// entero y el ranking queda idéntico al cosine.
export const RERANK = Object.freeze({ alpha: 0.1, gamma: 2, K: 5 });

export function rerankear(entradas, qvec, eventos, { alpha = RERANK.alpha, gamma = RERANK.gamma, K = RERANK.K, ahora = Date.now() } = {}) {
  if (!eventos?.length || alpha === 0) return entradas;
  const signal = new Map(); // slug → { positivos: [w], negativos: [w²] }
  for (const e of eventos) {
    if (!Array.isArray(e?.qvec) || !e?.ficha) continue; // legados sin vector: fuera
    const sim = Math.max(0, coseno(qvec, e.qvec));
    if (sim === 0) continue; // otro contexto de query: ni positivo ni negativo
    const frescura = Math.max(0, 1 - (ahora - e.ts) / RETENCION_MS);
    if (frescura === 0) continue; // caducado (el cron de purge lo borrará)
    const w = sim * frescura;
    const s = signal.get(e.ficha) ?? { positivos: [], negativos: [] };
    if (e.accion === "no-encaja") s.negativos.push(w * w);
    else s.positivos.push(w);
    signal.set(e.ficha, s);
  }
  if (!signal.size) return entradas;
  const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return entradas
    .map((r) => {
      const s = signal.get(r.ficha.slug);
      if (!s) return r;
      const n = s.positivos.length + s.negativos.length;
      const ajuste = alpha * (n / (n + K)) * (media(s.positivos) - gamma * media(s.negativos));
      return { ...r, score: r.score + ajuste };
    })
    .sort((a, b) => b.score - a.score);
}
