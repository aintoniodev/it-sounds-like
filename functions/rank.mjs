// El rank del sitio público: cosine sobre el índice embedeado en CI contra
// Workers AI (bge-m3, sin prefijos) con la query embedeada en el edge.
// Módulo puro (índice + vector → ranking): la suite lo prueba sin HTTP ni
// bindings. bge-m3 devuelve vectores normalizados, pero normalizamos por si
// acaso: cosine honesto, no dot a ciegas.

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
