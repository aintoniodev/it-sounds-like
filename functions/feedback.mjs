// El contrato del feedback público: la tupla que viaja a D1 y sus reglas.
// Módulo puro — /api/feedback y el cron de purge lo comparten. La privacidad
// es estructural: solo estos campos existen, sin IP, cookies ni user-agent.
export const ACCIONES = new Set(["clavo", "no-encaja"]);
export const RETENCION_MS = 90 * 24 * 60 * 60 * 1000;
export const CAMPOS = ["query", "ficha", "accion", "ts", "rank_pre_boost", "visitante"];
// solo el rank es opcional: sorpréndeme no tiene puesto en el ranking
const OPCIONALES = ["rank_pre_boost"];

// devuelve el evento normalizado o null si viene mal formado: el Worker
// rechaza en seco (400) y nada tocioso llega a la base
export function validarEvento(cuerpo) {
  if (!cuerpo || typeof cuerpo !== "object") return null;
  if (CAMPOS.filter((c) => !OPCIONALES.includes(c)).some((c) => !(c in cuerpo))) return null;
  if (Object.keys(cuerpo).some((k) => !CAMPOS.includes(k))) return null;
  const { query, ficha, accion, ts, rank_pre_boost, visitante } = cuerpo;
  if (typeof query !== "string" || !query.trim() || query.length > 500) return null;
  if (typeof ficha !== "string" || !ficha.trim()) return null;
  if (!ACCIONES.has(accion)) return null;
  // ms epoch de verdad (≥ 2001 por el suelo de 1e12) con margen de un día
  // de desfase de reloj: fuera de rango no entra — un ts futuro esquivaría
  // el purge para siempre y uno en segundos se purgaría al instante
  if (!Number.isFinite(ts) || ts < 1e12 || ts > Date.now() + 24 * 60 * 60 * 1000) return null;
  if (rank_pre_boost !== undefined && !Number.isInteger(rank_pre_boost)) return null;
  if (typeof visitante !== "string" || !visitante.trim()) return null;
  return { query: query.trim(), ficha, accion, ts, rank_pre_boost, visitante };
}
