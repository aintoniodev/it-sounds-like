// POST /api/buscar — el edge de la web pública. Recibe {q, filtros, top},
// embedea la query con bge-m3 en el mismo runtime contra el que CI embebeó
// el índice, fusiona las fichas web publicadas (captura-web 02: guardadas
// con su vector en fichas_web, sin esperar al deploy), rankea todo junto por
// cosine y re-rankea con el feedback de D1 (shrinkage: ver functions/rank.mjs).
// La honesta se decide sobre el cosine puro — el boost del feedback puede
// subir el score, pero no disfraza un mal match.
import { rankear, rerankear, UMBRAL, MODELO } from "../rank.mjs";
import { entradaDeFila, fusionar } from "../fichas-web.mjs";
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

  const entradas = fusionar(indice, web.entradas, web.ocultos);
  const porCosine = rankear(entradas, qvecs[0], { filtros: cuerpo.filtros ?? {}, top: entradas.length });
  const honesto = porCosine.length > 0 && porCosine[0].score >= UMBRAL;
  const resultados = rerankear(porCosine, qvecs[0], eventos)
    .slice(0, top)
    .map(({ ficha, score }) => ({ ...ficha, score }));
  return Response.json({ resultados, umbral: UMBRAL, honesto });
}

// fichas web publicadas (ticket 02): las sin borrado pedido rankean junto al
// índice; las con borrado pedido ocultan su slug del índice hasta que el
// sync las retire del catálogo (05). Sin D1 (o vacía, o caída) la búsqueda
// queda exactamente como hoy
async function cargarFichasWeb(env) {
  if (!env.DB) return { entradas: [], ocultos: [] };
  try {
    const { results } = await env.DB.prepare(
      "SELECT slug, titulo, artista, fecha, spotify, claves, cuerpo, vector, borrado_pedido FROM fichas_web WHERE estado = 'publicada'",
    ).all();
    const entradas = [];
    const ocultos = [];
    for (const fila of results) {
      if (fila.borrado_pedido) ocultos.push(fila.slug);
      else if (fila.vector) entradas.push(entradaDeFila(fila));
    }
    return { entradas, ocultos };
  } catch {
    return { entradas: [], ocultos: [] };
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
