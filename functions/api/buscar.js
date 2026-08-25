// POST /api/buscar — el edge de la web pública. Recibe {q, filtros, top},
// embedea la query con bge-m3 en el mismo runtime contra el que CI embebeó
// el índice, fusiona las fichas web publicadas (captura-web 02: guardadas
// con su vector en fichas_web, sin esperar al deploy), rankea todo junto por
// cosine y re-rankea con el feedback de D1 (shrinkage: ver functions/rank.mjs).
// La honesta se decide sobre el cosine puro — el boost del feedback puede
// subir el score, pero no disfraza un mal match.
import { rankear, rerankear, UMBRAL, MODELO } from "../rank.mjs";
import { entradaDeFila } from "../fichas-web.mjs";
import { cargarIndice } from "./indice.mjs";
import { leerCuerpo } from "./cuerpo.mjs";
import { RETENCION_MS } from "../feedback.mjs";

export async function onRequestPost(context) {
  const { request, env } = context;
  const { cuerpo, error } = await leerCuerpo(request);
  if (error) return error;
  const q = typeof cuerpo?.q === "string" ? cuerpo.q.trim() : "";
  if (!q) return new Response("falta la query", { status: 400 });

  const top = Math.min(10, Math.max(1, cuerpo.top ?? 3));
  const [{ data: qvecs }, indice, web, eventos] = await Promise.all([
    env.AI.run(MODELO, { text: [q] }),
    cargarIndice(request),
    cargarFichasWeb(env),
    cargarEventos(env),
  ]);

  const entradas = [...indice, ...web];
  const porCosine = rankear(entradas, qvecs[0], { filtros: cuerpo.filtros ?? {}, top: entradas.length });
  const honesto = porCosine.length > 0 && porCosine[0].score >= UMBRAL;
  const resultados = rerankear(porCosine, qvecs[0], eventos)
    .slice(0, top)
    .map(({ ficha, score }) => ({ ...ficha, score }));
  return Response.json({ resultados, umbral: UMBRAL, honesto });
}

// fichas web publicadas con su vector: la fusión del 02. Solo estado
// publicada y sin borrado pedido (los borradores esperan al autor); sin D1
// (o vacía, o caída) la búsqueda queda exactamente como hoy
async function cargarFichasWeb(env) {
  if (!env.DB) return [];
  try {
    const { results } = await env.DB.prepare(
      "SELECT slug, titulo, artista, fecha, spotify, claves, cuerpo, vector FROM fichas_web WHERE estado = 'publicada' AND borrado_pedido = 0 AND vector IS NOT NULL",
    ).all();
    return results.map(entradaDeFila);
  } catch {
    return [];
  }
}

// eventos de feedback de los últimos 90 días con su query embebida; sin D1
// (o con la base vacía) el re-ranking arranca en frío: cosine puro
async function cargarEventos(env) {
  if (!env.DB) return [];
  try {
    const corte = Date.now() - RETENCION_MS;
    const { results } = await env.DB.prepare(
      "SELECT ficha, accion, ts, qvec FROM feedback WHERE ts > ? AND qvec IS NOT NULL",
    )
      .bind(corte)
      .all();
    return results.map((r) => ({ ...r, qvec: JSON.parse(r.qvec) }));
  } catch {
    return [];
  }
}
