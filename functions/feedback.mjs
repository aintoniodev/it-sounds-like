// El contrato del feedback público: la tupla que viaja a D1 y sus reglas.
// Módulo puro — /api/feedback y el cron de purge lo comparten. La privacidad
// es estructural: solo estos campos existen, sin IP, cookies ni user-agent.
export const ACCIONES = new Set(["clavo", "no-encaja"]);
export const RETENCION_MS = 90 * 24 * 60 * 60 * 1000;

// devuelve el evento normalizado o null si viene mal formado: el Worker
// rechaza en seco (400) y nada tocioso llega a la base
export function validarEvento(cuerpo) {
  if (!cuerpo || typeof cuerpo !== "object") return null;
  const { query, ficha, accion, ts, rank_pre_boost, visitante } = cuerpo;
  const sobran = Object.keys(cuerpo).filter(
    (k) => !["query", "ficha", "accion", "ts", "rank_pre_boost", "visitante"].includes(k),
  );
  if (sobran.length) return null;
  if (typeof query !== "string" || !query.trim() || query.length > 500) return null;
  if (typeof ficha !== "string" || !ficha.trim()) return null;
  if (!ACCIONES.has(accion)) return null;
  if (!Number.isFinite(ts)) return null;
  if (rank_pre_boost !== undefined && !Number.isInteger(rank_pre_boost)) return null;
  if (typeof visitante !== "string" || !visitante.trim()) return null;
  return { query: query.trim(), ficha, accion, ts, rank_pre_boost, visitante };
}
